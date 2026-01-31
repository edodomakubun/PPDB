let allData = [];
let statusChart = null;
let genderChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Display User Email
    document.getElementById('user-email').innerText = session.user.email;

    // Logout Handler
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    // Initial Data Load
    await loadData();
    await loadSettings();

    // Event Listeners
    document.getElementById('search-input').addEventListener('input', filterData);
    document.getElementById('school-filter').addEventListener('input', filterData);
    document.getElementById('status-filter').addEventListener('change', filterData);
    document.getElementById('date-filter').addEventListener('change', filterData);

    // Toggle Registration
    document.getElementById('toggle-registration').addEventListener('change', toggleRegistrationStatus);
});

async function loadData() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Memuat data...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data;

        // Update Stats & Charts
        updateStatistics(allData);

        // Render Table
        renderTable(allData);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Gagal memuat data.</td></tr>';
    }
}

function updateStatistics(data) {
    // 1. Cards
    const total = data.length;
    const accepted = data.filter(d => d.status === 'Diterima').length;
    const rejected = data.filter(d => d.status === 'Ditolak').length;
    const pending = data.filter(d => d.status === 'Menunggu Verifikasi').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-accepted').innerText = accepted;
    document.getElementById('stat-rejected').innerText = rejected;
    document.getElementById('stat-pending').innerText = pending;

    // 2. Charts
    renderCharts(accepted, rejected, pending, data);
}

