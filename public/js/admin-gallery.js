document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.href = '../login.html';

    loadGallery();

    // File Upload Listener
    document.getElementById('file-upload').addEventListener('change', handleUpload);
});

async function loadGallery() {
    const container = document.getElementById('gallery-grid');

    try {
        const { data, error } = await supabaseClient
            .from('school_gallery')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">Belum ada foto.</div>';
            return;
        }

        // We need to sign URLs for display?
        // No, 'gallery_images' bucket is Public. We can construct public URL directly.
        // Or better, use getPublicUrl.

        data.forEach(item => {
            const { data: publicUrlData } = supabaseClient.storage.from('gallery_images').getPublicUrl(item.image_url);
            const url = publicUrlData.publicUrl;

            const card = `
                <div class="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <img src="${url}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button onclick="deleteImage('${item.id}', '${item.image_url}')" class="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg transform hover:scale-110 transition">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="col-span-full text-center text-red-500">Gagal memuat galeri.</div>';
    }
}

async function handleUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    Swal.fire({
        title: 'Mengupload...',
        html: `Memproses ${files.length} gambar.`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `gallery_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabaseClient.storage
                .from('gallery_images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Insert to DB
            const { error: dbError } = await supabaseClient
                .from('school_gallery')
                .insert([{ image_url: fileName }]);

            if (dbError) throw dbError;
        });

        await Promise.all(uploadPromises);

        await logActivity('UPLOAD_GALLERY', `Mengupload ${files.length} foto ke galeri.`);

        Swal.fire('Berhasil', 'Foto berhasil ditambahkan.', 'success');
        e.target.value = ''; // Reset input
        loadGallery();

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat upload.', 'error');
    }
}

async function deleteImage(id, path) {
    const confirm = await Swal.fire({
        title: 'Hapus Foto?',
        text: "Foto akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    });

    if (confirm.isConfirmed) {
        try {
            Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() });

            // 1. Delete from Storage
            const { error: storageError } = await supabaseClient.storage
                .from('gallery_images')
                .remove([path]);

            if (storageError) console.warn('Storage delete error:', storageError);

            // 2. Delete from DB
            const { error: dbError } = await supabaseClient
                .from('school_gallery')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            await logActivity('DELETE_GALLERY', `Menghapus foto ID: ${id}`);

            Swal.close();
            loadGallery();

        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}
