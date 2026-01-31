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

    // 3. Load School Profile (Dynamic)
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'school_profile')
            .single();

        if (data && data.value) {
            const profile = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

            // Update Text
            if (profile.nama_sekolah) {
                document.title = `PPDB - ${profile.nama_sekolah}`;
                document.querySelectorAll('.school-name-text').forEach(el => el.innerText = profile.nama_sekolah);
                const navName = document.getElementById('nav-school-name');
                if (navName) navName.innerText = profile.nama_sekolah;
            }

            if (profile.alamat) {
                document.querySelectorAll('.school-address-text').forEach(el => el.innerText = profile.alamat);
            }

            // Update Logo if exists
            if (profile.logo_url) {
                const logoContainer = document.getElementById('nav-logo-container');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${profile.logo_url}" alt="Logo" class="w-full h-full object-cover rounded-xl">`;
                    logoContainer.classList.remove('bg-gradient-to-br'); // Remove default background
                }
            }
        }
    } catch (err) {
        console.warn('Gagal memuat profil sekolah:', err);
    }
});
