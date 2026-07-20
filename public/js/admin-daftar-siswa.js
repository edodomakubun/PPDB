let allData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Admin Session)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Initial Data Load
    await loadData();

    // 3. Register Event Listeners
    document.getElementById('search-input').addEventListener('input', filterData);
    document.getElementById('school-filter').addEventListener('input', filterData);
    document.getElementById('status-filter').addEventListener('change', filterData);
    document.getElementById('date-filter').addEventListener('change', filterData);

    // Export Dropdown Click Handler
    const btnExport = document.getElementById('btn-export-dropdown');
    const menuExport = document.getElementById('export-dropdown-menu');
    const chevronExport = document.getElementById('icon-export-chevron');

    if (btnExport && menuExport) {
        btnExport.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menuExport.classList.contains('hidden');
            if (isHidden) {
                menuExport.classList.remove('hidden');
                setTimeout(() => {
                    menuExport.classList.remove('scale-95', 'opacity-0');
                    menuExport.classList.add('scale-100', 'opacity-100');
                }, 10);
                if (chevronExport) chevronExport.classList.add('rotate-180');
            } else {
                menuExport.classList.remove('scale-100', 'opacity-100');
                menuExport.classList.add('scale-95', 'opacity-0');
                if (chevronExport) chevronExport.classList.remove('rotate-180');
                setTimeout(() => {
                    menuExport.classList.add('hidden');
                }, 200);
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!menuExport.classList.contains('hidden') && !btnExport.contains(e.target) && !menuExport.contains(e.target)) {
                menuExport.classList.remove('scale-100', 'opacity-100');
                menuExport.classList.add('scale-95', 'opacity-0');
                if (chevronExport) chevronExport.classList.remove('rotate-180');
                setTimeout(() => {
                    menuExport.classList.add('hidden');
                }, 200);
            }
        });
    }
});

async function loadData() {
    const tbody = document.getElementById('table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Memuat data...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data;

        // Render Table
        renderTable(allData);

    } catch (error) {
        console.error(error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Gagal memuat data.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const countEl = document.getElementById('data-count');
    if (countEl) countEl.innerText = `Total: ${data.length} Pendaftar`;

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
                    <button onclick="deleteData('${item.id}')" class="text-red-600 hover:text-red-900 cursor-pointer">Hapus</button>
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

            await logActivity('DELETE_STUDENT', `Menghapus data siswa: ${item.nama_lengkap} (NIK: ${item.nik})`);

            Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');

            // Reload data to update table
            loadData();

        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// --- Export Functions ---
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

async function exportToJSON() {
    try {
        Swal.fire({ title: 'Menyiapkan Backup...', didOpen: () => Swal.showLoading() });

        // Fetch All Data Tables
        const [pendaftaran, settings, fields, logs, announcements] = await Promise.all([
            supabaseClient.from('pendaftaran').select('*'),
            supabaseClient.from('app_settings').select('*'),
            supabaseClient.from('form_fields').select('*'),
            supabaseClient.from('audit_logs').select('*'),
            supabaseClient.from('announcements').select('*')
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            pendaftaran: pendaftaran.data || [],
            app_settings: settings.data || [],
            form_fields: fields.data || [],
            audit_logs: logs.data || [],
            announcements: announcements.data || []
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_PPDB_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire('Berhasil!', 'Backup data JSON berhasil diunduh.', 'success');

    } catch (error) {
        console.error('Backup failed:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyiapkan backup.', 'error');
    }
}
