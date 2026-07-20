let allData = [];
let statusChart = null;
let genderChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Admin Session)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Initial Data Load
    await loadData();
    await loadSettings();

    // 3. Toggle Registration Event Listener
    const toggleReg = document.getElementById('toggle-registration');
    if (toggleReg) {
        toggleReg.addEventListener('change', toggleRegistrationStatus);
    }
});

async function loadData() {
    try {
        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data;

        // Update Dashboard Stats & Charts
        updateStatistics(allData);

    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
    }
}

function updateStatistics(data) {
    const total = data.length;
    const accepted = data.filter(d => d.status === 'Diterima').length;
    const rejected = data.filter(d => d.status === 'Ditolak').length;
    const pending = data.filter(d => d.status === 'Menunggu Verifikasi').length;

    const totalEl = document.getElementById('stat-total');
    const acceptedEl = document.getElementById('stat-accepted');
    const rejectedEl = document.getElementById('stat-rejected');
    const pendingEl = document.getElementById('stat-pending');

    if (totalEl) totalEl.innerText = total;
    if (acceptedEl) acceptedEl.innerText = accepted;
    if (rejectedEl) rejectedEl.innerText = rejected;
    if (pendingEl) pendingEl.innerText = pending;

    // Render visual graphs
    renderCharts(accepted, rejected, pending, data);
}

function renderCharts(accepted, rejected, pending, data) {
    const statusChartCanvas = document.getElementById('statusChart');
    if (statusChartCanvas) {
        const ctxStatus = statusChartCanvas.getContext('2d');
        if (statusChart) statusChart.destroy();

        statusChart = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Diterima', 'Ditolak', 'Menunggu'],
                datasets: [{
                    data: [accepted, rejected, pending],
                    backgroundColor: ['#16a34a', '#dc2626', '#ca8a04'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    const genderChartCanvas = document.getElementById('genderChart');
    if (genderChartCanvas) {
        const male = data.filter(d => d.jenis_kelamin === 'Laki-laki').length;
        const female = data.filter(d => d.jenis_kelamin === 'Perempuan').length;

        const ctxGender = genderChartCanvas.getContext('2d');
        if (genderChart) genderChart.destroy();

        genderChart = new Chart(ctxGender, {
            type: 'bar',
            data: {
                labels: ['Laki-laki', 'Perempuan'],
                datasets: [{
                    label: 'Jumlah Siswa',
                    data: [male, female],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

// --- Settings Logic (Open/Close Registration) ---
async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'registration_status')
            .single();

        if (data) {
            const isOpen = data.value === 'open';
            const toggle = document.getElementById('toggle-registration');
            if (toggle) {
                toggle.checked = isOpen;
                updateStatusLabel(isOpen);
            }
        }
    } catch (err) {
        console.warn('Error loading settings:', err);
    }
}

async function toggleRegistrationStatus(e) {
    const isOpen = e.target.checked;
    updateStatusLabel(isOpen);

    try {
        const { error } = await supabaseClient
            .from('app_settings')
            .upsert({
                key: 'registration_status',
                value: isOpen ? 'open' : 'closed'
            });

        if (error) throw error;

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });

        Toast.fire({
            icon: 'success',
            title: `Pendaftaran berhasil ${isOpen ? 'DIBUKA' : 'DITUTUP'}`
        });

    } catch (err) {
        console.error('Error updating status:', err);
        Swal.fire('Error', 'Gagal menyimpan pengaturan.', 'error');
        // Revert toggle
        e.target.checked = !isOpen;
        updateStatusLabel(!isOpen);
    }
}

function updateStatusLabel(isOpen) {
    const label = document.getElementById('status-label');
    if (!label) return;

    if (isOpen) {
        label.innerText = 'Buka';
        label.classList.remove('text-red-600');
        label.classList.add('text-green-600');
    } else {
        label.innerText = 'Tutup';
        label.classList.remove('text-green-600');
        label.classList.add('text-red-600');
    }
}
