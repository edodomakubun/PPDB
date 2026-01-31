document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cek');
    const resultArea = document.getElementById('result-area');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nik = document.getElementById('nik-input').value.trim();

        if (!nik) {
            Swal.fire('Error', 'Mohon masukkan NIK.', 'error');
            return;
        }

        try {
            // Show Loading
            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Memeriksa...';
            btn.disabled = true;
            resultArea.classList.add('hidden');

            // Call RPC Function "get_status_siswa"
            // Ensure this function exists in Supabase Database
            const { data, error } = await supabaseClient
                .rpc('get_status_siswa', { search_nik: nik });

            btn.innerHTML = originalText;
            btn.disabled = false;

            if (error) throw error;

            if (!data || data.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Data Tidak Ditemukan',
                    text: 'Pastikan NIK yang Anda masukkan benar dan Anda sudah terdaftar.',
                });
                return;
            }

            const siswa = data[0]; // Assuming NIK is unique, take first result
            displayResult(siswa);

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Terjadi kesalahan saat mengecek data.', 'error');
            const btn = form.querySelector('button');
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Cek Status`;
        }
    });

    function displayResult(siswa) {
        let statusBadge, message, alertClass;

        if (siswa.status === 'Diterima') {
            statusBadge = `<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>`;
            alertClass = "bg-green-50 border-green-200";
            message = `
                <h3 class="text-2xl font-bold text-green-700 mb-2">SELAMAT!</h3>
                <p class="text-green-800 font-medium">Anda dinyatakan <span class="uppercase font-bold">DITERIMA</span> sebagai siswa baru.</p>
                <div class="mt-4 p-3 bg-white/50 rounded-lg text-sm text-green-800 border border-green-100">
                    Silakan lakukan daftar ulang di sekolah membawa berkas asli.
                </div>
            `;
        } else if (siswa.status === 'Ditolak') {
            statusBadge = `<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>`;
            alertClass = "bg-red-50 border-red-200";
            message = `
                <h3 class="text-2xl font-bold text-red-700 mb-2">MOHON MAAF</h3>
                <p class="text-red-800 font-medium">Anda dinyatakan <span class="uppercase font-bold">TIDAK DITERIMA</span> pada seleksi tahun ini.</p>
                <div class="mt-4 p-3 bg-white/50 rounded-lg text-sm text-red-800 border border-red-100">
                    Tetap semangat dan jangan menyerah.
                </div>
            `;
        } else {
            statusBadge = `<div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mx-auto mb-4"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>`;
            alertClass = "bg-yellow-50 border-yellow-200";
            message = `
                <h3 class="text-xl font-bold text-yellow-700 mb-2">SEDANG DIPROSES</h3>
                <p class="text-yellow-800">Berkas pendaftaran Anda sedang dalam tahap verifikasi oleh panitia.</p>
                <div class="mt-4 p-3 bg-white/50 rounded-lg text-sm text-yellow-800 border border-yellow-100">
                    Mohon cek kembali secara berkala.
                </div>
            `;
        }

        resultArea.innerHTML = `
            <div class="${alertClass} border rounded-2xl p-8 text-center shadow-sm animate-fade-in-up">
                ${statusBadge}
                ${message}

                <div class="mt-8 pt-6 border-t border-slate-200/50 text-left">
                    <h4 class="text-sm font-bold text-slate-500 uppercase mb-3">Detail Siswa</h4>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div class="flex justify-between border-b border-slate-200/50 pb-2">
                            <span class="text-slate-500">Nama Lengkap</span>
                            <span class="font-semibold text-slate-900">${siswa.nama_lengkap}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-200/50 pb-2">
                            <span class="text-slate-500">NIK</span>
                            <span class="font-mono text-slate-900">${siswa.nik}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-200/50 pb-2">
                            <span class="text-slate-500">Asal Sekolah</span>
                            <span class="text-slate-900">${siswa.asal_sekolah || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        resultArea.classList.remove('hidden');

        // Simple fade in animation
        resultArea.style.opacity = '0';
        resultArea.style.transform = 'translateY(10px)';
        resultArea.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            resultArea.style.opacity = '1';
            resultArea.style.transform = 'translateY(0)';
        }, 50);
    }
});
