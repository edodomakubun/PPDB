let currentData = null;
let isEditMode = false;
let studentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Check Mode (Add or Edit)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (userId) {
        // Edit Mode
        await setupEditMode(userId);
    } else {
        // Add Mode
        setupAddMode();
    }
});

function setupAddMode() {
    const pageTitle = document.getElementById('page-title');
    if(pageTitle) pageTitle.innerText = 'Tambah Panitia Baru';

    const passSection = document.getElementById('password-section');
    if(passSection) passSection.classList.remove('hidden');

    const resetPassSection = document.getElementById('reset-password-section');
    if(resetPassSection) resetPassSection.classList.add('hidden');

    const form = document.getElementById('form-user');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('nama').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password || password.length < 6) {
                Swal.fire('Error', 'Email dan Password (min 6 karakter) wajib diisi.', 'error');
                return;
            }

            try {
                const confirm = await Swal.fire({
                    title: 'Konfirmasi',
                    text: "Karena alasan keamanan sistem, setelah membuat akun baru Anda akan otomatis logout. Lanjutkan?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Buat Akun'
                });

                if (!confirm.isConfirmed) return;

                Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });

                // 1. Create Auth User (Logs out current user immediately upon success in client)
                // Note: We create profile AFTER auth success? No, Auth triggers logout.
                // We create profile BEFORE auth.

                const { error: dbError } = await supabaseClient
                    .from('admin_profiles')
                    .insert([{ email, nama }]);

                if (dbError) throw dbError;

                const { error: authError } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: nama }
                    }
                });

                if (authError) throw authError;

                await Swal.fire('Berhasil', 'Akun panitia berhasil dibuat. Silakan login kembali.', 'success');
                window.location.href = '../login.html';

            } catch (err) {
                console.error(err);
                Swal.fire('Gagal', err.message, 'error');
            }
        });
    }
}

async function setupEditMode(id) {
    const pageTitle = document.getElementById('page-title');
    if(pageTitle) pageTitle.innerText = 'Edit Data Panitia';

    const passSection = document.getElementById('password-section');
    if(passSection) passSection.classList.add('hidden'); // Cannot edit password directly

    const resetPassSection = document.getElementById('reset-password-section');
    if(resetPassSection) resetPassSection.classList.remove('hidden');

    // Load Data
    try {
        const { data, error } = await supabaseClient
            .from('admin_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw new Error('Data user tidak ditemukan');

        const namaInput = document.getElementById('nama');
        if(namaInput) namaInput.value = data.nama || '';

        const emailInput = document.getElementById('email');
        if(emailInput) {
            emailInput.value = data.email || '';
            emailInput.disabled = true; // Cannot change email easily without re-auth logic
        }

    } catch (err) {
        Swal.fire('Error', 'Gagal memuat data: ' + err.message, 'error').then(() => {
            window.location.href = 'users.html';
        });
        return;
    }

    // Handle Form Submit (Update Name)
    const form = document.getElementById('form-user');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('nama').value;

            try {
                Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

                const { error } = await supabaseClient
                    .from('admin_profiles')
                    .update({ nama })
                    .eq('id', id);

                if (error) throw error;

                Swal.fire('Berhasil', 'Data berhasil diperbarui.', 'success').then(() => {
                    window.location.href = 'users.html';
                });

            } catch (err) {
                Swal.fire('Gagal', err.message, 'error');
            }
        });
    }

    // Handle Reset Password Email
    const btnReset = document.getElementById('btn-reset-password');
    if(btnReset) {
        btnReset.addEventListener('click', async () => {
            const email = document.getElementById('email').value;

            try {
                Swal.fire({ title: 'Mengirim Email...', didOpen: () => Swal.showLoading() });

                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/admin/reset-password-confirm.html', // hypothetical page
                });

                if (error) throw error;

                Swal.fire('Terkirim!', 'Email reset password telah dikirim ke ' + email, 'success');

            } catch (err) {
                Swal.fire('Gagal', err.message, 'error');
            }
        });
    }
}
