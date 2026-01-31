let allData = [];

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
                    <button onclick="showDetail('${item.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Detail</button>
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
let currentId = null;

async function showDetail(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;
    currentId = id;

    // Generate Signed URLs for files
    // The createSignedUrl returns { data: { signedUrl } }
    const getUrl = async (path) => {
        if (!path) return '#';
        const { data } = await supabaseClient.storage.from('berkas_siswa').createSignedUrl(path, 3600); // 1 hour
        return data?.signedUrl || '#';
    };

    const fotoSigned = await getUrl(item.foto_url);
    const kkSigned = await getUrl(item.kk_url);
    const akteSigned = await getUrl(item.akte_url);

    // Populate Modal
    document.getElementById('modal-content').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-bold text-slate-900 mb-2 border-b pb-1">Data Siswa</h4>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Nama:</span> ${item.nama_lengkap}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">NIK:</span> ${item.nik}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">TTL:</span> ${item.tempat_lahir}, ${item.tanggal_lahir}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">JK:</span> ${item.jenis_kelamin}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Agama:</span> ${item.agama}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Alamat:</span> ${item.alamat}</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Asal Sekolah:</span> ${item.asal_sekolah || '-'}</p>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-2 border-b pb-1">Data Orang Tua</h4>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Ayah:</span> ${item.nama_ayah} (${item.pekerjaan_ayah || '-'})</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">Ibu:</span> ${item.nama_ibu} (${item.pekerjaan_ibu || '-'})</p>
                <p class="text-sm mb-1"><span class="font-semibold w-24 inline-block">No HP/WA:</span> <a href="https://wa.me/${item.no_hp.replace(/^0/, '62')}" target="_blank" class="text-green-600 hover:underline">${item.no_hp}</a></p>
            </div>
        </div>

        <div class="mt-6">
            <h4 class="font-bold text-slate-900 mb-4 border-b pb-1">Berkas Lampiran</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Pas Foto</p>
                    <a href="${fotoSigned}" target="_blank">
                        <img src="${fotoSigned}" class="h-32 mx-auto object-cover rounded-lg border hover:opacity-75 transition">
                    </a>
                </div>
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Kartu Keluarga</p>
                    <a href="${kkSigned}" target="_blank" class="inline-block p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition text-blue-600">
                        Lihat KK
                    </a>
                </div>
                <div class="text-center">
                    <p class="text-xs font-semibold mb-2">Akta Kelahiran</p>
                    <a href="${akteSigned}" target="_blank" class="inline-block p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition text-blue-600">
                        Lihat Akta
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
}

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

// Close modal on ESC
document.addEventListener('keydown', function(event) {
    if(event.key === "Escape"){
        closeModal();
    }
});
