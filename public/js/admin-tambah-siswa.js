let formFields = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Admin Session)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Set Admin Email & Logout handler
    document.getElementById('user-email').innerText = session.user.email;
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    // 2. Load Form Fields
    await loadFormFields();

    // 3. Render Form
    renderForm();

    // 3b. Load Admin Announcement
    await loadAdminAnnouncement();

    // Bind Edit Button
    const btnEditAnnouncement = document.getElementById('btn-edit-announcement');
    if (btnEditAnnouncement) {
        btnEditAnnouncement.addEventListener('click', handleEditAnnouncement);
    }

    // 4. Handle Submit
    const form = document.getElementById('form-daftar');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);

        // Add NIK Validation Listener
        const nikInput = document.querySelector('input[name="nik"]');
        if (nikInput) {
            nikInput.addEventListener('change', validateNik);
        }
    }
});

async function validateNik(e) {
    const nik = e.target.value;
    if (!nik) return;

    if (nik.length !== 16 || isNaN(nik)) {
        Swal.fire({
            title: 'Format NIK Salah',
            text: 'NIK harus terdiri dari 16 digit angka.',
            icon: 'warning',
            timer: 2000,
            showConfirmButton: false,
            target: document.getElementById('form-daftar')
        });
        e.target.value = '';
        return;
    }

    try {
        const { data, error } = await supabaseClient.rpc('check_nik_availability', { check_nik: nik });

        if (error) throw error;

        if (data === true) {
            Swal.fire({
                title: 'NIK Terdaftar',
                text: 'NIK ini sudah terdaftar sebelumnya.',
                icon: 'error',
                confirmButtonText: 'OK',
                target: document.getElementById('form-daftar')
            });
            e.target.value = '';
        } else {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: 'NIK Valid dan Tersedia' });
        }

    } catch (err) {
        console.error('NIK check error:', err);
    }
}

async function loadFormFields() {
    try {
        const { data, error } = await supabaseClient
            .from('form_fields')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        formFields = data;

    } catch (err) {
        console.error('Gagal memuat form:', err);
        Swal.fire('Error', 'Gagal memuat konfigurasi formulir.', 'error');
    }
}

