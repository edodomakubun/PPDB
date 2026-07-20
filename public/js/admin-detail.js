let currentData = null;
let isEditMode = false;
let studentId = null;
let formFields = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Display User Email
    document.getElementById('user-email').innerText = session.user.email;
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    // 2. Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    studentId = urlParams.get('id');

    if (!studentId) {
        Swal.fire('Error', 'ID Siswa tidak ditemukan.', 'error').then(() => {
            window.location.href = 'dashboard.html';
        });
        return;
    }

    // 3. Load Data
    await loadStudentData(studentId);

    // 4. Setup Event Listeners
    setupEventListeners();

    // 5. Update Print Link
    document.getElementById('btn-print').href = `../cetak-kartu.html?id=${studentId}`;
});

async function loadStudentData(id) {
    try {
        // Fetch Form Fields first
        const { data: fieldsData, error: fieldsError } = await supabaseClient
            .from('form_fields')
            .select('*')
            .order('order_index', { ascending: true });

        if (fieldsError) throw fieldsError;
        formFields = fieldsData || [];

        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Data tidak ditemukan');

        currentData = data;
        await renderForm(currentData);

        document.getElementById('loading-indicator').classList.add('hidden');
        document.getElementById('form-edit').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Error', 'Gagal memuat data siswa.', 'error').then(() => {
             window.location.href = 'dashboard.html';
        });
    }
}

