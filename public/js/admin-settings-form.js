let fields = [];
let sortable = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.href = '../login.html';

    // 2. Load Fields
    await loadFields();

    // 3. Init Sortable
    initSortable();

    // 4. Modal Event Listeners
    document.getElementById('field-type').addEventListener('change', toggleOptionsInput);
});

async function loadFields() {
    try {
        const { data, error } = await supabaseClient
            .from('form_fields')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;

        fields = data;
        renderEditor(fields);
        renderPreview(fields);

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memuat field formulir.', 'error');
    }
}

function initSortable() {
    const el = document.getElementById('field-list');
    sortable = Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'ghost-class',
        onEnd: function (evt) {
            // Show save button
            document.getElementById('btn-save-order').classList.remove('hidden');
        }
    });
}

function renderEditor(data) {
    const container = document.getElementById('field-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400">Belum ada field.</div>';
        return;
    }

    data.forEach(field => {
        const badgeColor = field.required ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500';
        const sectionBadge = {
            'identity': 'bg-blue-50 text-blue-600',
            'parents': 'bg-purple-50 text-purple-600',
            'files': 'bg-yellow-50 text-yellow-600',
            'custom': 'bg-gray-50 text-gray-600'
        }[field.section] || 'bg-gray-50 text-gray-600';

        const item = `
            <div class="p-4 flex items-center justify-between group hover:bg-slate-50 transition" data-id="${field.id}">
                <div class="flex items-center gap-3">
                    <div class="drag-handle text-slate-400 hover:text-slate-600 cursor-move">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                    </div>
                    <div>
                        <div class="font-medium text-slate-800 text-sm">${field.label}</div>
                        <div class="flex gap-2 mt-1">
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${badgeColor}">${field.required ? 'Wajib' : 'Opsional'}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${sectionBadge}">${field.section}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">${field.type}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="editField('${field.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100">Edit</button>
                    <button onclick="deleteField('${field.id}')" class="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 bg-red-50 rounded hover:bg-red-100">Hapus</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', item);
    });
}

function renderPreview(data) {
    const container = document.getElementById('preview-container');
    container.innerHTML = '';

    // Group by section
    const sections = {
        'identity': 'Data Pribadi',
        'parents': 'Data Orang Tua',
        'files': 'Berkas Lampiran',
        'custom': 'Tambahan'
    };

    Object.keys(sections).forEach(key => {
        const sectionFields = data.filter(f => f.section === key);
        if (sectionFields.length > 0) {
            let sectionHTML = `
                <div class="mb-6 border-b border-slate-100 pb-2">
                    <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">${sections[key]}</h3>
                </div>
                <div class="space-y-4">
            `;

            sectionFields.forEach(field => {
                let inputHTML = '';
                const commonClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white";

                if (field.type === 'textarea') {
                    inputHTML = `<textarea class="${commonClass}" rows="2" placeholder="${field.label}..."></textarea>`;
                } else if (field.type === 'select') {
                    const options = field.options ? field.options.split(',') : [];
                    const optsHTML = options.map(o => `<option>${o.trim()}</option>`).join('');
                    inputHTML = `<select class="${commonClass}"><option>Pilih...</option>${optsHTML}</select>`;
                } else if (field.type === 'file') {
                    inputHTML = `<input type="file" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">`;
                } else {
                    inputHTML = `<input type="${field.type}" class="${commonClass}" placeholder="${field.label}">`;
                }

                sectionHTML += `
                    <div>
                        <label class="block text-xs font-medium text-slate-700 mb-1">
                            ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                        </label>
                        ${inputHTML}
                    </div>
                `;
            });

            sectionHTML += `</div>`;
            container.insertAdjacentHTML('beforeend', sectionHTML);
        }
    });
}


// --- Modal & Form Logic ---

