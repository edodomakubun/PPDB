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
                    <button onclick="showDetail('${item.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Detail/Edit</button>
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

// Global modal helpers
async function showDetail(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;
    currentId = id;
    isEditMode = false; // Reset edit mode
    updateModalUI();

    // Generate Signed URLs for files
    const getUrl = async (path) => {
        if (!path) return '#';
        const { data } = await supabaseClient.storage.from('berkas_siswa').createSignedUrl(path, 3600);
        return data?.signedUrl || '#';
    };

    const fotoSigned = await getUrl(item.foto_url);
    const kkSigned = await getUrl(item.kk_url);
    const akteSigned = await getUrl(item.akte_url);

    // Populate Modal with Input Fields (disabled by default)
    const renderField = (label, name, value, type = 'text') => `
        <div class="mb-2">
            <label class="block text-xs font-semibold text-slate-500 mb-1">${label}</label>
            <input type="${type}" name="${name}" value="${value || ''}" class="data-field w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent transition" disabled>
        </div>
    `;

    document.getElementById('modal-content').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-bold text-slate-900 mb-4 border-b pb-2">Data Siswa</h4>
                ${renderField('Nama Lengkap', 'nama_lengkap', item.nama_lengkap)}
                ${renderField('NIK', 'nik', item.nik)}
                <div class="grid grid-cols-2 gap-2">
                    ${renderField('Tempat Lahir', 'tempat_lahir', item.tempat_lahir)}
                    ${renderField('Tanggal Lahir', 'tanggal_lahir', item.tanggal_lahir, 'date')}
                </div>
                ${renderField('Jenis Kelamin', 'jenis_kelamin', item.jenis_kelamin)}
                ${renderField('Agama', 'agama', item.agama)}
                ${renderField('Alamat', 'alamat', item.alamat)}
                ${renderField('Asal Sekolah', 'asal_sekolah', item.asal_sekolah)}
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-4 border-b pb-2">Data Orang Tua</h4>
                ${renderField('Nama Ayah', 'nama_ayah', item.nama_ayah)}
                ${renderField('Pekerjaan Ayah', 'pekerjaan_ayah', item.pekerjaan_ayah)}
                ${renderField('Nama Ibu', 'nama_ibu', item.nama_ibu)}
                ${renderField('Pekerjaan Ibu', 'pekerjaan_ibu', item.pekerjaan_ibu)}
                ${renderField('No HP/WA', 'no_hp', item.no_hp)}

                <div class="mt-6 p-4 bg-white rounded-xl border border-slate-200">
                     <h4 class="font-bold text-slate-900 mb-3 text-sm">Status Pendaftaran</h4>
                     <p class="text-sm font-medium mb-2">Saat ini: <span class="text-blue-600">${item.status}</span></p>
                </div>
            </div>
        </div>

        <div class="mt-6">
            <h4 class="font-bold text-slate-900 mb-4 border-b pb-1">Berkas Lampiran (Read Only)</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Pas Foto</p>
                    <a href="${fotoSigned}" target="_blank">
                        <img src="${fotoSigned}" class="h-32 mx-auto object-cover rounded-lg border hover:opacity-75 transition bg-white">
                    </a>
                </div>
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Kartu Keluarga</p>
                    <a href="${kkSigned}" target="_blank" class="inline-block px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 transition text-blue-600 text-sm font-medium">
                        Lihat Dokumen
                    </a>
                </div>
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Akta Kelahiran</p>
                    <a href="${akteSigned}" target="_blank" class="inline-block px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 transition text-blue-600 text-sm font-medium">
                        Lihat Dokumen
                    </a>
                </div>
            </div>
        </div>
    `;

    // Configure Action Buttons
    const btnAccept = document.getElementById('btn-accept');
    const btnReject = document.getElementById('btn-reject');

    btnAccept.onclick = () => updateStatus(id, 'Diterima');
    btnReject.onclick = () => updateStatus(id, 'Ditolak');

    // Show
    document.getElementById('modal-detail').classList.remove('hidden');
    document.body.classList.add('modal-active');
}

function closeModal() {
    document.getElementById('modal-detail').classList.add('hidden');
    document.body.classList.remove('modal-active');
    currentId = null;
    isEditMode = false;
}

// --- Edit Data Logic ---

function toggleEditMode() {
    isEditMode = !isEditMode;
    updateModalUI();
}

function updateModalUI() {
    const inputs = document.querySelectorAll('.data-field');
    const btnEditToggle = document.getElementById('btn-edit-toggle');
    const btnSave = document.getElementById('btn-save-edit');
    const actionButtons = document.getElementById('action-buttons');

    if (isEditMode) {
        // Enable inputs
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('border-transparent');
            input.classList.add('border-blue-300', 'ring-2', 'ring-blue-100');
        });
        btnEditToggle.innerText = 'Batal Edit';
        btnEditToggle.classList.add('text-red-600');

        btnSave.classList.remove('hidden');
        actionButtons.classList.add('hidden'); // Hide Accept/Reject buttons while editing
    } else {
        // Disable inputs
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.remove('border-blue-300', 'ring-2', 'ring-blue-100');
            input.classList.add('border-transparent');
        });
        btnEditToggle.innerText = 'Edit Data';
        btnEditToggle.classList.remove('text-red-600');

        btnSave.classList.add('hidden');
        actionButtons.classList.remove('hidden');
    }
}

async function saveEdit() {
    try {
        Swal.fire({ title: 'Menyimpan Perubahan...', didOpen: () => Swal.showLoading() });

        const form = document.getElementById('form-edit');
        const formData = new FormData(form);
        const updates = {};

        // Collect updated fields
        formData.forEach((value, key) => {
            updates[key] = value;
        });

        const { error } = await supabaseClient
            .from('pendaftaran')
            .update(updates)
            .eq('id', currentId);

        if (error) throw error;

        Swal.fire('Berhasil', 'Data siswa berhasil diperbarui.', 'success');
        isEditMode = false;
        closeModal();
        loadData(); // Refresh table

    } catch (error) {
        Swal.fire('Error', 'Gagal menyimpan data: ' + error.message, 'error');
    }
}

// --- Existing CRUD Logic ---

async function updateStatus(id, newStatus) {
    try {
        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

        const { error } = await supabaseClient
            .from('pendaftaran')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        Swal.fire('Berhasil', `Status diubah menjadi ${newStatus}`, 'success');
        closeModal();
        loadData(); // Refresh table

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
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
