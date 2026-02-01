document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Scroll Animations (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach(el => {
        observer.observe(el);
    });

    // Share observer for dynamic content (Gallery/FAQ)
    window.sharedObserver = observer;

    // 2. Load Content
    loadSchoolProfile(); // Only Profile (Logo, Name)
    loadGalleryPublic();
    loadFaqPublic();
});

// --- Functions ---

async function loadSchoolProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'school_profile')
            .single();

        if (error) throw error;

        if (data && data.value) {
            const profile = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

            // Update Text
            if (profile.nama_sekolah) {
                // Only update if placeholder exists or logic requires it,
                // but for now we trust the hardcoded 'SD INPRES LELINGLUAN' matches unless DB says otherwise.
                // We'll update the specific classes/ids if they exist.
                document.querySelectorAll('.school-name-text').forEach(el => el.innerText = profile.nama_sekolah);
                const navName = document.getElementById('nav-school-name');
                if (navName) navName.innerText = profile.nama_sekolah;
            }
            if (profile.alamat) {
                document.querySelectorAll('.school-address-text').forEach(el => el.innerText = profile.alamat);
            }

            // Update Logo
            if (profile.logo_url) {
                const logoContainer = document.getElementById('nav-logo-container');
                if (logoContainer) {
                    // Replace the "SD" text div with an Image
                    logoContainer.innerHTML = `<img src="${profile.logo_url}" alt="Logo" class="w-full h-full object-cover rounded-xl">`;
                    logoContainer.classList.remove('bg-gradient-to-br');
                    logoContainer.classList.add('bg-transparent');
                }
            }
        }
    } catch (err) {
        console.warn('Gagal memuat profil sekolah:', err);
    }
}

async function loadGalleryPublic() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('school_gallery')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8);

        if (error) throw error;

        if (data && data.length > 0) {
            container.innerHTML = '';
            data.forEach(item => {
                const { data: publicUrlData } = supabaseClient.storage.from('gallery_images').getPublicUrl(item.image_url);
                const html = `
                    <div class="aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition transform hover:scale-105 group fade-in-up">
                        <img src="${publicUrlData.publicUrl}" class="w-full h-full object-cover group-hover:opacity-90 transition">
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });

            // Observe new elements
            if (window.sharedObserver) {
                container.querySelectorAll('.fade-in-up').forEach(el => window.sharedObserver.observe(el));
            }
        } else {
            container.innerHTML = '<div class="col-span-full text-center text-slate-400">Belum ada foto galeri.</div>';
        }
    } catch (err) {
        console.error('Error loading gallery:', err);
        container.innerHTML = '<div class="col-span-full text-center text-red-400">Gagal memuat galeri.</div>';
    }
}

async function loadFaqPublic() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('faqs')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            container.innerHTML = '';
            data.forEach((item, index) => {
                const html = `
                    <div class="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden fade-in-up" style="transition-delay: ${index * 50}ms">
                        <button onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" class="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none hover:bg-slate-100 transition">
                            <span class="font-bold text-slate-800">${item.question}</span>
                            <svg class="w-5 h-5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div class="hidden px-6 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100/50 bg-white">
                            ${item.answer}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });

            // Observe new elements
            if (window.sharedObserver) {
                container.querySelectorAll('.fade-in-up').forEach(el => window.sharedObserver.observe(el));
            }
        } else {
            container.innerHTML = '<div class="text-center text-slate-400">Belum ada FAQ.</div>';
        }
    } catch (err) {
        console.error('Error loading FAQ:', err);
        container.innerHTML = '<div class="text-center text-red-400">Gagal memuat FAQ.</div>';
    }
}
