// Supabase Configuration
const SUPABASE_URL = 'https://hcnelzmhlweubyvsdkwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbmVsem1obHdldWJ5dnNka3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzIzNzUsImV4cCI6MjA4NTQ0ODM3NX0.We_4uaYj4BUuaRg-sS-heYx0Q3g47c-M63rnhNT3wEc';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Helpers ---

/**
 * Log Admin Activity to 'audit_logs' table
 * @param {string} action - Short description of action (e.g., 'UPDATE_STATUS')
 * @param {string} details - Detailed info (e.g., 'Updated status for NIK 123 to Accepted')
 */
async function logActivity(action, details) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return; // No session, cannot log (or public action)

        const userEmail = session.user.email;

        await supabaseClient.from('audit_logs').insert([{
            admin_email: userEmail,
            action: action,
            details: details
        }]);
    } catch (err) {
        console.warn('Audit Log Error:', err);
    }
}

// Global Admin Announcement Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Only run on admin pages
    if (!window.location.pathname.includes('/admin/')) return;

    try {
        // Get session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        const userEmail = session.user.email;
        const isSuperAdmin = userEmail === 'admin@sekolah.id';

        // Load admin announcement
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_announcement')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        let announcementText = "";
        if (data && data.value && data.value.text) {
            announcementText = data.value.text;
        }

        // If no announcement and not superadmin, do not render banner
        if (!announcementText && !isSuperAdmin) return;

        // If no announcement and is superadmin, show default placeholder
        if (!announcementText && isSuperAdmin) {
            announcementText = "Pemberitahuan khusus panitia: Belum ada pengumuman. Klik 'Buat/Ubah' untuk menulis catatan baru.";
        }

        // Find navbar to insert the banner right below it
        const nav = document.querySelector('nav');
        if (nav) {
            const bannerHTML = `
                <div id="global-admin-announcement" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
                        <div class="p-1 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        </div>
                        <div class="flex-1">
                            <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Pengumuman Internal Panitia</span>
                            <p id="global-announcement-text" class="text-sm text-amber-900 mt-1 leading-relaxed font-medium">
                                ${announcementText}
                            </p>
                        </div>
                        ${isSuperAdmin ? `
                            <div class="flex items-center gap-2 shrink-0">
                                <button id="btn-edit-global-announcement" class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 hover:text-amber-900 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    Buat/Ubah
                                </button>
                                <button id="btn-delete-global-announcement" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer ${announcementText.startsWith('Pemberitahuan khusus panitia:') ? 'hidden' : ''}">
                                    Hapus
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            nav.insertAdjacentHTML('afterend', bannerHTML);

            if (isSuperAdmin) {
                document.getElementById('btn-edit-global-announcement').addEventListener('click', handleGlobalAnnouncementEdit);
                document.getElementById('btn-delete-global-announcement').addEventListener('click', handleGlobalAnnouncementDelete);
            }
        }

    } catch (err) {
        console.error('Error loading global admin announcement:', err);
    }
});

async function handleGlobalAnnouncementEdit() {
    const textEl = document.getElementById('global-announcement-text');
    let currentText = textEl ? textEl.innerText : '';
    if (currentText.startsWith('Pemberitahuan khusus panitia:')) {
        currentText = '';
    }

    const { value: newText } = await Swal.fire({
        title: 'Buat / Ubah Pengumuman Panitia',
        input: 'textarea',
        inputLabel: 'Pengumuman ini akan muncul di atas halaman seluruh panitia.',
        inputValue: currentText,
        inputAttributes: {
            placeholder: 'Tulis pengumuman di sini...'
        },
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value) {
                return 'Pengumuman tidak boleh kosong!';
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

            await logActivity('EDIT_ADMIN_ANNOUNCEMENT', `Mengubah pengumuman global panitia: "${newText.substring(0, 50)}..."`);

            if (textEl) textEl.innerText = newText;

            const btnDelete = document.getElementById('btn-delete-global-announcement');
            if (btnDelete) btnDelete.classList.remove('hidden');

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Pengumuman panitia berhasil diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (err) {
            console.error('Failed to update global announcement:', err);
            Swal.fire('Gagal', 'Terjadi kesalahan saat memperbarui pengumuman.', 'error');
        }
    }
}

async function handleGlobalAnnouncementDelete() {
    const textEl = document.getElementById('global-announcement-text');

    const result = await Swal.fire({
        title: 'Hapus Pengumuman?',
        text: 'Apakah Anda yakin ingin menghapus pengumuman ini untuk semua panitia?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Menghapus...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const { error } = await supabaseClient
                .from('app_settings')
                .upsert({ key: 'admin_announcement', value: { text: "" } });

            if (error) throw error;

            await logActivity('DELETE_ADMIN_ANNOUNCEMENT', `Menghapus pengumuman global panitia`);

            if (textEl) textEl.innerText = "Pemberitahuan khusus panitia: Belum ada pengumuman. Klik 'Buat/Ubah' untuk menulis catatan baru.";
            
            const btnDelete = document.getElementById('btn-delete-global-announcement');
            if (btnDelete) btnDelete.classList.add('hidden');

            Swal.fire({
                icon: 'success',
                title: 'Terhapus',
                text: 'Pengumuman panitia telah dihapus.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (err) {
            console.error('Failed to delete global announcement:', err);
            Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus pengumuman.', 'error');
        }
    }
}
