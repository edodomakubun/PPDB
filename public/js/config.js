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

// Global Admin Announcement & Maintenance Check Logic
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Maintenance Mode globally across all pages
    await checkGlobalMaintenanceMode();

    // Only run on admin pages
    if (!window.location.pathname.includes('/admin/')) return;

    try {
        // Load Sidebar dynamically
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
            const sidebarRes = await fetch('sidebar.html');
            if (sidebarRes.ok) {
                const sidebarHTML = await sidebarRes.text();
                sidebarContainer.innerHTML = sidebarHTML;

                // Highlight active link
                const currentPath = window.location.pathname;
                const links = sidebarContainer.querySelectorAll('nav a');
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && currentPath.includes(href)) {
                        link.classList.add('bg-blue-600', 'text-white');
                        link.classList.remove('hover:bg-slate-800', 'hover:text-white');
                    }
                });

                // Mobile Sidebar Toggle
                const btnToggleSidebar = sidebarContainer.querySelector('#btn-toggle-sidebar');
                const sidebar = sidebarContainer.querySelector('#sidebar');

                if (btnToggleSidebar && sidebar) {
                    btnToggleSidebar.addEventListener('click', (e) => {
                        e.stopPropagation();
                        sidebar.classList.toggle('-translate-x-full');
                    });

                    document.addEventListener('click', (e) => {
                        if (!sidebar.classList.contains('-translate-x-full') && !sidebar.contains(e.target) && !btnToggleSidebar.contains(e.target)) {
                            sidebar.classList.add('-translate-x-full');
                        }
                    });
                }
            }
        }

        // Get session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        // Load and update registration and maintenance status badges
        fetchAndUpdateSidebarBadge();
        fetchAndUpdateSidebarMaintenanceBadge();

        // Set User Email and Logout Handler globally
        if (sidebarContainer) {
            const emailEl = sidebarContainer.querySelector('#user-email');
            if (emailEl) emailEl.innerText = session.user.email;

            const logoutBtn = sidebarContainer.querySelector('#btn-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    await supabaseClient.auth.signOut();
                    window.location.href = '../login.html';
                });
            }
        }

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

        // Find target element
        const customRoot = document.getElementById('announcement-banner-root');
        const nav = document.querySelector('nav');
        if (customRoot || nav) {
            const bannerInnerHTML = `
                <div class="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-sm">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                        <div class="p-1.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        </div>
                        <div class="min-w-0">
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/50 px-2 py-0.5 rounded-md">Pengumuman Internal Panitia</span>
                            <p id="global-announcement-text" class="text-xs text-amber-900 mt-1 leading-relaxed font-semibold whitespace-pre-line">
                                ${announcementText}
                            </p>
                        </div>
                    </div>
                    ${isSuperAdmin ? `
                        <div class="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 border-amber-200/50 pt-2.5 md:pt-0">
                            <button id="btn-edit-global-announcement" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-600/10">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></svg>
                                Buat/Ubah
                            </button>
                            <button id="btn-delete-global-announcement" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-red-200/30 ${announcementText.startsWith('Pemberitahuan khusus panitia:') ? 'hidden' : ''}">
                                Hapus
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            if (customRoot) {
                customRoot.innerHTML = bannerInnerHTML;
                customRoot.classList.remove('hidden');
            } else if (nav) {
                const bannerHTML = `
                    <div id="global-admin-announcement" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                        ${bannerInnerHTML}
                    </div>
                `;
                nav.insertAdjacentHTML('afterend', bannerHTML);
            }

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

// --- Global Registration Status Badge & Modal Handling ---

async function fetchAndUpdateSidebarBadge() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (error) throw error;
        if (data) {
            const isOpen = data.value === 'open';
            updateSidebarRegBadge(isOpen);
        }
    } catch (err) {
        console.warn('Error loading registration status for sidebar:', err);
    }
}

