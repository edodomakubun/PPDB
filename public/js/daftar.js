document.addEventListener('DOMContentLoaded', async () => {
    // Check Registration Status first
    await checkRegistrationStatus();

    const form = document.getElementById('form-daftar');
    const btnSubmit = document.getElementById('btn-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic Validation
        const formData = new FormData(form);
        const requiredFields = ['nama_lengkap', 'nik', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'alamat', 'nama_ayah', 'nama_ibu', 'no_hp'];

        for (const field of requiredFields) {
            if (!formData.get(field)) {
                Swal.fire('Error', 'Mohon lengkapi semua data wajib.', 'error');
                return;
            }
        }

        const fileFoto = formData.get('file_foto');
        const fileKk = formData.get('file_kk');
        const fileAkte = formData.get('file_akte');

        if (fileFoto.size > 2 * 1024 * 1024) {
            Swal.fire('Error', 'Ukuran Pas Foto terlalu besar (Maks 2MB)', 'error');
            return;
        }
        if (fileKk.size > 5 * 1024 * 1024) {
            Swal.fire('Error', 'Ukuran KK terlalu besar (Maks 5MB)', 'error');
            return;
        }
        if (fileAkte.size > 5 * 1024 * 1024) {
            Swal.fire('Error', 'Ukuran Akta Kelahiran terlalu besar (Maks 5MB)', 'error');
            return;
        }

        try {
            // Show Loading
            Swal.fire({
                title: 'Sedang Mengirim...',
                text: 'Mohon tunggu, data sedang diproses.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Helper to upload file
            const uploadFile = async (file, prefix) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data, error } = await supabaseClient.storage
                    .from('berkas_siswa')
                    .upload(filePath, file);

                if (error) throw error;
                return data.path;
            };

            // Upload all files in parallel
            const [fotoPath, kkPath, aktePath] = await Promise.all([
                uploadFile(fileFoto, 'FOTO'),
                uploadFile(fileKk, 'KK'),
                uploadFile(fileAkte, 'AKTE')
            ]);

            // Insert Data to Database
            const { error: dbError } = await supabaseClient
                .from('pendaftaran')
                .insert([
                    {
                        nama_lengkap: formData.get('nama_lengkap'),
                        nik: formData.get('nik'),
                        tempat_lahir: formData.get('tempat_lahir'),
                        tanggal_lahir: formData.get('tanggal_lahir'),
                        jenis_kelamin: formData.get('jenis_kelamin'),
                        agama: formData.get('agama'),
                        alamat: formData.get('alamat'),
                        nama_ayah: formData.get('nama_ayah'),
                        pekerjaan_ayah: formData.get('pekerjaan_ayah'),
                        nama_ibu: formData.get('nama_ibu'),
                        pekerjaan_ibu: formData.get('pekerjaan_ibu'),
                        no_hp: formData.get('no_hp'),
                        asal_sekolah: formData.get('asal_sekolah'),
                        foto_url: fotoPath,
                        kk_url: kkPath,
                        akte_url: aktePath,
                        status: 'Menunggu Verifikasi'
                    }
                ]);

            if (dbError) throw dbError;

            // Success - Show Registration Card
            showRegistrationCard({
                nama: formData.get('nama_lengkap'),
                nik: formData.get('nik'),
                tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            });

        } catch (error) {
            console.error(error);
            let msg = 'Terjadi kesalahan saat mengirim data.';
            if (error.message) msg += ` (${error.message})`;
            Swal.fire('Gagal', msg, 'error');
        }
    });
});

async function checkRegistrationStatus() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (data && data.value === 'closed') {
            // Hide Form and Show Message
            const container = document.querySelector('main');
            container.innerHTML = `
                <div class="max-w-2xl mx-auto py-20 px-4 text-center">
                    <div class="bg-red-50 p-8 rounded-2xl border border-red-100">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h2 class="text-2xl font-bold text-red-800 mb-2">Pendaftaran Ditutup</h2>
                        <p class="text-red-600">Mohon maaf, pendaftaran siswa baru saat ini sedang tidak menerima data baru. Silakan hubungi panitia untuk informasi lebih lanjut.</p>
                        <a href="index.html" class="inline-block mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Kembali ke Beranda</a>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.warn('Gagal cek status pendaftaran:', err);
    }
}

function showRegistrationCard(data) {
    // Hide form, show card
    const mainContent = document.querySelector('main .max-w-3xl');
    mainContent.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center" id="print-area">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 class="text-3xl font-bold text-slate-900 mb-2">Pendaftaran Berhasil!</h2>
            <p class="text-slate-600 mb-8">Data Anda telah kami terima. Silakan simpan kartu ini sebagai bukti pendaftaran.</p>

            <div class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 max-w-md mx-auto mb-8 text-left relative overflow-hidden">
                <div class="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BUKTI DAFTAR</div>
                <h3 class="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Kartu Pendaftaran</h3>
                <div class="space-y-3">
                    <div>
                        <span class="text-xs text-slate-500 uppercase tracking-wider block">Nama Lengkap</span>
                        <span class="font-semibold text-slate-900 text-lg">${data.nama}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 uppercase tracking-wider block">NIK / Kode Pendaftaran</span>
                        <span class="font-mono font-bold text-blue-600 text-xl tracking-wider">${data.nik}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 uppercase tracking-wider block">Tanggal Daftar</span>
                        <span class="font-medium text-slate-700">${data.tanggal}</span>
                    </div>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 justify-center no-print">
                <button onclick="window.print()" class="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition shadow-lg flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Cetak Kartu
                </button>
                <a href="index.html" class="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition flex items-center justify-center">
                    Kembali ke Beranda
                </a>
            </div>

            <p class="text-sm text-slate-500 mt-8">
                Gunakan NIK Anda untuk mengecek status kelulusan di halaman <a href="cek-status.html" class="text-blue-600 hover:underline">Cek Status</a>.
            </p>
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
    `;

    // Scroll to top
    window.scrollTo(0, 0);
    Swal.close();
}
