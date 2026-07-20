document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    loadUsers();
});

async function loadUsers() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('admin_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTable(data);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Gagal memuat daftar panitia.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">Belum ada data panitia lain.</td></tr>';
        return;
    }

    data.forEach(user => {
        const date = new Date(user.created_at).toLocaleDateString('id-ID');
        const row = `
            <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${user.nama || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="user-form.html?id=${user.id}" class="text-blue-600 hover:text-blue-900 mr-3">Edit</a>
                    <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-900">Hapus</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

async function deleteUser(id) {
    // Note: Admin cannot delete Auth Users via Client API.
    // This function only deletes the Profile record.
    // The Auth User remains but won't show in list.

    const result = await Swal.fire({
        title: 'Hapus dari daftar?',
        text: "Ini hanya menghapus data dari daftar profil, bukan menghapus akun login (butuh akses database langsung).",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabaseClient
                .from('admin_profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logActivity('DELETE_USER', `Menghapus profil panitia ID: ${id}`);

            Swal.fire('Terhapus', 'Profil dihapus.', 'success');
            loadUsers();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}
