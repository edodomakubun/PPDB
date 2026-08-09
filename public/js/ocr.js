/**
 * AI OCR Engine for Kartu Keluarga (KK) Extraction
 * Uses Google Gemini Vision API (Supports Images & PDF Documents with High-Precision Parsing)
 */

const OCR_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    FALLBACK_MODEL: 'gemini-1.5-flash',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
};

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
 * @returns {Promise<Object>} Extracted KK data object
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

TUGAS UTAMA:
Analisis dokumen Kartu Keluarga ini (gambar atau PDF).
${cleanStudentName ? `NAMA SISWA / ANGGOTA KELUARGA YANG DIDAFTARKAN PADA FORM: "${cleanStudentName}"` : ''}

METODE MATCHING ORANG TUA KARTU KELUARGA ALGORITMA PRESISI:
1. PENCARIAN SISWA KE TABEL 2 (TABEL NAMA ORANG TUA DI BAGIAN BAWAH/KOLOM BELAKANG):
   ${cleanStudentName ? `- Cari baris anggota keluarga pada Tabel 1 di mana "Nama Lengkap" cocok/paling mirip dengan nama siswa: "${cleanStudentName}".
   - Pada baris siswa "${cleanStudentName}" tersebut, lihat Tabel 2 (tabel bagian bawah/kolom belakang yang berisi kolom "Nama Ayah" dan "Nama Ibu").
   - Dapatkan nama persis Nama Ayah dan Nama Ibu kandung dari siswa "${cleanStudentName}" ini.` : '- Lihat Tabel 2 (tabel bagian bawah yang berisi kolom "Nama Ayah" dan "Nama Ibu") untuk mengidentifikasi nama Ayah dan Ibu.'}

2. PENCOCOKAN NAMA ORANG TUA KE TABEL 1 (TABEL UTAMA):
   - **DATA AYAH**:
     * Cari baris pada Tabel 1 yang "Nama Lengkap"-nya cocok dengan Nama Ayah tersebut (atau yang berstatus "KEPALA KELUARGA" / "SUAMI").
     * "nama_ayah": Nama lengkap Ayah.
     * "nik_ayah": 16 digit NIK dari kolom NIK pada baris Ayah tersebut.
     * "tahun_lahir_ayah": 4 digit tahun lahir (YYYY) dari kolom Tanggal Lahir pada baris Ayah tersebut.
     * "pekerjaan_ayah": Jenis pekerjaan dari kolom Jenis Pekerjaan pada baris Ayah tersebut.
     * "pendidikan_ayah": Jenjang/tingkat pendidikan dari kolom Pendidikan pada baris Ayah tersebut (misal: "SD/SEDERAJAT", "SLTP/SEDERAJAT", "SLTA/SEDERAJAT", "DIPLOMA III", "STRATA I", "TIDAK/BELUM SEKOLAH", dll).

   - **DATA IBU**:
     * Cari baris pada Tabel 1 yang "Nama Lengkap"-nya cocok dengan Nama Ibu tersebut (atau yang berstatus "ISTRI" / "ISTERI" / "IBU").
     * "nama_ibu": Nama lengkap Ibu.
     * "nik_ibu": 16 digit NIK dari kolom NIK pada baris Ibu tersebut.
     * "tahun_lahir_ibu": 4 digit tahun lahir (YYYY) dari kolom Tanggal Lahir pada baris Ibu tersebut.
     * "pekerjaan_ibu": Jenis pekerjaan dari kolom Jenis Pekerjaan pada baris Ibu tersebut.
     * "pendidikan_ibu": Jenjang/tingkat pendidikan dari kolom Pendidikan pada baris Ibu tersebut.

3. NOMOR KARTU KELUARGA ("no_kk"):
   - 16 digit Nomor Kartu Keluarga dari header atas dokumen KK.

BERIKAN RESPON HANYA DALAM FORMAT JSON MURNI TANPA MARKDOWN ATAU TEKS TAMBAHAN. CONTOH:
{
  "no_kk": "8101010101010001",
  "nama_ayah": "Ahmad",
  "nik_ayah": "8101011205800001",
  "tahun_lahir_ayah": "1980",
  "pekerjaan_ayah": "Petani/Pekebun",
  "pendidikan_ayah": "SLTA/SEDERAJAT",
  "nama_ibu": "Siti",
  "nik_ibu": "8101014502830002",
  "tahun_lahir_ibu": "1983",
  "pekerjaan_ibu": "Mengurus Rumah Tangga",
  "pendidikan_ibu": "SLTP/SEDERAJAT"
}

Jika ada bidang data yang tidak terlihat atau tidak ada pada dokumen, berikan nilai null.`;

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

    // Post-processing cleanup for max precision
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
    }

    return extractedData;
}

// Expose OCR module to window
window.processKartuKeluargaOCR = processKartuKeluargaOCR;
window.getGeminiApiKey = getGeminiApiKey;
window.saveGeminiApiKey = saveGeminiApiKey;
window.promptForApiKey = promptForApiKey;
