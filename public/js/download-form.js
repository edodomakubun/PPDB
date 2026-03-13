/**
 * Fungsi untuk mengunduh formulir pendaftaran kosong (PDF)
 * Ukuran: F4 (210mm x 330mm), 1 Halaman Pas (Compact)
 * Membutuhkan library: jsPDF (https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js)
 */
async function downloadBlankForm() {
    // Pastikan jsPDF sudah dimuat di window
    if (!window.jspdf) {
        alert("Library jsPDF belum dimuat!");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    // Mengatur ukuran kertas menjadi F4 (Lebar: 210mm, Tinggi: 330mm)
    const doc = new jsPDF('p', 'mm', [210, 330]);

    // ================= HEADER =================
    try {
        // Memuat logo dari URL dan mengubahnya ke format Base64
        const logoUrl = 'https://pub-d21d85ef279e4275a4416a7e2920af41.r2.dev/pngegg%20(1).png';
        
        // Fungsi untuk mengubah gambar eksternal menjadi Base64 via Canvas
        const getBase64Image = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; // Penting untuk mengatasi CORS
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    // Ekspor ke format data URL (Base64)
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = (error) => reject(error);
                img.src = url;
            });
        };

        const logoBase64 = await getBase64Image(logoUrl);
        
        // Menambahkan gambar ke PDF (Format, X, Y, Lebar, Tinggi)
        doc.addImage(logoBase64, 'PNG', 20, 10, 20, 20);
    } catch (error) {
        console.warn("Gagal memuat logo untuk PDF. Melanjutkan tanpa logo...", error);
        // Alert opsional agar Anda tahu jika gambar diblokir oleh server (CORS)
        // alert("Logo tidak dapat dimuat karena kebijakan CORS dari server R2.");
    }

    doc.setFontSize(14); // Diperkecil dari 16
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR PENDAFTARAN PESERTA DIDIK BARU', 105, 15, { align: 'center' }); // Naik ke Y=15

    doc.setFontSize(12); // Diperkecil dari 14
    doc.text('SD INPRES LELINGLUAN', 105, 22, { align: 'center' });

    doc.setFontSize(9); // Diperkecil dari 10
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Wearnusmurin, Desa Lelingluan, Kec. Tanimbar Utara', 105, 27, { align: 'center' });

    // Garis Bawah Header
    doc.setLineWidth(0.5);
    doc.line(20, 31, 190, 31);

    // ================= FORM CONFIG =================
    let yPos = 40; // Naik dari 50 agar lebih hemat ruang atas
    const lineLength = 100; // Panjang garis bawah untuk isian
    const labelX = 20;
    const valueX = 70;

    // Fungsi Helper: Membuat baris isian (Lebih padat)
    const addField = (label, subtext = '') => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9); // Ukuran font label
        doc.text(label, labelX, yPos);

        doc.setLineWidth(0.2);
        // Menggambar garis lurus untuk tempat mengisi
        doc.line(valueX, yPos + 1, valueX + lineLength, yPos + 1);

        // Menambahkan teks bantuan kecil di bawah garis (jika ada)
        if (subtext) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7); // Font bantuan lebih kecil
            doc.text(subtext, valueX, yPos + 4.5); // Posisi tepat di bawah garis
            yPos += 12; // Spasi baris dengan subtext
        } else {
            yPos += 8; // Spasi baris normal (lebih rapat)
        }
    };

    // Fungsi Helper: Membuat judul blok/seksi
    const addSection = (title) => {
        yPos += 3; // Jarak antar seksi diperkecil
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10); // Font seksi diperkecil dari 11
        doc.setFillColor(230, 230, 230); // Warna latar abu-abu
        doc.rect(20, yPos - 5, 170, 7, 'F'); // Kotak latar lebih tipis
        doc.text(title, 22, yPos);
        yPos += 9; // Jarak setelah judul seksi
    };

    // Fungsi Helper: Membuat kotak centang (Checkbox)
    const addCheckbox = (label) => {
        doc.setLineWidth(0.3);
        doc.rect(25, yPos - 3, 4, 4); // Gambar kotak 4x4 mm
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(label, 32, yPos);
        yPos += 6.5; // Jarak antar baris kotak centang diperapat
    };

    // ================= KONTEN FORMULIR =================

    // A. DATA SISWA
    addSection('A. DATA PRIBADI SISWA');
    addField('Nama Lengkap', '(Sesuai Akta Kelahiran)');
    addField('NIK', '(Nomor Induk Kependudukan)');
    addField('Tempat Lahir');
    addField('Tanggal Lahir', '(DD/MM/YYYY)');
    addField('Jenis Kelamin', '(L/P)');
    addField('Agama');
    addField('Alamat Lengkap');
    addField('Asal Sekolah', '(TK / PAUD / RA)');

    // B. DATA ORANG TUA
    addSection('B. DATA ORANG TUA / WALI');
    addField('Nama Ayah');
    addField('Tahun Lahir Ayah', '(YYYY)');
    addField('Pekerjaan Ayah');
    addField('Nama Ibu');
    addField('Tahun Lahir Ibu', '(YYYY)');
    addField('Pekerjaan Ibu');
    addField('No. HP / WA', '(Yang bisa dihubungi)');

    // C. LAMPIRAN YANG DISERTAKAN
    addSection('C. LAMPIRAN YANG TERSEDIA');
    addCheckbox('Kartu Keluarga');
    addCheckbox('Akte Kelahiran');

    // D. PERNYATAAN
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5); // Sedikit lebih kecil agar muat
    doc.text('Dengan ini saya menyatakan bahwa data yang saya isikan di atas adalah benar dan dapat dipertanggungjawabkan.', 20, yPos);
    
    yPos += 4.5;
    doc.text('Saya bersedia mengikuti seluruh aturan dan prosedur penerimaan siswa baru di SD Inpres Lelingluan.', 20, yPos);

    // ================= TANDA TANGAN =================
    yPos += 15; // Jarak menuju tanda tangan dikurangi
    const currentYear = new Date().getFullYear();
    
    // Rata kiri-kanan (Posisi tanda tangan di kanan)
    doc.text(`Lelingluan, .................................... ${currentYear}`, 130, yPos);
    
    yPos += 18; // Ruang kosong untuk tanda tangan basah (cukup untuk F4)
    doc.text('( ..................................................... )', 130, yPos);
    
    yPos += 4;
    doc.text('Tanda Tangan Orang Tua/Wali', 130, yPos);

    // ================= FOOTER =================
    doc.setFontSize(8);
    // Posisi footer di Y=320 (10mm dari batas bawah kertas F4)
    doc.text('Formulir ini dapat diunduh di website resmi PPDB SD Inpres Lelingluan | sdinpreslelingluan-ppdb.pages.dev.', 105, 320, { align: 'center' });

    // ================= SIMPAN PDF =================
    doc.save('Formulir_Pendaftaran_SD_Inpres_Lelingluan.pdf');
}
