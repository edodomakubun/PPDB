document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.href = '../login.html';

    document.getElementById('user-email').innerText = session.user.email;
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    loadFaqs();
    initSortable();
});

async function loadFaqs() {
    try {
        const { data, error } = await supabaseClient
            .from('faqs')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        renderList(data);
    } catch (err) {
        console.error(err);
        document.getElementById('faq-list').innerHTML = '<div class="p-8 text-center text-red-500">Gagal memuat data.</div>';
    }
}

function renderList(data) {
    const container = document.getElementById('faq-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400">Belum ada FAQ.</div>';
        return;
    }

    data.forEach(item => {
        const row = `
            <div class="p-4 flex items-start justify-between group hover:bg-slate-50 transition" data-id="${item.id}">
                <div class="flex gap-4">
                    <div class="drag-handle mt-1 text-slate-300 hover:text-slate-500 cursor-move p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-sm">${item.question}</h3>
                        <p class="text-slate-600 text-sm mt-1 line-clamp-2">${item.answer}</p>
                    </div>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="editFaq('${item.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 bg-blue-50 rounded">Edit</button>
                    <button onclick="deleteFaq('${item.id}')" class="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 bg-red-50 rounded">Hapus</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', row);
    });
}

function initSortable() {
    const el = document.getElementById('faq-list');
    Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'ghost-class',
        onEnd: function () {
            document.getElementById('btn-save-order').classList.remove('hidden');
        }
    });
}

// Modal Logic
function openModal() {
    document.getElementById('modal-faq').classList.remove('hidden');
    document.getElementById('form-faq').reset();
    document.getElementById('faq-id').value = '';
    document.getElementById('modal-title').innerText = 'Tambah FAQ';
}

function closeModal() {
    document.getElementById('modal-faq').classList.add('hidden');
}

async function editFaq(id) {
    try {
        const { data } = await supabaseClient.from('faqs').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('faq-id').value = data.id;
            document.getElementById('faq-question').value = data.question;
            document.getElementById('faq-answer').value = data.answer;
            document.getElementById('modal-title').innerText = 'Edit FAQ';
            document.getElementById('modal-faq').classList.remove('hidden');
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function saveFaq() {
    const id = document.getElementById('faq-id').value;
    const question = document.getElementById('faq-question').value;
    const answer = document.getElementById('faq-answer').value;

    if (!question || !answer) return Swal.fire('Error', 'Semua field wajib diisi', 'error');

    try {
        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
        let error;

        if (id) {
            ({ error } = await supabaseClient.from('faqs').update({ question, answer }).eq('id', id));
        } else {
            // Get last order
            // Simplified: just insert with default order or count
            ({ error } = await supabaseClient.from('faqs').insert([{ question, answer, order_index: 999 }]));
        }

        if (error) throw error;

        await logActivity(id ? 'UPDATE_FAQ' : 'CREATE_FAQ', `Menyimpan FAQ: ${question}`);

        Swal.fire('Berhasil', 'FAQ tersimpan.', 'success');
        closeModal();
        loadFaqs();

    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    }
}

async function deleteFaq(id) {
    const confirm = await Swal.fire({
        title: 'Hapus FAQ?',
        text: "Data akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus'
    });

    if (confirm.isConfirmed) {
        try {
            const { error } = await supabaseClient.from('faqs').delete().eq('id', id);
            if (error) throw error;

            await logActivity('DELETE_FAQ', `Menghapus FAQ ID: ${id}`);
            loadFaqs();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

async function saveOrder() {
    const items = document.querySelectorAll('#faq-list > div');
    const updates = [];
    items.forEach((item, index) => {
        updates.push({ id: item.getAttribute('data-id'), order_index: index });
    });

    try {
        Swal.fire({ title: 'Menyimpan Urutan...', didOpen: () => Swal.showLoading() });
        const promises = updates.map(u => supabaseClient.from('faqs').update({ order_index: u.order_index }).eq('id', u.id));
        await Promise.all(promises);

        document.getElementById('btn-save-order').classList.add('hidden');
        Swal.fire('Berhasil', 'Urutan diperbarui.', 'success');
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}
