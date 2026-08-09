/**
 * AI OCR Engine for Kartu Keluarga (KK) Extraction
 * Uses Google Gemini Vision API (Supports Images & PDF Documents with High-Precision Table 1 & Table 2 Parsing)
 * Standardized Database Code Mappings (Agama, Pekerjaan, Pendidikan, Kode Wilayah)
 */

const OCR_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    FALLBACK_MODEL: 'gemini-1.5-flash',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
};

const LOOKUP_CODES = {
    AGAMA: {
        '1': 'Islam',
        '2': 'Kristen',
        '3': 'Katholik',
        '4': 'Hindu',
        '5': 'Budha',
        '6': 'Khonghucu',
        '7': 'Kepercayaan kpd Tuhan YME',
        '99': 'Lainnya'
    },
    PENDIDIKAN: {
        '0': 'Tidak sekolah',
        '1': 'PAUD',
        '2': 'TK / sederajat',
        '3': 'Putus SD',
        '4': 'SD / sederajat',
        '5': 'SMP / sederajat',
        '6': 'SMA / sederajat',
        '7': 'Paket A',
        '8': 'Paket B',
        '9': 'Paket C',
        '20': 'D1',
        '21': 'D2',
        '22': 'D3',
        '23': 'D4',
        '30': 'S1',
        '31': 'Profesi',
        '32': 'Sp-1',
        '35': 'S2'
    },
    PEKERJAAN: {
        '1': 'Tidak bekerja',
        '2': 'Nelayan',
        '3': 'Petani',
        '4': 'Peternak',
        '5': 'PNS/TNI/Polri',
        '6': 'Karyawan Swasta',
        '7': 'Pedagang Kecil',
        '8': 'Pedagang Besar',
        '9': 'Wiraswasta',
        '10': 'Wirausaha',
        '11': 'Buruh',
        '12': 'Pensiunan',
        '13': 'Tenaga Kerja Indonesia',
        '14': 'Karyawan BUMN',
        '90': 'Tidak dapat diterapkan',
        '98': 'Sudah Meninggal',
        '99': 'Lainnya'
    },
    WILAYAH: {
        '210405AA': 'Lelingluan - Kec. Tanimbar Utara - Kab. Kepulauan Tanimbar'
    }
};

function mapAgamaToCode(val) {
    if (!val) return '99';
    const str = String(val).trim().toLowerCase();
    if (LOOKUP_CODES.AGAMA[str]) return str;
    if (str.includes('islam')) return '1';
    if (str.includes('kristen')) return '2';
    if (str.includes('katolik') || str.includes('katholik')) return '3';
    if (str.includes('hindu')) return '4';
    if (str.includes('budha') || str.includes('buddha')) return '5';
    if (str.includes('khonghucu') || str.includes('konghucu')) return '6';
    if (str.includes('tuhan') || str.includes('kepercayaan')) return '7';
    return '99';
}

function mapPekerjaanToCode(val) {
    if (!val) return '1';
    const str = String(val).trim().toLowerCase();
    if (LOOKUP_CODES.PEKERJAAN[str]) return str;
    if (str.includes('tidak') || str.includes('belum') || str.includes('rumah tangga')) return '1';
    if (str.includes('nelayan') || str.includes('perikanan')) return '2';
    if (str.includes('petani') || str.includes('pekebun')) return '3';
    if (str.includes('peternak')) return '4';
    if (str.includes('pns') || str.includes('tni') || str.includes('polri') || str.includes('negeri')) return '5';
    if (str.includes('karyawan swasta') || str.includes('swasta')) return '6';
    if (str.includes('pedagang kecil') || str.includes('dagang')) return '7';
    if (str.includes('pedagang besar')) return '8';
    if (str.includes('wiraswasta')) return '9';
    if (str.includes('wirausaha')) return '10';
    if (str.includes('buruh')) return '11';
    if (str.includes('pensiun')) return '12';
    if (str.includes('tki') || str.includes('tenaga kerja indonesia')) return '13';
    if (str.includes('bumn')) return '14';
    if (str.includes('meninggal')) return '98';
    return '99';
}