function updateSidebarRegBadge(isOpen) {
    const badge = document.getElementById('sidebar-reg-badge');
    if (badge) {
        if (isOpen) {
            badge.innerText = 'Buka';
            badge.className = 'ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400';
        } else {
            badge.innerText = 'Tutup';
            badge.className = 'ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400';
        }
    }
}

window.openRegistrationStatusModal = async () => {
    try {
        Swal.fire({
            title: 'Memuat status...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (error) throw error;

        const isOpen = data && data.value === 'open';
        
        Swal.fire({
            title: 'Status Pendaftaran PPDB',
            html: `
                <div class="flex flex-col items-center gap-4 py-4">
                    <p class="text-sm text-slate-500 text-center">Aktifkan atau matikan formulir pendaftaran PPDB untuk publik secara langsung.</p>
                    <label class="relative inline-flex items-center cursor-pointer select-none">
                        <input type="checkbox" id="modal-toggle-reg" class="sr-only peer" ${isOpen ? 'checked' : ''}>
                        <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                        <span id="modal-status-label" class="ml-3 text-sm font-bold text-slate-700">${isOpen ? 'Buka (Aktif)' : 'Tutup (Non-Aktif)'}</span>
                    </label>
                </div>
            `,
            showCancelButton: false,
            confirmButtonText: 'Selesai',
            customClass: {
                confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition cursor-pointer'
            },
            didOpen: () => {
                const toggle = document.getElementById('modal-toggle-reg');
                const label = document.getElementById('modal-status-label');
                toggle.addEventListener('change', async (e) => {
                    const checked = e.target.checked;
                    const newStatus = checked ? 'open' : 'close';
                    label.innerText = checked ? 'Buka (Aktif)' : 'Tutup (Non-Aktif)';
                    
                    try {
                        const { error: updateError } = await supabaseClient
                            .from('app_settings')
                            .upsert({ key: 'registration_status', value: newStatus });
                        
                        if (updateError) throw updateError;
                        
                        // Update badge in sidebar
                        updateSidebarRegBadge(checked);
                        
                        // Log activity
                        await logActivity('UPDATE_REGISTRATION_STATUS', `Mengubah status pendaftaran menjadi ${newStatus === 'open' ? 'Buka' : 'Tutup'}`);
                    } catch (err) {
                        console.error('Failed to update status:', err);
                        Swal.showValidationMessage(`Gagal memperbarui status: ${err.message}`);
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Gagal memuat status pendaftaran.', 'error');
    }
}

// --- Global Maintenance Mode System ---

async function checkGlobalMaintenanceMode() {
    try {
        const currentPath = window.location.pathname;

        const isAdminPage = currentPath.includes('/admin/');
        const isLoginPage = currentPath.includes('login.html');
        const isMaintenancePage = currentPath.includes('maintenance.html');

        // Never redirect if already on maintenance page, login page, or admin panel
        if (isMaintenancePage || isLoginPage || isAdminPage) {
            if (isAdminPage) {
                const { data } = await supabaseClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'maintenance_mode')
                    .maybeSingle();

                if (data && data.value) {
                    const parsed = typeof data.value === 'string' ? (data.value.startsWith('{') ? JSON.parse(data.value) : data.value) : data.value;
                    if (parsed && parsed.enabled) {
                        renderAdminMaintenanceWarningBanner(parsed);
                    }
                }
            }
            return;
        }

        // Public page check
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .maybeSingle();

        let isMaintenance = false;
        let maintenanceData = null;

        if (data && data.value) {
            maintenanceData = typeof data.value === 'string' ? (data.value.startsWith('{') ? JSON.parse(data.value) : data.value) : data.value;
            isMaintenance = !!(maintenanceData && maintenanceData.enabled);
        }

        if (isMaintenance) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const isAdminLoggedIn = session && session.user;

            if (!isAdminLoggedIn) {
                window.location.href = 'maintenance.html';
            } else {
                renderPublicAdminMaintenanceNotice(maintenanceData);
            }
        }
    } catch (err) {
        console.warn('Maintenance check notice:', err);
    }
}

function renderAdminMaintenanceWarningBanner(data) {
    if (document.getElementById('admin-maint-active-banner')) return;

    const bannerHTML = `
        <div id="admin-maint-active-banner" class="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-4 text-xs font-bold w-full sticky top-0 z-50">
            <div class="flex items-center justify-between max-w-7xl mx-auto w-full gap-4">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                    <span>MODE MAINTENANCE AKTIF: Akses publik dialihkan ke halaman pemeliharaan. Panitia tetap memiliki akses penuh ke panel admin.</span>
                </div>
                <button onclick="openMaintenanceStatusModal()" class="px-3 py-1 bg-amber-950/40 hover:bg-amber-950/60 rounded-lg text-white font-bold underline cursor-pointer shrink-0 transition">
                    Kelola Maintenance
                </button>
            </div>
        </div>
    `;

    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer && sidebarContainer.nextElementSibling) {
        sidebarContainer.nextElementSibling.insertAdjacentHTML('afterbegin', bannerHTML);
    } else {
        document.body.insertAdjacentHTML('afterbegin', bannerHTML);
    }
}

function renderPublicAdminMaintenanceNotice(data) {
    if (document.getElementById('public-admin-maint-banner')) return;

    const bannerHTML = `
        <div id="public-admin-maint-banner" class="bg-slate-900 text-amber-400 border-b border-amber-500/40 px-4 py-2.5 shadow-lg flex items-center justify-between text-xs font-bold w-full sticky top-0 z-50">
            <div class="flex items-center justify-between max-w-7xl mx-auto w-full gap-4">
                <div class="flex items-center gap-2 truncate">
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold">Admin View</span>
                    <span class="truncate">Mode Maintenance AKTIF untuk Umum. Anda dapat melihat halaman ini karena sedang login sebagai Admin.</span>
                </div>
                <a href="admin/dashboard.html" class="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg font-bold hover:bg-amber-400 transition cursor-pointer shrink-0">
                    Panel Admin
                </a>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', bannerHTML);
}

async function fetchAndUpdateSidebarMaintenanceBadge() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .maybeSingle();

        let isEnabled = false;
        if (data && data.value) {
            const val = typeof data.value === 'string' ? (data.value.startsWith('{') ? JSON.parse(data.value) : data.value) : data.value;
            isEnabled = !!(val && val.enabled);
        }

        updateSidebarMaintenanceBadge(isEnabled);
    } catch (err) {
        console.warn('Error loading maintenance status for sidebar:', err);
        updateSidebarMaintenanceBadge(false);
    }
}

function updateSidebarMaintenanceBadge(isEnabled) {
    const badge = document.getElementById('sidebar-maint-badge');
    const dashBadge = document.getElementById('dashboard-maint-badge');

    if (badge) {
        if (isEnabled) {
            badge.innerText = 'Aktif';
            badge.className = 'ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
        } else {
            badge.innerText = 'Non-Aktif';
            badge.className = 'ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400';
        }
    }

    if (dashBadge) {
        if (isEnabled) {
            dashBadge.innerText = 'AKTIF (Mode Maintenance)';
            dashBadge.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
        } else {
            dashBadge.innerText = 'Non-Aktif (Sistem Normal)';
            dashBadge.className = 'text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400 border border-green-500/30';
        }
    }
}

window.openMaintenanceStatusModal = async () => {
    try {
        Swal.fire({
            title: 'Memuat status maintenance...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .maybeSingle();

        let maintenanceInfo = {
            enabled: false,
            message: 'Sistem pendaftaran dan layanan informasi online sedang menjalani pemeliharaan rutin. Silakan kembali lagi beberapa saat lagi.',
            estimated_end: ''
        };

        if (data && data.value) {
            const parsed = typeof data.value === 'string' ? (data.value.startsWith('{') ? JSON.parse(data.value) : data.value) : data.value;
            maintenanceInfo = { ...maintenanceInfo, ...parsed };
        }

        const isEnabled = maintenanceInfo.enabled;

        Swal.fire({
            title: 'Pengaturan Mode Maintenance',
            html: `
                <div class="flex flex-col text-left gap-4 py-2 text-slate-700">
                    <p class="text-xs text-slate-500">
                        Saat Mode Maintenance diaktifkan, seluruh halaman publik akan dikunci dan pengunjung dialihkan ke halaman pemeliharaan. Panitia tetap dapat mengoperasikan panel admin.
                    </p>
                    
                    <!-- Toggle Switch -->
                    <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <span class="text-xs font-bold text-slate-800 block">Status Mode Maintenance</span>
                            <span id="modal-maint-status-label" class="text-[11px] font-semibold ${isEnabled ? 'text-amber-600 font-bold' : 'text-slate-500'}">
                                ${isEnabled ? 'AKTIF (Publik Dikunci)' : 'NON-AKTIF (Sistem Normal)'}
                            </span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer select-none">
                            <input type="checkbox" id="modal-toggle-maint" class="sr-only peer" ${isEnabled ? 'checked' : ''}>
                            <div class="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>

                    <!-- Custom Message Input -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Pesan Pemeliharaan (Untuk Pengunjung)</label>
                        <textarea id="modal-maint-message" rows="3" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" placeholder="Tuliskan pesan yang akan dibaca pengunjung publik...">${maintenanceInfo.message || ''}</textarea>
                    </div>

                    <!-- Estimated Completion Input -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Estimasi Waktu Selesai (Opsional)</label>
                        <input type="text" id="modal-maint-estimated" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" value="${maintenanceInfo.estimated_end || ''}" placeholder="Contoh: 15 Agustus 2026, Pukul 14.00 WIT">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Simpan Perubahan',
            cancelButtonText: 'Batal',
            customClass: {
                confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-xs',
                cancelButton: 'bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-xs'
            },
            didOpen: () => {
                const toggle = document.getElementById('modal-toggle-maint');
                const label = document.getElementById('modal-maint-status-label');
                toggle.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    label.innerText = checked ? 'AKTIF (Publik Dikunci)' : 'NON-AKTIF (Sistem Normal)';
                    label.className = checked ? 'text-[11px] font-semibold text-amber-600 font-bold' : 'text-[11px] font-semibold text-slate-500';
                });
            },
            preConfirm: async () => {
                const enabled = document.getElementById('modal-toggle-maint').checked;
                const message = document.getElementById('modal-maint-message').value.trim();
                const estimated_end = document.getElementById('modal-maint-estimated').value.trim();

                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const userEmail = session ? session.user.email : 'admin';

                    const payload = {
                        enabled: enabled,
                        message: message || 'Sistem PPDB sedang dalam pemeliharaan rutin. Silakan kembali lagi beberapa saat lagi.',
                        estimated_end: estimated_end,
                        updated_at: new Date().toISOString(),
                        updated_by: userEmail
                    };

                    const { error: upsertError } = await supabaseClient
                        .from('app_settings')
                        .upsert({ key: 'maintenance_mode', value: payload });

                    if (upsertError) throw upsertError;

                    // Sync to localStorage immediately
                    localStorage.setItem('ppdb_maintenance_mode', JSON.stringify(payload));

                    await logActivity(
                        enabled ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE',
                        `Mode Maintenance diubah menjadi ${enabled ? 'AKTIF' : 'NON-AKTIF'}. Pesan: "${message.substring(0, 40)}..."`
                    );

                    return payload;
                } catch (err) {
                    Swal.showValidationMessage(`Gagal menyimpan: ${err.message}`);
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const isEnabled = result.value.enabled;
                updateSidebarMaintenanceBadge(isEnabled);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: `Mode Maintenance berhasil ${isEnabled ? 'DIAKTIFKAN' : 'DIMATIKAN'}.`,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            }
        });
    } catch (err) {
        console.error('Error in openMaintenanceStatusModal:', err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat memuat konfigurasi maintenance.', 'error');
    }
};