async function renderForm(item) {
    const container = document.getElementById('detail-content');

    // Generate Signed URLs for files
    const getUrl = async (path) => {
        if (!path) return '#';
        try {
            const { data, error } = await supabaseClient.storage.from('berkas_siswa').createSignedUrl(path, 3600);
            if (error) console.error('Error signing URL:', error);
            return data?.signedUrl || '#';
        } catch (e) {
            console.error('Error signing URL:', e);
            return '#';
        }
    };

    const fotoSigned = await getUrl(item.foto_url);
    const kkSigned = await getUrl(item.kk_url);
    const akteSigned = await getUrl(item.akte_url);

    // Helper to create fields
    const renderField = (label, name, value, type = 'text') => {
        const safeValue = value ? String(value).replace(/"/g, '&quot;') : '';
        return `
        <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-600 mb-1">${label}</label>
            <input type="${type}" name="${name}" value="${safeValue}" class="data-field w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" disabled>
        </div>
        `;
    };

    // Filter out known static fields to identify dynamic custom fields
    const knownColumns = [
        'nama_lengkap', 'nik', 'tempat_lahir', 'tanggal_lahir',
        'jenis_kelamin', 'agama', 'alamat', 'asal_sekolah',
        'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp'
    ];
    const fileFields = ['file_foto', 'file_kk', 'file_akte'];
    const customFields = formFields.filter(f => !knownColumns.includes(f.name) && !fileFields.includes(f.name));

    let customFieldsHTML = '';
    if (customFields.length > 0) {
        customFieldsHTML = `
            <div class="mt-8 border-t border-slate-200 pt-6">
                <h3 class="text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Data Tambahan (Dinamis)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        `;

        for (const field of customFields) {
            const val = item.custom_data ? item.custom_data[field.name] : '';
            if (field.type === 'file') {
                const fileUrl = val ? await getUrl(val) : '#';
                customFieldsHTML += `
                    <div class="mb-4 p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                        <div>
                            <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">${field.label}</span>
                            ${val ? `<a href="${fileUrl}" target="_blank" class="text-sm font-semibold text-blue-600 hover:underline">Buka Berkas</a>` : '<span class="text-sm text-slate-400">Belum diunggah</span>'}
                        </div>
                        ${field.required ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Wajib</span>' : ''}
                    </div>
                `;
            } else if (field.type === 'textarea') {
                customFieldsHTML += `
                    <div class="mb-4 col-span-full">
                        <label class="block text-sm font-semibold text-slate-600 mb-1">${field.label}</label>
                        <textarea name="${field.name}" class="data-field w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" rows="3" disabled>${val || ''}</textarea>
                    </div>
                `;
            } else if (field.type === 'select') {
                const options = field.options ? field.options.split(',') : [];
                const optionsHTML = options.map(o => {
                    const cleanOpt = o.trim();
                    const selected = cleanOpt === String(val).trim() ? 'selected' : '';
                    return `<option value="${cleanOpt}" ${selected}>${cleanOpt}</option>`;
                }).join('');

                customFieldsHTML += `
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-600 mb-1">${field.label}</label>
                        <select name="${field.name}" class="data-field w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" disabled>
                            <option value="">Pilih ${field.label}...</option>
                            ${optionsHTML}
                        </select>
                    </div>
                `;
            } else {
                const inputType = field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text');
                const safeVal = val ? String(val).replace(/"/g, '&quot;') : '';
                customFieldsHTML += `
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-600 mb-1">${field.label}</label>
                        <input type="${inputType}" name="${field.name}" value="${safeVal}" class="data-field w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" disabled>
                    </div>
                `;
            }
        }

        customFieldsHTML += `
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left Column: Student Data -->
            <div>
                <h2 class="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">Data Pribadi Siswa</h2>
                ${renderField('Nama Lengkap', 'nama_lengkap', item.nama_lengkap)}
                ${renderField('NIK', 'nik', item.nik)}
                <div class="grid grid-cols-2 gap-4">
                    ${renderField('Tempat Lahir', 'tempat_lahir', item.tempat_lahir)}
                    ${renderField('Tanggal Lahir', 'tanggal_lahir', item.tanggal_lahir, 'date')}
                </div>
                ${renderField('Jenis Kelamin', 'jenis_kelamin', item.jenis_kelamin)}
                ${renderField('Agama', 'agama', item.agama)}
                <div class="mb-4">
                    <label class="block text-sm font-semibold text-slate-600 mb-1">Alamat</label>
                    <textarea name="alamat" class="data-field w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" rows="3" disabled>${item.alamat || ''}</textarea>
                </div>
                ${renderField('Asal Sekolah', 'asal_sekolah', item.asal_sekolah)}
            </div>

            <!-- Right Column: Parent & Files -->
            <div>
                <h2 class="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">Data Orang Tua / Wali</h2>
                ${renderField('Nama Ayah', 'nama_ayah', item.nama_ayah)}
                ${renderField('Pekerjaan Ayah', 'pekerjaan_ayah', item.pekerjaan_ayah)}
                ${renderField('Nama Ibu', 'nama_ibu', item.nama_ibu)}
                ${renderField('Pekerjaan Ibu', 'pekerjaan_ibu', item.pekerjaan_ibu)}
                ${renderField('No HP / WhatsApp', 'no_hp', item.no_hp)}

                <div class="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
                     <h4 class="font-bold text-slate-900 mb-2">Status Pendaftaran</h4>
                     <div class="flex items-center gap-3">
                        <span id="status-display" class="text-lg font-medium text-blue-700">${item.status}</span>
                     </div>
                </div>

                <div class="mt-8">
                    <h2 class="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Berkas Lampiran</h2>
                    <div class="grid grid-cols-1 gap-4">
                        <div class="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-white">
                            <div class="w-16 h-16 flex-shrink-0 bg-slate-100 rounded-md overflow-hidden border">
                                <img src="${fotoSigned}" class="w-full h-full object-cover" alt="Pas Foto">
                            </div>
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-slate-900">Pas Foto</p>
                                <a href="${fotoSigned}" target="_blank" class="text-xs text-blue-600 hover:underline">Lihat Full Size</a>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-white">
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-slate-900">Kartu Keluarga (KK)</p>
                                <a href="${kkSigned}" target="_blank" class="text-xs text-blue-600 hover:underline">Buka Dokumen</a>
                            </div>
                        </div>
                         <div class="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-white">
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-slate-900">Akta Kelahiran</p>
                                <a href="${akteSigned}" target="_blank" class="text-xs text-blue-600 hover:underline">Buka Dokumen</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${customFieldsHTML}
    `;
}

function setupEventListeners() {
    // Edit Toggle
    document.getElementById('btn-edit-toggle').addEventListener('click', () => {
        isEditMode = true;
        updateUIState();
    });

    // Cancel Edit
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        isEditMode = false;
        // Reset form values to original
        renderForm(currentData).then(() => {
             updateUIState();
        });

    });

    // Save Edit
    document.getElementById('btn-save-edit').addEventListener('click', saveEdit);

    // Accept/Reject
    document.getElementById('btn-accept').addEventListener('click', () => updateStatus('Diterima'));
    document.getElementById('btn-reject').addEventListener('click', () => updateStatus('Ditolak'));

    // Delete
    document.getElementById('btn-delete').addEventListener('click', deleteData);
}

function updateUIState() {
    const inputs = document.querySelectorAll('.data-field');
    const btnEditToggle = document.getElementById('btn-edit-toggle');
    const editActions = document.getElementById('edit-actions');
    const statusActions = document.getElementById('status-actions');

    if (isEditMode) {
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-slate-50', 'text-slate-500');
            input.classList.add('bg-white', 'text-slate-900');
        });
        btnEditToggle.classList.add('hidden');
        editActions.classList.remove('hidden');
        statusActions.classList.add('hidden');
    } else {
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-slate-50', 'text-slate-500');
            input.classList.remove('bg-white', 'text-slate-900');
        });
        btnEditToggle.classList.remove('hidden');
        editActions.classList.add('hidden');
        statusActions.classList.remove('hidden');
    }
}