function mapPendidikanToCode(val) {
    if (!val) return '0';
    const str = String(val).trim().toLowerCase();
    if (LOOKUP_CODES.PENDIDIKAN[str]) return str;
    if (str.includes('tidak') || str.includes('belum')) return '0';
    if (str.includes('paud')) return '1';
    if (str.includes('tk')) return '2';
    if (str.includes('putus')) return '3';
    if (str.includes('smp') || str.includes('sltp')) return '5';
    if (str.includes('sma') || str.includes('slta') || str.includes('smk')) return '6';
    if (str.includes('sd') || str.includes('sederajat')) return '4';
    if (str.includes('paket a')) return '7';
    if (str.includes('paket b')) return '8';
    if (str.includes('paket c')) return '9';
    if (str.includes('d1') || str.includes('diploma i')) return '20';
    if (str.includes('d2') || str.includes('diploma ii')) return '21';
    if (str.includes('d3') || str.includes('diploma iii')) return '22';
    if (str.includes('d4') || str.includes('diploma iv')) return '23';
    if (str.includes('s1') || str.includes('strata i') || str.includes('sarjana')) return '30';
    if (str.includes('profesi')) return '31';
    if (str.includes('sp-1') || str.includes('sp1')) return '32';
    if (str.includes('s2') || str.includes('strata ii') || str.includes('magister')) return '35';
    return '0';
}

function formatCodeLabel(category, code) {
    const dict = LOOKUP_CODES[category];
    if (!dict) return code || '';
    const label = dict[code];
    return label ? `${code} (${label})` : code;
}

/**
 * Get Gemini API Key from Supabase app_settings or localStorage
 */
async function getGeminiApiKey() {
    try {
        let localKey = localStorage.getItem('gemini_api_key');
        if (localKey && localKey.trim() !== '') {
            return localKey.trim();
        }

        if (typeof supabaseClient !== 'undefined') {
            const { data } = await supabaseClient
                .from('app_settings')
                .select('value')
                .eq('key', 'gemini_api_key')
                .maybeSingle();

            if (data && data.value) {
                const keyVal = typeof data.value === 'string' ? data.value : (data.value.api_key || data.value);
                if (keyVal && keyVal.trim() !== '') {
                    localStorage.setItem('gemini_api_key', keyVal.trim());
                    return keyVal.trim();
                }
            }
        }
    } catch (err) {
        console.warn('Gagal mengambil API Key dari Supabase:', err);
    }
    return null;
}

/**
 * Save Gemini API Key to Supabase app_settings & localStorage
 */
async function saveGeminiApiKey(apiKey) {
    if (!apiKey) return false;
    const cleanKey = apiKey.trim();
    localStorage.setItem('gemini_api_key', cleanKey);

    if (typeof supabaseClient !== 'undefined') {
        try {
            await supabaseClient
                .from('app_settings')
                .upsert({
                    key: 'gemini_api_key',
                    value: cleanKey
                });
        } catch (err) {
            console.warn('Gagal menyimpan API Key ke Supabase:', err);
        }
    }
    return true;
}

/**
 * Convert File object to Base64 Data String & MimeType
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64Data = result.split(',')[1];
            resolve({
                base64: base64Data,
                mimeType: file.type || 'image/jpeg'
            });
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Convert Image or PDF File to Base64 (Render first page of PDF if PDF.js is available at 3.0x Ultra-HD resolution)
 */
async function processFileForGemini(fileOrBlob) {
    const fileName = fileOrBlob.name || '';
    const isPdf = fileOrBlob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
        if (typeof pdfjsLib !== 'undefined') {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const arrayBuffer = await fileOrBlob.arrayBuffer();
                const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdfDocument.getPage(1);
                
                // 3.0x scale for ultra-clear text & table row alignment
                const viewport = page.getViewport({ scale: 3.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                return {
                    base64: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg'
                };
            } catch (err) {
                console.warn('Gagal merender PDF via PDF.js, akan menggunakan payload PDF langsung ke Gemini:', err);
            }
        }
        
        const rawPdfData = await fileToBase64(fileOrBlob);
        return {
            base64: rawPdfData.base64,
            mimeType: 'application/pdf'
        };
    }

    return await fileToBase64(fileOrBlob);
}

/**
 * Prompt user/admin for Gemini API Key if missing
 */