function openFieldModal(editId = null) {
    const modal = document.getElementById('modal-field');
    const form = document.getElementById('form-field');
    form.reset();

    if (editId) {
        const field = fields.find(f => f.id === editId);
        document.getElementById('modal-title').innerText = 'Edit Pertanyaan';
        document.getElementById('field-id').value = field.id;
        document.getElementById('field-label').value = field.label;
        document.getElementById('field-type').value = field.type;
        document.getElementById('field-section').value = field.section;
        document.getElementById('field-required').checked = field.required;
        if (field.options) document.getElementById('field-options').value = field.options;
    } else {
        document.getElementById('modal-title').innerText = 'Tambah Pertanyaan';
        document.getElementById('field-id').value = '';
    }

    toggleOptionsInput();
    modal.classList.remove('hidden');
}

function closeFieldModal() {
    document.getElementById('modal-field').classList.add('hidden');
}

function toggleOptionsInput() {
    const type = document.getElementById('field-type').value;
    const container = document.getElementById('options-container');
    if (type === 'select') container.classList.remove('hidden');
    else container.classList.add('hidden');
}

async function saveField() {
    const id = document.getElementById('field-id').value;
    const label = document.getElementById('field-label').value;
    const type = document.getElementById('field-type').value;
    const section = document.getElementById('field-section').value;
    const required = document.getElementById('field-required').checked;
    const options = document.getElementById('field-options').value;

    if (!label) return Swal.fire('Error', 'Label wajib diisi', 'error');

    // Auto-generate name key (slugify) if new
    // Note: We don't change 'name' for existing fields to avoid breaking data mapping?
    // Actually, for custom fields, we rely on name to store in JSON.
    // Let's keep it simple: generate name from label only for new.
    let name = id ? fields.find(f => f.id === id).name : label.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const payload = {
        label,
        type,
        section,
        required,
        options: type === 'select' ? options : null,
        name
    };

    // If new, add order index (last)
    if (!id) {
        payload.order_index = fields.length + 1;
    }

    try {
        Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

        let result;
        if (id) {
            result = await supabaseClient.from('form_fields').update(payload).eq('id', id);
        } else {
            result = await supabaseClient.from('form_fields').insert([payload]);
        }

        if (result.error) throw result.error;

        await logActivity('SAVE_FORM_FIELD', `Menyimpan pertanyaan formulir: ${label}`);

        Swal.fire('Berhasil', 'Pertanyaan berhasil disimpan.', 'success');
        closeFieldModal();
        loadFields();

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.message, 'error');
    }
}

async function deleteField(id) {
    const confirm = await Swal.fire({
        title: 'Hapus Field?',
        text: "Data yang sudah masuk mungkin tidak akan tampil dengan benar jika field dihapus.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus'
    });

    if (confirm.isConfirmed) {
        try {
            const { error } = await supabaseClient.from('form_fields').delete().eq('id', id);
            if (error) throw error;

            await logActivity('DELETE_FORM_FIELD', `Menghapus pertanyaan formulir ID: ${id}`);

            loadFields();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

function editField(id) {
    openFieldModal(id);
}

async function saveOrder() {
    // Get new order from DOM
    const items = document.querySelectorAll('#field-list > div');
    const updates = [];

    items.forEach((item, index) => {
        const id = item.getAttribute('data-id');
        updates.push({ id, order_index: index + 1 });
    });

    // Batch update is tricky in Supabase without RPC or multiple requests.
    // We will loop (simple for small list).
    try {
        Swal.fire({ title: 'Menyimpan Urutan...', didOpen: () => Swal.showLoading() });

        // Use Promise.all
        const promises = updates.map(u =>
            supabaseClient.from('form_fields').update({ order_index: u.order_index }).eq('id', u.id)
        );

        await Promise.all(promises);

        document.getElementById('btn-save-order').classList.add('hidden');
        Swal.fire('Tersimpan', 'Urutan berhasil diperbarui.', 'success');
        loadFields(); // Refresh to ensure sync

    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}
