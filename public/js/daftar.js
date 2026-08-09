let formFields = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Status
    await checkRegistrationStatus();

    // 2. Load Form Fields
    await loadFormFields();

    // 3. Render Form
    renderForm();

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
            target: document.getElementById('form-daftar') // Show localized toast-like
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
                text: 'NIK ini sudah terdaftar sebelumnya. Silakan cek status pendaftaran Anda.',
                icon: 'error',
                confirmButtonText: 'Cek Status',
                target: document.getElementById('form-daftar')
            }).then((res) => {
                if (res.isConfirmed) window.location.href = 'cek-status.html';
            });
            e.target.value = '';
        } else {
            // Success Toast
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

async function checkRegistrationStatus() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (data && data.value === 'closed') {
            const container = document.querySelector('main');
            container.innerHTML = `
                <div class="max-w-2xl mx-auto py-20 px-4 text-center">
                    <div class="bg-red-50 p-8 rounded-2xl border border-red-100">
                         <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h2 class="text-2xl font-bold text-red-800 mb-2">Pendaftaran Ditutup</h2>
                        <p class="text-red-600">Mohon maaf, pendaftaran siswa baru saat ini sedang tidak menerima data baru.</p>
                        <a href="index.html" class="inline-block mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Kembali ke Beranda</a>
                    </div>
                </div>
            `;
            throw new Error('Closed'); // Stop execution
        }
    } catch (err) {
        if(err.message === 'Closed') throw err;
        console.warn('Gagal cek status:', err);
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
    // Determine sections mapping
    const sections = {
        'identity': document.getElementById('section-identity'),
        'parents': document.getElementById('section-parents'),
        'files': document.getElementById('section-files'),
        'custom': document.getElementById('section-custom')
    };

    // Clear existing (hardcoded placeholders if any)
    Object.values(sections).forEach(el => { if(el) el.innerHTML = ''; });

    formFields.forEach(field => {
        const container = sections[field.section] || sections['custom'];
        if (!container) return;

        let inputHTML = '';
        const reqAttr = field.required ? 'required' : '';
        const commonClass = "w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white";

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
            if (field.name === 'file_kk') {
                inputHTML = `
                    <div class="space-y-3">
                        <div class="relative group">
                            <input type="file" id="input-file-kk" name="${field.name}" ${reqAttr} accept="image/*,.pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg p-2">
                            <p class="text-xs text-slate-400 mt-1">Format: JPG/PNG/PDF (Max 5MB).</p>
                        </div>
                        <button type="button" id="btn-scan-kk-ocr" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 cursor-pointer">
                            <svg class="w-4 h-4 text-amber-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            ✨ Scan KK dengan AI OCR (Ekstrak No KK, NIK Ibu, Thn Lahir, Pekerjaan)
                        </button>
                    </div>
                `;
            } else {
                inputHTML = `<div class="relative group">
                                <input type="file" name="${field.name}" ${reqAttr} accept="image/*,.pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg p-2">
                                <p class="text-xs text-slate-400 mt-1">Format: JPG/PNG/PDF (Max 5MB)</p>
                             </div>`;
            }
        } else {
            const inputType = field.type === 'number' ? 'text' : (field.type === 'date' ? 'date' : 'text');
            inputHTML = `<input type="${inputType}" name="${field.name}" ${reqAttr} class="${commonClass}" placeholder="Masukkan ${field.label}">`;
        }

        const fieldHTML = `
            <div class="mb-5">
                <label class="block text-sm font-semibold text-slate-700 mb-2">
                    ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                ${inputHTML}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', fieldHTML);
    });

    // Attach OCR Listener
    const btnScan = document.getElementById('btn-scan-kk-ocr');
    if (btnScan) {
        btnScan.addEventListener('click', handleScanKKOCR);
    }
}

async function handleScanKKOCR() {
    const fileInput = document.querySelector('input[name="file_kk"]');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Pilih Dokumen KK',
            text: 'Silakan pilih/unggah foto atau scan gambar Kartu Keluarga (KK) terlebih dahulu.',
            confirmButtonText: 'Pilih Berkas'
        }).then(() => {
            if (fileInput) fileInput.click();
        });
        return;
    }

    const file = fileInput.files[0];

    try {
        Swal.fire({
            title: '🤖 AI Memproses OCR KK...',
            html: `
                <div class="space-y-3 py-2 text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p class="text-xs text-slate-500">Menganalisis dokumen Kartu Keluarga untuk mengekstrak No. KK, NIK Ibu, Tahun Lahir & Pekerjaan Orang Tua...</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false
        });

        const data = await processKartuKeluargaOCR(file);

        // Target fields to map
        const fieldMapping = {
            'no_kk': data.no_kk,
            'nik_ayah': data.nik_ayah,
            'nik_ibu': data.nik_ibu,
            'tahun_lahir_ayah': data.tahun_lahir_ayah,
            'tahun_lahir_ibu': data.tahun_lahir_ibu,
            'pekerjaan_ayah': data.pekerjaan_ayah,
            'pekerjaan_ibu': data.pekerjaan_ibu,
            'nama_ayah': data.nama_ayah,
            'nama_ibu': data.nama_ibu
        };

        let filledCount = 0;
        let summaryHTML = '<ul class="text-left text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono mt-3">';

        for (const [fieldName, val] of Object.entries(fieldMapping)) {
            if (val) {
                const el = document.querySelector(`[name="${fieldName}"]`);
                if (el) {
                    el.value = val;
                    el.classList.add('bg-green-50', 'ring-2', 'ring-green-400');
                    setTimeout(() => {
                        el.classList.remove('bg-green-50', 'ring-2', 'ring-green-400');
                    }, 3000);
                    filledCount++;
                }
                const labelMap = {
                    'no_kk': 'No. KK',
                    'nik_ayah': 'NIK Ayah',
                    'nik_ibu': 'NIK Ibu',
                    'tahun_lahir_ayah': 'Thn Lahir Ayah',
                    'tahun_lahir_ibu': 'Thn Lahir Ibu',
                    'pekerjaan_ayah': 'Pekerjaan Ayah',
                    'pekerjaan_ibu': 'Pekerjaan Ibu',
                    'nama_ayah': 'Nama Ayah',
                    'nama_ibu': 'Nama Ibu'
                };
                summaryHTML += `<li><strong class="text-slate-700">${labelMap[fieldName] || fieldName}:</strong> <span class="text-blue-600 font-bold">${val}</span></li>`;
            }
        }

        summaryHTML += '</ul>';

        if (filledCount > 0) {
            Swal.fire({
                icon: 'success',
                title: '✨ OCR AI Berhasil!',
                html: `
                    <p class="text-xs text-slate-600">Berhasil mengekstrak <strong>${filledCount} bidang data</strong> dari Kartu Keluarga dan mengisi formulir secara otomatis:</p>
                    ${summaryHTML}
                `,
                confirmButtonText: 'Periksa Formulir'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Data Tidak Terbaca',
                text: 'AI telah memproses gambar, tetapi tidak dapat menemukan bidang data dengan jelas. Silakan periksa kembali foto KK atau isi data secara manual.',
                confirmButtonText: 'Mengerti'
            });
        }

    } catch (err) {
        console.error('OCR Error:', err);
        Swal.fire('Gagal OCR AI', err.message || 'Terjadi kesalahan saat memproses OCR.', 'error');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    try {
        Swal.fire({
            title: 'Memproses...',
            text: 'Mohon tunggu sebentar.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const formData = new FormData(e.target);
        const payload = { custom_data: {} };
        const fileUploads = [];

        // Known physical columns in 'pendaftaran' table
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
                    // Check size (5MB limit)
                    if (file.size > 5 * 1024 * 1024) throw new Error(`File ${field.label} terlalu besar (Max 5MB)`);

                    // Upload later
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${field.name.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

                    fileUploads.push({ file, path: fileName, fieldName: field.name });
                } else if (field.required) {
                    throw new Error(`File ${field.label} wajib diunggah.`);
                }
            } else {
                // Text/Date/Select
                if (knownColumns.includes(field.name)) {
                    payload[field.name] = value;
                } else {
                    // Custom field -> JSONB
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
            // Map specific file fields to columns if they match known names
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

        // Success
        Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil!',
            text: 'Data Anda telah kami terima.',
            confirmButtonText: 'Lihat Kartu Bukti'
        }).then(() => {
            showRegistrationCard(payload);
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.message || 'Terjadi kesalahan.', 'error');
    }
}

function showRegistrationCard(data) {
    // Simplified Card View
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="max-w-3xl mx-auto py-10 px-4">
             <div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center" id="print-area">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 class="text-3xl font-bold text-slate-900 mb-2">Pendaftaran Berhasil</h2>
                <p class="text-slate-500 mb-8">Simpan bukti pendaftaran ini.</p>

                <div class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-left max-w-md mx-auto mb-8">
                    <div class="space-y-4">
                        <div>
                            <span class="text-xs text-slate-400 uppercase">Nama Lengkap</span>
                            <div class="text-lg font-bold text-slate-800">${data.nama_lengkap}</div>
                        </div>
                        <div>
                            <span class="text-xs text-slate-400 uppercase">NIK</span>
                            <div class="text-lg font-bold text-blue-600 font-mono">${data.nik}</div>
                        </div>
                        <div>
                            <span class="text-xs text-slate-400 uppercase">Tanggal Daftar</span>
                            <div class="text-sm font-medium text-slate-600">${new Date().toLocaleDateString('id-ID')}</div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-center gap-4 no-print">
                    <button onclick="window.print()" class="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition">Cetak</button>
                    <a href="index.html" class="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition">Beranda</a>
                </div>
            </div>
             <style>
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; shadow: none; }
                    .no-print { display: none !important; }
                    nav, footer { display: none; }
                }
            </style>
        </div>
    `;
    window.scrollTo(0, 0);
}
