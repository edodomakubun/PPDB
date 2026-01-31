async function downloadBlankForm() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR PENDAFTARAN PESERTA DIDIK BARU', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text('SD INPRES LELINGLUAN', 105, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Contoh No. 123, Desa Lelingluan, Kec. Tanimbar Utara', 105, 34, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // Form Fields
    let yPos = 50;
    const lineHeight = 10;
    const lineLength = 100; // Length of the underline for filling
    const labelX = 20;
    const valueX = 70;

    const addField = (label, subtext = '') => {
        // Check page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(label, labelX, yPos);

        doc.setLineWidth(0.2);
        // Draw underline for filling
        doc.line(valueX, yPos + 1, valueX + lineLength, yPos + 1);

        if (subtext) {
            yPos += 5;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text(subtext, valueX, yPos);
            doc.setFontSize(10);
        }

        yPos += lineHeight;
    };

    const addSection = (title) => {
         if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setFillColor(230, 230, 230);
        doc.rect(20, yPos - 6, 170, 8, 'F');
        doc.text(title, 22, yPos);
        yPos += 12;
        doc.setFontSize(10);
    };

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
    addField('Pekerjaan Ayah');
    addField('Nama Ibu');
    addField('Pekerjaan Ibu');
    addField('No. HP / WA', '(Yang bisa dihubungi)');

    // C. PERNYATAAN
    yPos += 10;
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Dengan ini saya menyatakan bahwa data yang saya isikan di atas adalah benar dan dapat dipertanggungjawabkan.', 20, yPos);
    yPos += 5;
    doc.text('Saya bersedia mengikuti seluruh aturan dan prosedur penerimaan siswa baru di SD Inpres Lelingluan.', 20, yPos);

    // Signature
    yPos += 20;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.text(`Lelingluan, .................................... ${new Date().getFullYear()}`, 130, yPos);
    yPos += 25;
    doc.text('( ..................................................... )', 130, yPos);
    doc.text('Tanda Tangan Orang Tua/Wali', 130, yPos + 5, { align: 'left' });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text('Formulir ini dapat diunduh di website resmi PPDB SD Inpres Lelingluan.', 105, 290, { align: 'center' });
    }

    // Save
    doc.save('Formulir_Pendaftaran_SD_Inpres_Lelingluan.pdf');
}
