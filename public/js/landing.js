document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Scroll Animations
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

    // Share observer for dynamic content
    window.sharedObserver = observer;

    // 2. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('shadow-sm', 'bg-white/90');
            navbar.classList.remove('bg-white/80');
        } else {
            navbar.classList.remove('shadow-sm', 'bg-white/90');
            navbar.classList.add('bg-white/80');
        }
    });

    // 3. Load School Profile & Landing Content (Dynamic)
    loadDynamicContent();

    // 4. Load Gallery & FAQ
    loadGalleryPublic();
    loadFaqPublic();

    // 5. Dark Mode Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    // Initial Check
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        lightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        darkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', function() {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            }
        } else {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }
    });
});

async function loadGalleryPublic() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    const { data } = await supabaseClient
        .from('school_gallery')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

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
}

async function loadDynamicContent() {
    try {
        // Fetch School Profile & Landing Content
        const [profileRes, landingRes] = await Promise.all([
            supabaseClient.from('app_settings').select('value').eq('key', 'school_profile').single(),
            supabaseClient.from('landing_page_content').select('*')
        ]);

        // 1. School Profile
        if (profileRes.data && profileRes.data.value) {
            const profile = typeof profileRes.data.value === 'string' ? JSON.parse(profileRes.data.value) : profileRes.data.value;

            if (profile.nama_sekolah) {
                document.title = `PPDB - ${profile.nama_sekolah}`;
                document.querySelectorAll('.school-name-text').forEach(el => el.innerText = profile.nama_sekolah);
                const navName = document.getElementById('nav-school-name');
                if (navName) navName.innerText = profile.nama_sekolah;
            }
            if (profile.alamat) {
                document.querySelectorAll('.school-address-text').forEach(el => el.innerText = profile.alamat);
            }
            if (profile.logo_url) {
                const logoContainer = document.getElementById('nav-logo-container');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${profile.logo_url}" alt="Logo" class="w-full h-full object-cover rounded-xl">`;
                    logoContainer.classList.remove('bg-gradient-to-br');
                }
            }
        }

        // 2. Landing Content
        if (landingRes.data) {
            const content = {};
            landingRes.data.forEach(item => content[item.key] = item.value);

            // Hero
            if (content.hero_section) {
                const hero = content.hero_section;
                if (hero.badge) {
                    const badgeEl = document.getElementById('hero-badge-text');
                    if (badgeEl) badgeEl.innerText = hero.badge;
                }
                if (hero.title) {
                    const titleEl = document.getElementById('hero-title-text');
                    if (titleEl) titleEl.innerHTML = hero.title;
                }
                if (hero.subtitle) {
                    const subEl = document.getElementById('hero-subtitle-text');
                    if (subEl) subEl.innerHTML = hero.subtitle;
                }
            }

            // Features Header
            if (content.features_section && content.features_section.title) {
                const fTitle = document.getElementById('features-title-text');
                if (fTitle) fTitle.innerText = content.features_section.title;
            }

            // CTA
            if (content.cta_section) {
                const cta = content.cta_section;
                if (cta.title) {
                    const ctaT = document.getElementById('cta-title-text');
                    if (ctaT) ctaT.innerText = cta.title;
                }
                if (cta.subtitle) {
                    const ctaS = document.getElementById('cta-subtitle-text');
                    if (ctaS) ctaS.innerText = cta.subtitle;
                }
            }
        }

    } catch (err) {
        console.warn('Gagal memuat konten dinamis:', err);
    }
}

async function loadFaqPublic() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    const { data } = await supabaseClient
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true });

    if (data && data.length > 0) {
        container.innerHTML = '';
        data.forEach((item, index) => {
            const html = `
                <div class="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden fade-in-up" style="transition-delay: ${index * 50}ms">
                    <button onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" class="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none">
                        <span class="font-bold text-slate-800">${item.question}</span>
                        <svg class="w-5 h-5 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="hidden px-6 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100/50">
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
}
