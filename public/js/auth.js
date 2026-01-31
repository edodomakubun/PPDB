document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'admin/dashboard.html';
        return; // Stop execution
    }

    const form = document.getElementById('form-login');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.email.value;
            const password = form.password.value;

            // Simple validation
            if (!email || !password) {
                Swal.fire('Error', 'Email dan Password wajib diisi', 'error');
                return;
            }

            try {
                // Show loading state on button
                const btn = form.querySelector('button[type="submit"]');
                const originalText = btn.innerText;
                btn.disabled = true;
                btn.innerText = 'Memproses...';

                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Success
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });

                await Toast.fire({
                    icon: 'success',
                    title: 'Login Berhasil'
                });

                window.location.href = 'admin/dashboard.html';

            } catch (error) {
                Swal.fire('Login Gagal', 'Email atau password salah.', 'error');
                console.error(error);

                // Reset button
                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.innerText = 'Masuk';
            }
        });
    }
});
