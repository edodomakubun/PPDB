let allData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Admin Session)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Initial Data Load
    await loadData();
});

async function loadData() {
    try {
        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data;

        // Update Dashboard Stats & Tables
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

    // Update Cards
    const totalEl = document.getElementById('stat-total');
    const acceptedEl = document.getElementById('stat-accepted');
    const rejectedEl = document.getElementById('stat-rejected');
    const pendingEl = document.getElementById('stat-pending');

    if (totalEl) totalEl.innerText = total;
    if (acceptedEl) acceptedEl.innerText = accepted;
    if (rejectedEl) rejectedEl.innerText = rejected;
    if (pendingEl) pendingEl.innerText = pending;

    // Calculate Percentages for Status
    const pctAccepted = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const pctRejected = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const pctPending = total > 0 ? Math.round((pending / total) * 100) : 0;

    // Update Status Table
    const tblAccepted = document.getElementById('tbl-accepted');
    const pctAcceptedEl = document.getElementById('pct-accepted');
    const tblRejected = document.getElementById('tbl-rejected');
    const pctRejectedEl = document.getElementById('pct-rejected');
    const tblPending = document.getElementById('tbl-pending');
    const pctPendingEl = document.getElementById('pct-pending');

    if (tblAccepted) tblAccepted.innerText = accepted;
    if (pctAcceptedEl) pctAcceptedEl.innerText = `${pctAccepted}%`;
    if (tblRejected) tblRejected.innerText = rejected;
    if (pctRejectedEl) pctRejectedEl.innerText = `${pctRejected}%`;
    if (tblPending) tblPending.innerText = pending;
    if (pctPendingEl) pctPendingEl.innerText = `${pctPending}%`;

    // Calculate Gender Statistics
    const male = data.filter(d => d.jenis_kelamin === 'Laki-laki').length;
    const female = data.filter(d => d.jenis_kelamin === 'Perempuan').length;

    const pctMale = total > 0 ? Math.round((male / total) * 100) : 0;
    const pctFemale = total > 0 ? Math.round((female / total) * 100) : 0;

    // Update Gender Table
    const tblMale = document.getElementById('tbl-male');
    const pctMaleEl = document.getElementById('pct-male');
    const tblFemale = document.getElementById('tbl-female');
    const pctFemaleEl = document.getElementById('pct-female');

    if (tblMale) tblMale.innerText = male;
    if (pctMaleEl) pctMaleEl.innerText = `${pctMale}%`;
    if (tblFemale) tblFemale.innerText = female;
    if (pctFemaleEl) pctFemaleEl.innerText = `${pctFemale}%`;
}
