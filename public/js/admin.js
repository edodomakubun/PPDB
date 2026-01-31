let allData = [];
let isEditMode = false;
let currentId = null;

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
    loadData();

    // Filter Handlers
    document.getElementById('search-input').addEventListener('input', filterData);
    document.getElementById('status-filter').addEventListener('change', filterData);
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
        renderTable(allData);
        document.getElementById('data-count').innerText = `Total: ${allData.length} Pendaftar`;

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Gagal memuat data.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Belum ada data pendaftar.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        // Status Badge Color
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
                    <a href="detail-siswa.html?id=${item.id}" target="_blank" class="text-blue-600 hover:text-blue-900 mr-3">Detail/Edit</a>
                    <button onclick="deleteData('${item.id}')" class="text-red-600 hover:text-red-900">Hapus</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function filterData() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('status-filter').value;

    const filtered = allData.filter(item => {
        const matchSearch = item.nama_lengkap.toLowerCase().includes(search) || item.nik.includes(search);
        const matchStatus = status === 'all' || item.status === status;
        return matchSearch && matchStatus;
    });

    renderTable(filtered);
}

async function deleteData(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: "Data yang dihapus tidak dapat dikembalikan, termasuk berkas!",
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

            // 1. Delete Files
            const filesToDelete = [item.foto_url, item.kk_url, item.akte_url].filter(Boolean);
            if (filesToDelete.length > 0) {
                const { error: storageError } = await supabaseClient.storage
                    .from('berkas_siswa')
                    .remove(filesToDelete);

                if (storageError) console.warn("Storage delete error:", storageError);
            }

            // 2. Delete Record
            const { error: dbError } = await supabaseClient
                .from('pendaftaran')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
            loadData();

        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// --- Export Functions ---

function exportToExcel() {
    if (!allData || allData.length === 0) {
        Swal.fire('Info', 'Tidak ada data untuk diexport.', 'info');
        return;
    }

    // Prepare data for Excel
    const dataForExcel = allData.map(item => ({
        'Tanggal Daftar': new Date(item.created_at).toLocaleDateString('id-ID'),
        'NIK': item.nik,
        'Nama Lengkap': item.nama_lengkap,
        'Tempat Lahir': item.tempat_lahir,
        'Tanggal Lahir': item.tanggal_lahir,
        'Jenis Kelamin': item.jenis_kelamin,
        'Agama': item.agama,
        'Alamat': item.alamat,
        'Asal Sekolah': item.asal_sekolah,
        'Nama Ayah': item.nama_ayah,
        'Pekerjaan Ayah': item.pekerjaan_ayah,
        'Nama Ibu': item.nama_ibu,
        'Pekerjaan Ibu': item.pekerjaan_ibu,
        'No HP': item.no_hp,
        'Status': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendaftar");

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Laporan_PPDB_${dateStr}.xlsx`);
}

function exportToPDF() {
    if (!allData || allData.length === 0) {
        Swal.fire('Info', 'Tidak ada data untuk diexport.', 'info');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    // Header
    doc.setFontSize(16);
    doc.text('Laporan Data Pendaftar Siswa Baru', 14, 15);
    doc.setFontSize(12);
    doc.text('SD INPRES LELINGLUAN', 14, 22);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);

    // Table
    const tableColumn = ["No", "NIK", "Nama Siswa", "TTL", "JK", "Orang Tua", "Status"];
    const tableRows = [];

    allData.forEach((item, index) => {
        const data = [
            index + 1,
            item.nik,
            item.nama_lengkap,
            `${item.tempat_lahir}, ${item.tanggal_lahir}`,
            item.jenis_kelamin,
            `${item.nama_ayah} / ${item.nama_ibu}`,
            item.status
        ];
        tableRows.push(data);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] } // Blue-600
    });

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Laporan_PPDB_${dateStr}.pdf`);
}


// Close modal on ESC
document.addEventListener('keydown', function(event) {
    if(event.key === "Escape"){
        closeModal();
    }
});