async function promptForApiKey() {
    const { value: apiKey } = await Swal.fire({
        title: '🔑 Konfigurasi Gemini API Key',
        html: `
            <div class="text-left text-sm text-slate-600 space-y-3">
                <p>Fitur AI OCR membutuhkan <strong>Google Gemini API Key</strong> untuk membaca Kartu Keluarga secara akurat.</p>
                <p>Anda dapat memperoleh API Key secara <strong>GRATIS</strong> dari Google AI Studio:</p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" class="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:underline text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    Buka Google AI Studio (Gratis)
                </a>
            </div>
        `,
        input: 'password',
        inputLabel: 'Masukkan Gemini API Key:',
        inputPlaceholder: 'AIzaSy...',
        showCancelButton: true,
        confirmButtonText: 'Simpan & Lanjutkan OCR',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value || value.trim().length < 10) {
                return 'API Key harus diisi dengan benar!';
            }
        }
    });

    if (apiKey) {
        await saveGeminiApiKey(apiKey);
        return apiKey.trim();
    }
    return null;
}

/**
 * Process Kartu Keluarga Image/PDF with Gemini AI OCR
 * @param {File} imageFile 
 * @param {string} overrideApiKey 
 * @param {string} studentName 
 * @returns {Promise<Object>} Extracted KK data object with standardized code conversions
 */
