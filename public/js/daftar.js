document.addEventListener('DOMContentLoaded', () => {
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
                const filePath = `${fileName}`; // Flat structure or folder? Let's use flat for simplicity with unique names

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

            // Success
            Swal.fire({
                title: 'Pendaftaran Berhasil!',
                text: 'Data Anda telah kami terima. Panitia akan segera menghubungi Anda.',
                icon: 'success',
                confirmButtonText: 'Kembali ke Beranda'
            }).then(() => {
                window.location.href = 'index.html';
            });

        } catch (error) {
            console.error(error);
            let msg = 'Terjadi kesalahan saat mengirim data.';
            if (error.message) msg += ` (${error.message})`;
            Swal.fire('Gagal', msg, 'error');
        }
    });
});