async function saveEdit() {
    try {
        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

        const form = document.getElementById('form-edit');
        const formData = new FormData(form);
        const updates = {};
        const customData = { ...(currentData.custom_data || {}) };

        const knownColumns = [
            'nama_lengkap', 'nik', 'tempat_lahir', 'tanggal_lahir',
            'jenis_kelamin', 'agama', 'alamat', 'asal_sekolah',
            'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp'
        ];

        // Collect updated fields, routing unknown ones to customData
        formData.forEach((value, key) => {
            if (knownColumns.includes(key)) {
                updates[key] = value;
            } else {
                customData[key] = value;
            }
        });

        // Attach customData to updates object
        updates.custom_data = customData;

        const { error } = await supabaseClient
            .from('pendaftaran')
            .update(updates)
            .eq('id', studentId);

        if (error) throw error;

        // Update local data
        currentData = { ...currentData, ...updates };

        await logActivity('UPDATE_STUDENT', `Mengubah data siswa ID: ${studentId}`);

        Swal.fire('Berhasil', 'Data berhasil diperbarui.', 'success');
        isEditMode = false;
        updateUIState();

    } catch (error) {
        Swal.fire('Error', 'Gagal menyimpan: ' + error.message, 'error');
    }
}

async function updateStatus(newStatus) {
    try {
        Swal.fire({ title: 'Updating...', didOpen: () => Swal.showLoading() });

        const { error } = await supabaseClient
            .from('pendaftaran')
            .update({ status: newStatus })
            .eq('id', studentId);

        if (error) throw error;

        currentData.status = newStatus;
        document.getElementById('status-display').innerText = newStatus;

        await logActivity('UPDATE_STATUS', `Mengubah status siswa ID ${studentId} menjadi ${newStatus}`);

        Swal.fire('Berhasil', `Status diubah menjadi ${newStatus}`, 'success');

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function deleteData() {
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

            // 1. Delete Files
            const filesToDelete = [currentData.foto_url, currentData.kk_url, currentData.akte_url].filter(Boolean);
            if (filesToDelete.length > 0) {
                await supabaseClient.storage.from('berkas_siswa').remove(filesToDelete);
            }

            // 2. Delete Record
            const { error } = await supabaseClient
                .from('pendaftaran')
                .delete()
                .eq('id', studentId);

            if (error) throw error;

            await Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
            window.location.href = 'dashboard.html';

        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}