function renderCharts(accepted, rejected, pending, data) {
    // Pie Chart: Status
    const ctxStatus = document.getElementById('statusChart').getContext('2d');

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Diterima', 'Ditolak', 'Menunggu'],
            datasets: [{
                data: [accepted, rejected, pending],
                backgroundColor: ['#16a34a', '#dc2626', '#ca8a04'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Bar Chart: Gender
    const male = data.filter(d => d.jenis_kelamin === 'Laki-laki').length;
    const female = data.filter(d => d.jenis_kelamin === 'Perempuan').length;

    const ctxGender = document.getElementById('genderChart').getContext('2d');

    if (genderChart) genderChart.destroy();

    genderChart = new Chart(ctxGender, {
        type: 'bar',
        data: {
            labels: ['Laki-laki', 'Perempuan'],
            datasets: [{
                label: 'Jumlah Siswa',
                data: [male, female],
                backgroundColor: ['#3b82f6', '#ec4899'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    document.getElementById('data-count').innerText = `Total: ${data.length} Pendaftar`;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Tidak ada data yang cocok.</td></tr>';
        return;
    }

    data.forEach((item) => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        let statusClass = 'bg-slate-100 text-slate-800';
        if (item.status === 'Diterima') statusClass = 'bg-green-100 text-green-800';
        else if (item.status === 'Ditolak') statusClass = 'bg-red-100 text-red-800';
        else if (item.status === 'Menunggu Verifikasi') statusClass = 'bg-yellow-100 text-yellow-800';

        const row = `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${item.nama_lengkap}</div>
                    <div class="text-sm text-slate-500">NIK: ${item.nik}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-900">${item.nama_ayah} / ${item.nama_ibu}</div>
                    <div class="text-sm text-slate-500">${item.no_hp}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${item.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="detail-siswa.html?id=${item.id}" class="text-blue-600 hover:text-blue-900 mr-3">Detail/Edit</a>
                    <button onclick="deleteData('${item.id}')" class="text-red-600 hover:text-red-900">Hapus</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function filterData() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const school = document.getElementById('school-filter').value.toLowerCase();
    const status = document.getElementById('status-filter').value;
    const dateInput = document.getElementById('date-filter').value;

    const filtered = allData.filter(item => {
        const matchSearch = item.nama_lengkap.toLowerCase().includes(search) || item.nik.includes(search);
        const matchSchool = !school || (item.asal_sekolah && item.asal_sekolah.toLowerCase().includes(school));
        const matchStatus = status === 'all' || item.status === status;

        let matchDate = true;
        if (dateInput) {
            const itemDate = new Date(item.created_at).toISOString().split('T')[0];
            matchDate = itemDate === dateInput;
        }

        return matchSearch && matchSchool && matchStatus && matchDate;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('school-filter').value = '';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('date-filter').value = '';
    renderTable(allData);
}

// --- Settings Logic (Open/Close) ---
async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (data) {
            const isOpen = data.value === 'open';
            const toggle = document.getElementById('toggle-registration');
            const label = document.getElementById('status-label');

            toggle.checked = isOpen;
            updateStatusLabel(isOpen);
        }
    } catch (err) {
        console.warn('Error loading settings:', err);
    }
}

async function toggleRegistrationStatus(e) {
    const isOpen = e.target.checked;
    updateStatusLabel(isOpen);

    try {
        const { error } = await supabaseClient
            .from('app_settings')
            .upsert({
                key: 'registration_status',
                value: isOpen ? 'open' : 'closed'
            });

        if (error) throw error;

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        Toast.fire({
            icon: 'success',
            title: `Pendaftaran berhasil ${isOpen ? 'DIBUKA' : 'DITUTUP'}`
        });

    } catch (err) {
        console.error('Error updating status:', err);
        Swal.fire('Error', 'Gagal menyimpan pengaturan.', 'error');
        // Revert toggle
        e.target.checked = !isOpen;
        updateStatusLabel(!isOpen);
    }
}

function updateStatusLabel(isOpen) {
    const label = document.getElementById('status-label');
    if (isOpen) {
        label.innerText = 'Buka';
        label.classList.remove('text-red-600');
        label.classList.add('text-green-600');
    } else {
        label.innerText = 'Tutup';
        label.classList.remove('text-green-600');
        label.classList.add('text-red-600');
    }
}

// --- Existing Delete Logic ---
async function deleteData(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() });

            // Delete Files
            const filesToDelete = [item.foto_url, item.kk_url, item.akte_url].filter(Boolean);
            if (filesToDelete.length > 0) {
                await supabaseClient.storage.from('berkas_siswa').remove(filesToDelete);
            }

            // Delete Record
            const { error } = await supabaseClient.from('pendaftaran').delete().eq('id', id);
            if (error) throw error;

            Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');

            // Reload data to update tables and charts
            loadData();

        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// --- Export Functions (Same as before) ---
function exportToExcel() {
    if (!allData || allData.length === 0) return Swal.fire('Info', 'Data kosong.', 'info');

    const dataForExcel = allData.map(item => ({
        'Tanggal': new Date(item.created_at).toLocaleDateString('id-ID'),
        'NIK': item.nik,
        'Nama': item.nama_lengkap,
        'TTL': `${item.tempat_lahir}, ${item.tanggal_lahir}`,
        'JK': item.jenis_kelamin,
        'Sekolah Asal': item.asal_sekolah || '-',
        'Orang Tua': `${item.nama_ayah} / ${item.nama_ibu}`,
        'No HP': item.no_hp,
        'Status': item.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendaftar");
    XLSX.writeFile(wb, `Laporan_PPDB_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
    if (!allData || allData.length === 0) return Swal.fire('Info', 'Data kosong.', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(16);
    doc.text('Laporan Data Pendaftar Siswa Baru', 14, 15);
    doc.setFontSize(10);
    doc.text(`SD INPRES LELINGLUAN - ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    const tableRows = allData.map((item, i) => [
        i + 1,
        item.nik,
        item.nama_lengkap,
        item.jenis_kelamin,
        item.asal_sekolah || '-',
        item.status
    ]);

    doc.autoTable({
        head: [["No", "NIK", "Nama Siswa", "JK", "Sekolah Asal", "Status"]],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Laporan_PPDB_${new Date().toISOString().split('T')[0]}.pdf`);
}
