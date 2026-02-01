let quills = {};
let sourceModes = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.href = '../login.html';

    document.getElementById('user-email').innerText = session.user.email;
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../login.html';
    });

    // Initialize Quills
    initQuill('hero-title');
    initQuill('hero-subtitle');

    // Load Data
    loadLandingContent();

    // Submit Handler
    document.getElementById('form-landing').addEventListener('submit', saveLandingContent);
});

function initQuill(id) {
    quills[id] = new Quill(`#editor-${id}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    });
    sourceModes[id] = false;
}

function toggleSource(id) {
    const editorContainer = document.getElementById(`editor-${id}`);
    const sourceTextarea = document.getElementById(`source-${id}`);
    const toolbar = editorContainer.parentElement.querySelector('.ql-toolbar');

    sourceModes[id] = !sourceModes[id];

    if (sourceModes[id]) {
        // Show Source
        sourceTextarea.value = quills[id].root.innerHTML;
        editorContainer.classList.add('hidden');
        if(toolbar) toolbar.classList.add('hidden');
        sourceTextarea.classList.remove('hidden');
    } else {
        // Show Editor
        quills[id].clipboard.dangerouslyPasteHTML(sourceTextarea.value);
        sourceTextarea.classList.add('hidden');
        editorContainer.classList.remove('hidden');
        if(toolbar) toolbar.classList.remove('hidden');
    }
}

async function loadLandingContent() {
    try {
        const { data, error } = await supabaseClient.from('landing_page_content').select('*');
        if (error) throw error;

        // Convert array to object
        const content = {};
        data.forEach(item => content[item.key] = item.value);

        // Hero Section
        if (content.hero_section) {
            document.getElementById('hero-badge').value = content.hero_section.badge || '';
            quills['hero-title'].root.innerHTML = content.hero_section.title || '';
            quills['hero-subtitle'].root.innerHTML = content.hero_section.subtitle || '';
        }

        // Features
        if (content.features_section) {
            document.getElementById('features-title').value = content.features_section.title || '';
        }

        // CTA
        if (content.cta_section) {
            document.getElementById('cta-title').value = content.cta_section.title || '';
            document.getElementById('cta-subtitle').value = content.cta_section.subtitle || '';
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memuat konten.', 'error');
    }
}

async function saveLandingContent(e) {
    e.preventDefault();
    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

    // Sync source views first
    Object.keys(sourceModes).forEach(id => {
        if (sourceModes[id]) {
            quills[id].clipboard.dangerouslyPasteHTML(document.getElementById(`source-${id}`).value);
        }
    });

    const heroBadge = document.getElementById('hero-badge').value;
    const heroTitle = quills['hero-title'].root.innerHTML;
    const heroSubtitle = quills['hero-subtitle'].root.innerHTML;

    const featuresTitle = document.getElementById('features-title').value;

    const ctaTitle = document.getElementById('cta-title').value;
    const ctaSubtitle = document.getElementById('cta-subtitle').value;

    const updates = [
        {
            key: 'hero_section',
            value: { badge: heroBadge, title: heroTitle, subtitle: heroSubtitle }
        },
        {
            key: 'features_section',
            value: { title: featuresTitle, subtitle: '' } // Subtitle hardcoded in HTML for now or add field
        },
        {
            key: 'cta_section',
            value: { title: ctaTitle, subtitle: ctaSubtitle }
        }
    ];

    try {
        const promises = updates.map(item =>
            supabaseClient.from('landing_page_content').upsert(item)
        );

        await Promise.all(promises);

        await logActivity('UPDATE_LANDING', 'Memperbarui konten halaman depan');

        Swal.fire('Berhasil', 'Konten berhasil diperbarui.', 'success');

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', err.message, 'error');
    }
}