async function processKartuKeluargaOCR(imageFile, overrideApiKey = null, studentName = null) {
    if (!imageFile) {
        throw new Error('Berkas dokumen KK tidak ditemukan.');
    }

    const fileName = imageFile.name || '';
    const isImage = imageFile.type.startsWith('image/');
    const isPdf = imageFile.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
        throw new Error('Format berkas tidak didukung. Silakan gunakan foto/scan gambar (JPG, PNG, WEBP) atau dokumen PDF.');
    }

    let apiKey = overrideApiKey || await getGeminiApiKey();
    if (!apiKey) {
        apiKey = await promptForApiKey();
        if (!apiKey) {
            throw new Error('Proses OCR dibatalkan karena Gemini API Key belum dikonfigurasi.');
        }
    }

    // Convert file or PDF to base64 payload
    const fileData = await processFileForGemini(imageFile);

    const cleanStudentName = studentName && typeof studentName === 'string' && studentName.trim() !== '' ? studentName.trim() : null;

    const promptText = `Anda adalah Pakar OCR AI Pengenal Dokumen Kartu Keluarga (KK) Indonesia dengan Akurasi Presisi Tinggi.

STRUKTUR DOKUMEN KARTU KELUARGA (KK):
Dokumen ini terdiri dari 2 Tabel yang memiliki Nomor Baris No (1, 2, 3, 4...) yang sejajar:
1. TABEL 1 (TABEL ATAS / KOTAK KUNING):
   Berisi kolom: (1) No, (2) Nama Lengkap, (3) NIK, (4) Jenis Kelamin, (5) Tempat Lahir, (6) Tanggal Lahir, (7) Agama, (8) Pendidikan, (9) Jenis Pekerjaan, (10) Golongan Darah.
2. TABEL 2 (TABEL BAWAH / KOTAK HIJAU):
   Berisi kolom: (10/1) No, (11) Status Perkawinan, (12) Tanggal Perkawinan, (13) Status Hubungan Dalam Keluarga, (14) Kewarganegaraan, (15-16) Dokumen Imigrasi, serta (16) Nama Orang Tua: AYAH dan (17) Nama Orang Tua: IBU.

ALGORITMA KETAT PENCOCOKAN RELASIONAL DOKUMEN KK:
${cleanStudentName ? `SISWA YANG DIDAFTARKAN DARI FORM: "${cleanStudentName}"` : ''}

TAHAP 1: MATCHING BARIS SISWA
- Cari nama siswa ${cleanStudentName ? `"${cleanStudentName}"` : 'pada kolom "Nama Lengkap" di Tabel 1 atau Tabel 2'}.
- Dapatkan Nomor Baris (misal Baris No. 3, 4, 5, dst) tempat siswa tersebut berada.

TAHAP 2: BACA NAMA ORANG TUA DARI TABEL 2 (BAGIAN BAWAH)
- Lihat TABEL 2 KHUSUS PADA NOMOR BARIS SISWA TERSEBUT.
- Di sebelah kanan baris siswa tersebut (kolom "Nama Orang Tua"), dapatkan teks persis:
  * Nama Ayah Kandung (Kolom "Ayah")
  * Nama Ibu Kandung (Kolom "Ibu")

TAHAP 3: COCOKKAN NAMA ORANG TUA KE TABEL 1 (BAGIAN ATAS) UNTUK MENGAMBIL DATA LENGKAP
- **DATA AYAH**:
  * Cari baris pada TABEL 1 yang "Nama Lengkap"-nya COCOK PERSIS dengan Nama Ayah Kandung dari Tahap 2 (atau yang berstatus "KEPALA KELUARGA").
  * BACA DENGAN TELITI DARI BARIS AYAH TERSEBUT DI TABEL 1:
    - "nama_ayah": Nama lengkap Ayah.
    - "nik_ayah": 16 digit NIK dari kolom (3) NIK pada baris Ayah tersebut.
    - "tahun_lahir_ayah": 4 digit tahun lahir (YYYY) dari kolom (6) Tanggal Lahir pada baris Ayah tersebut.
    - "pekerjaan_ayah": Jenis pekerjaan dari kolom (9) Jenis Pekerjaan pada baris Ayah tersebut.
    - "pendidikan_ayah": Tingkat/jenjang pendidikan dari kolom (8) Pendidikan pada baris Ayah tersebut.

- **DATA IBU**:
  * Cari baris pada TABEL 1 yang "Nama Lengkap"-nya COCOK PERSIS dengan Nama Ibu Kandung dari Tahap 2 (atau yang berstatus "ISTRI").
  * BACA DENGAN TELITI DARI BARIS IBU TERSEBUT DI TABEL 1:
    - "nama_ibu": Nama lengkap Ibu.
    - "nik_ibu": 16 digit NIK dari kolom (3) NIK pada baris Ibu tersebut.
    - "tahun_lahir_ibu": 4 digit tahun lahir (YYYY) dari kolom (6) Tanggal Lahir pada baris Ibu tersebut.
    - "pekerjaan_ibu": Jenis pekerjaan dari kolom (9) Jenis Pekerjaan pada baris Ibu tersebut.
    - "pendidikan_ibu": Tingkat/jenjang pendidikan dari kolom (8) Pendidikan pada baris Ibu tersebut.

TAHAP 4: AGAMA & HEADER
- "agama": Agama dari kolom (7) Agama (misal "KRISTEN", "ISLAM").
- "no_kk": 16 digit Nomor Kartu Keluarga dari header atas dokumen KK.
- "kode_wilayah": "210405AA".

KONVERSI KODE RESMI (SANGAT PENTING):
- Pekerjaan Ayah & Ibu ke Kode: 1=Tidak bekerja, 2=Nelayan, 3=Petani, 4=Peternak, 5=PNS/TNI/Polri, 6=Karyawan Swasta, 7=Pedagang Kecil, 8=Pedagang Besar, 9=Wiraswasta, 10=Wirausaha, 11=Buruh, 12=Pensiunan, 13=TKI, 14=Karyawan BUMN, 90=Tidak dapat diterapkan, 98=Sudah Meninggal, 99=Lainnya.
- Pendidikan Ayah & Ibu ke Kode: 0=Tidak sekolah, 1=PAUD, 2=TK/sederajat, 3=Putus SD, 4=SD/sederajat, 5=SMP/sederajat, 6=SMA/sederajat, 7=Paket A, 8=Paket B, 9=Paket C, 20=D1, 21=D2, 22=D3, 23=D4, 30=S1, 31=Profesi, 32=Sp-1, 35=S2.
- Agama ke Kode: 1=Islam, 2=Kristen, 3=Katholik, 4=Hindu, 5=Budha, 6=Khonghucu, 7=Kepercayaan, 99=Lainnya.

BERIKAN RESPON HANYA DALAM FORMAT JSON MURNI TANPA MARKDOWN ATAU TEKS TAMBAHAN. CONTOH:
{
  "no_kk": "8103052407200001",
  "nama_ayah": "IZAK ELATH",
  "nik_ayah": "8103051404930003",
  "tahun_lahir_ayah": "1993",
  "pekerjaan_ayah": "2",
  "pendidikan_ayah": "4",
  "nama_ibu": "YOSINTA NGOBUT",
  "nik_ibu": "9202125505930002",
  "tahun_lahir_ibu": "1993",
  "pekerjaan_ibu": "1",
  "pendidikan_ibu": "6",
  "agama": "2",
  "kode_wilayah": "210405AA"
}`;

    const requestPayload = {
        contents: [
            {
                parts: [
                    {
                        inline_data: {
                            mime_type: fileData.mimeType,
                            data: fileData.base64
                        }
                    },
                    {
                        text: promptText
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.0, // 0.0 for maximum deterministic accuracy
            response_mime_type: "application/json"
        }
    };

    let response;
    let modelUsed = OCR_CONFIG.DEFAULT_MODEL;

    try {
        response = await fetch(`${OCR_CONFIG.API_URL}/${modelUsed}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok && response.status === 404) {
            modelUsed = OCR_CONFIG.FALLBACK_MODEL;
            response = await fetch(`${OCR_CONFIG.API_URL}/${modelUsed}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });
        }
    } catch (networkErr) {
        throw new Error('Gagal terhubung ke layanan OCR AI: ' + networkErr.message);
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || response.statusText;
        if (msg.includes('API key') || response.status === 400 || response.status === 403) {
            localStorage.removeItem('gemini_api_key');
            throw new Error('Gemini API Key tidak valid atau telah kedaluwarsa. Silakan periksa kembali API Key Anda.');
        }
        throw new Error(`Permintaan OCR AI Gagal (${response.status}): ${msg}`);
    }

    const responseData = await response.json();
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        throw new Error('Layanan AI tidak memberikan respon teks hasil ekstraksi.');
    }

    // Parse JSON safely
    let extractedData = {};
    try {
        const cleanJsonStr = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        extractedData = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
        console.error('OCR JSON Parse Error:', rawText);
        throw new Error('Format keluaran dari OCR AI tidak valid: ' + parseErr.message);
    }

    // Post-processing code normalization
    if (extractedData) {
        // Clean 16 digit numbers if spaces/hyphens are present
        ['no_kk', 'nik_ayah', 'nik_ibu'].forEach(key => {
            if (extractedData[key] && typeof extractedData[key] === 'string') {
                const digits = extractedData[key].replace(/\D/g, '');
                if (digits.length >= 15 && digits.length <= 17) {
                    extractedData[key] = digits;
                }
            }
        });

        // Clean 4 digit years
        ['tahun_lahir_ayah', 'tahun_lahir_ibu'].forEach(key => {
            if (extractedData[key]) {
                const yearMatch = String(extractedData[key]).match(/\b(19\d{2}|20\d{2})\b/);
                if (yearMatch) {
                    extractedData[key] = yearMatch[1];
                }
            }
        });

        // Map text values to standardized codes
        if (extractedData.agama) extractedData.agama = mapAgamaToCode(extractedData.agama);
        if (extractedData.pekerjaan_ayah) extractedData.pekerjaan_ayah = mapPekerjaanToCode(extractedData.pekerjaan_ayah);
        if (extractedData.pekerjaan_ibu) extractedData.pekerjaan_ibu = mapPekerjaanToCode(extractedData.pekerjaan_ibu);
        if (extractedData.pendidikan_ayah) extractedData.pendidikan_ayah = mapPendidikanToCode(extractedData.pendidikan_ayah);
        if (extractedData.pendidikan_ibu) extractedData.pendidikan_ibu = mapPendidikanToCode(extractedData.pendidikan_ibu);
        extractedData.kode_wilayah = '210405AA';
    }

    return extractedData;
}

// Expose OCR module and lookup utilities to window
window.processKartuKeluargaOCR = processKartuKeluargaOCR;
window.getGeminiApiKey = getGeminiApiKey;
window.saveGeminiApiKey = saveGeminiApiKey;
window.promptForApiKey = promptForApiKey;
window.LOOKUP_CODES = LOOKUP_CODES;
window.mapAgamaToCode = mapAgamaToCode;
window.mapPekerjaanToCode = mapPekerjaanToCode;
window.mapPendidikanToCode = mapPendidikanToCode;
window.formatCodeLabel = formatCodeLabel;
