/**
 * Fungsi untuk mengunduh formulir pendaftaran kosong (PDF)
 * Ukuran: F4 (210mm x 330mm), 1 Halaman
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
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR PENDAFTARAN PESERTA DIDIK BARU', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text('SD INPRES LELINGLUAN', 105, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Wearnusmurin, Desa Lelingluan, Kec. Tanimbar Utara', 105, 34, { align: 'center' });

    // Garis Bawah Header
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // ================= FORM CONFIG =================
    let yPos = 50;
    const lineHeight = 10;
    const lineLength = 100; // Panjang garis bawah untuk isian
    const labelX = 20;
    const valueX = 70;

    // Fungsi Helper: Membuat baris isian
    const addField = (label, subtext = '') => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, labelX, yPos);

        doc.setLineWidth(0.2);
        // Menggambar garis titik-titik/lurus untuk tempat mengisi
        doc.line(valueX, yPos + 1, valueX + lineLength, yPos + 1);

        // Menambahkan teks bantuan kecil di bawah garis (jika ada)
        if (subtext) {
            yPos += 5;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text(subtext, valueX, yPos);
            doc.setFontSize(10); // Kembalikan ukuran font
        }

        yPos += lineHeight;
    };

    // Fungsi Helper: Membuat judul blok/seksi
    const addSection = (title) => {
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setFillColor(230, 230, 230); // Warna latar abu-abu
        doc.rect(20, yPos - 6, 170, 8, 'F'); // Kotak latar
        doc.text(title, 22, yPos);
        yPos += 12;
        doc.setFontSize(10);
    };

    // Fungsi Helper: Membuat kotak centang (Checkbox)
    const addCheckbox = (label) => {
        doc.setLineWidth(0.3);
        doc.rect(25, yPos - 3, 4, 4); // Gambar kotak 4x4 mm
        doc.setFont('helvetica', 'normal');
        doc.text(label, 32, yPos);
        yPos += 8; // Jarak antar baris kotak centang
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
    yPos += 5;
    addSection('B. DATA ORANG TUA / WALI');
    addField('Nama Ayah');
    addField('Tahun Lahir Ayah', '(YYYY)');
    addField('Pekerjaan Ayah');
    addField('Nama Ibu');
    addField('Tahun Lahir Ibu', '(YYYY)');
    addField('Pekerjaan Ibu');
    addField('No. HP / WA', '(Yang bisa dihubungi)');

    // C. LAMPIRAN YANG DISERTAKAN
    yPos += 5;
    addSection('C. LAMPIRAN YANG TERSEDIA');
    addCheckbox('Kartu Keluarga');
    addCheckbox('Akte Kelahiran');

    // D. PERNYATAAN
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Dengan ini saya menyatakan bahwa data yang saya isikan di atas adalah benar dan dapat dipertanggungjawabkan.', 20, yPos);
    
    yPos += 5;
    doc.text('Saya bersedia mengikuti seluruh aturan dan prosedur penerimaan siswa baru di SD Inpres Lelingluan.', 20, yPos);

    // ================= TANDA TANGAN =================
    yPos += 20;
    const currentYear = new Date().getFullYear();
    
    // Rata kanan untuk tanda tangan
    doc.text(`Lelingluan, .................................... ${currentYear}`, 130, yPos);
    
    yPos += 25; // Jarak ruang tanda tangan
    doc.text('( ..................................................... )', 130, yPos);
    
    yPos += 5;
    doc.text('Tanda Tangan Orang Tua/Wali', 130, yPos);

    // ================= FOOTER =================
    doc.setFontSize(8);
    // Kertas F4 memiliki tinggi 330mm, kita posisikan footer di Y=320 (10mm dari bawah)
    doc.text('Formulir ini dapat diunduh di website resmi PPDB SD Inpres Lelingluan.', 105, 320, { align: 'center' });

    // ================= SIMPAN PDF =================
    doc.save('Formulir_Pendaftaran_SD_Inpres_Lelingluan.pdf');
}