function renderForm() {
    const sections = {
        'identity': document.getElementById('section-identity'),
        'parents': document.getElementById('section-parents'),
        'files': document.getElementById('section-files'),
        'custom': document.getElementById('section-custom')
    };

    Object.values(sections).forEach(el => { if(el) el.innerHTML = ''; });

    formFields.forEach(field => {
        const container = sections[field.section] || sections['custom'];
        if (!container) return;

        let inputHTML = '';
        const reqAttr = field.required ? 'required' : '';
        const commonClass = "w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition bg-slate-50 focus:bg-white text-sm";

        if (field.type === 'textarea') {
            inputHTML = `<textarea name="${field.name}" ${reqAttr} rows="3" class="${commonClass}" placeholder="Masukkan ${field.label}"></textarea>`;
        } else if (field.type === 'select') {
            const opts = field.options ? field.options.split(',') : [];
            const optsHTML = opts.map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('');
            inputHTML = `<select name="${field.name}" ${reqAttr} class="${commonClass}">
                            <option value="">Pilih ${field.label}...</option>
                            ${optsHTML}
                        </select>`;
        } else if (field.type === 'file') {
            inputHTML = `<div class="relative group">
                            <input type="file" name="${field.name}" ${reqAttr} accept="image/*,.pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50 text-sm">
                            <p class="text-xs text-slate-400 mt-2 leading-relaxed">Format: JPG/PNG/PDF (Max 5MB)</p>
                         </div>`;
        } else {
            const inputType = field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text');
            inputHTML = `<input type="${inputType}" name="${field.name}" ${reqAttr} class="${commonClass}" placeholder="Masukkan ${field.label}">`;
        }

        const isFullWidth = field.type === 'textarea' || field.name === 'alamat';
        const gridClass = isFullWidth ? 'md:col-span-2' : '';

        const fieldHTML = `
            <div class="mb-4 ${gridClass}">
                <label class="block text-sm font-semibold text-slate-700 mb-2">
                    ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                ${inputHTML}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', fieldHTML);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();

    try {
        Swal.fire({
            title: 'Menyimpan...',
            text: 'Memproses data pendaftaran manual.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const formData = new FormData(e.target);
        const payload = { custom_data: {} };
        const fileUploads = [];

        const knownColumns = [
            'nama_lengkap', 'nik', 'tempat_lahir', 'tanggal_lahir',
            'jenis_kelamin', 'agama', 'alamat', 'asal_sekolah',
            'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp',
            'foto_url', 'kk_url', 'akte_url'
        ];

        // Process fields
        for (const field of formFields) {
            const value = formData.get(field.name);

            if (field.type === 'file') {
                const file = formData.get(field.name);
                if (file && file.size > 0) {
                    if (file.size > 5 * 1024 * 1024) throw new Error(`File ${field.label} terlalu besar (Max 5MB)`);

                    const fileExt = file.name.split('.').pop();
                    const fileName = `${field.name.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

                    fileUploads.push({ file, path: fileName, fieldName: field.name });
                } else if (field.required) {
                    throw new Error(`File ${field.label} wajib diunggah.`);
                }
            } else {
                if (knownColumns.includes(field.name)) {
                    payload[field.name] = value;
                } else {
                    payload.custom_data[field.name] = value;
                }
            }
        }

        // Upload Files Parallel
        const uploadResults = await Promise.all(fileUploads.map(async (item) => {
            const { data, error } = await supabaseClient.storage
                .from('berkas_siswa')
                .upload(item.path, item.file);

            if (error) throw error;
            return { fieldName: item.fieldName, path: data.path };
        }));

        // Map uploaded paths to payload
        uploadResults.forEach(res => {
            if (res.fieldName === 'file_foto') payload.foto_url = res.path;
            else if (res.fieldName === 'file_kk') payload.kk_url = res.path;
            else if (res.fieldName === 'file_akte') payload.akte_url = res.path;
            else payload.custom_data[res.fieldName] = res.path;
        });

        // Insert to DB
        const { error: dbError } = await supabaseClient
            .from('pendaftaran')
            .insert([payload]);

        if (dbError) throw dbError;

        // Log Activity to audit log
        await logActivity('ADD_STUDENT_MANUAL', `Menambahkan pendaftar baru secara manual: ${payload.nama_lengkap} (NIK: ${payload.nik})`);

        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Data pendaftaran manual telah tersimpan.',
            confirmButtonText: 'Kembali ke Dashboard'
        }).then(() => {
            window.location.href = 'dashboard.html';
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.message || 'Terjadi kesalahan.', 'error');
    }
}

async function loadAdminAnnouncement() {
    const banner = document.getElementById('admin-alert-banner');
    const textEl = document.getElementById('admin-alert-text');
    if (!banner || !textEl) return;

    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_announcement')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        let announcementText = "Pemberitahuan penting untuk panitia: Harap cek keaslian dokumen KK siswa sebelum melakukan verifikasi data.";
        if (data && data.value && data.value.text) {
            announcementText = data.value.text;
        } else {
            // Seed it if not exists
            await supabaseClient
                .from('app_settings')
                .upsert({ key: 'admin_announcement', value: { text: announcementText } });
        }

        textEl.innerText = announcementText;
        banner.classList.remove('hidden');

    } catch (err) {
        console.error('Failed to load admin announcement:', err);
    }
}

async function handleEditAnnouncement() {
    const textEl = document.getElementById('admin-alert-text');
    const currentText = textEl ? textEl.innerText : '';

    const { value: newText } = await Swal.fire({
        title: 'Edit Catatan Internal Panitia',
        input: 'textarea',
        inputLabel: 'Catatan ini akan tampil di bagian atas halaman Tambah Siswa Baru.',
        inputValue: currentText,
        inputAttributes: {
            placeholder: 'Masukkan catatan internal di sini...'
        },
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value) {
                return 'Catatan tidak boleh kosong!';
            }
        }
    });

    if (newText) {
        try {
            Swal.fire({
                title: 'Menyimpan...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const { error } = await supabaseClient
                .from('app_settings')
                .upsert({ key: 'admin_announcement', value: { text: newText } });

            if (error) throw error;

            // Log activity to audit logs
            await logActivity('EDIT_ADMIN_ANNOUNCEMENT', `Mengubah catatan internal panitia: "${newText.substring(0, 50)}..."`);

            if (textEl) textEl.innerText = newText;

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Catatan internal panitia berhasil diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (err) {
            console.error('Failed to update announcement:', err);
            Swal.fire('Gagal', 'Terjadi kesalahan saat memperbarui catatan.', 'error');
        }
    }
}
