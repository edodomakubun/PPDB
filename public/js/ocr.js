/**
 * AI OCR Engine for Kartu Keluarga (KK) Extraction
 * Uses Google Gemini Vision API (Supports Images & PDF Documents)
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
        // Check localStorage first for instant response
        let localKey = localStorage.getItem('gemini_api_key');
        if (localKey && localKey.trim() !== '') {
            return localKey.trim();
        }

        // Fetch from Supabase app_settings
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient
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
 * Convert Image or PDF File to Base64 (Render first page of PDF if PDF.js is available)
 */
async function processFileForGemini(fileOrBlob) {
    const fileName = fileOrBlob.name || '';
    const isPdf = fileOrBlob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
        // If PDF.js library is available, render PDF page 1 to JPEG Canvas at 2.0x scale for maximum OCR accuracy
        if (typeof pdfjsLib !== 'undefined') {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const arrayBuffer = await fileOrBlob.arrayBuffer();
                const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdfDocument.getPage(1);
                
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                return {
                    base64: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg'
                };
            } catch (err) {
                console.warn('Gagal merender PDF via PDF.js, akan menggunakan payload PDF langsung ke Gemini:', err);
            }
        }
        
        // Native Gemini PDF payload support
        const rawPdfData = await fileToBase64(fileOrBlob);
        return {
            base64: rawPdfData.base64,
            mimeType: 'application/pdf'
        };
    }

    // Default image handling
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
 * @returns {Promise<Object>} Extracted KK data object
 */
async function processKartuKeluargaOCR(imageFile, overrideApiKey = null) {
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

    const promptText = `Anda adalah sistem OCR AI profesional yang bertugas menganalisis dokumen Kartu Keluarga (KK) Indonesia (baik dalam format gambar maupun PDF).
Analisis dokumen Kartu Keluarga ini dan ekstrak informasi penting berikut ke dalam format JSON terstruktur:

1. "no_kk": Nomor Kartu Keluarga (16 digit angka, terletak di header atas dokumen KK).
2. "nik_ayah": NIK Ayah (16 digit angka NIK milik anggota keluarga berstatus Kepala Keluarga / Suami / Ayah).
3. "nik_ibu": NIK Ibu (16 digit angka NIK milik anggota keluarga berstatus Hubungan Ibu / Isteri).
4. "tahun_lahir_ayah": Tahun lahir Ayah (4 digit tahun angka, misal 1980, diambil dari kolom Tanggal Lahir / NIK milik Ayah / Kepala Keluarga).
5. "tahun_lahir_ibu": Tahun lahir Ibu (4 digit tahun angka, misal 1983, diambil dari kolom Tanggal Lahir / NIK milik Ibu / Isteri).
6. "pekerjaan_ayah": Jenis pekerjaan Ayah (teks pekerjaan milik Ayah, misal: 'PNS', 'Petani', 'Wiraswasta', 'Karyawan Swasta', 'Nelayan', dll).
7. "pekerjaan_ibu": Jenis pekerjaan Ibu (teks pekerjaan milik Ibu, misal: 'Mengurus Rumah Tangga', 'PNS', 'Pedagang', 'Guru', dll).
8. "nama_ayah": Nama lengkap Ayah / Kepala Keluarga (opsional jika terlihat jelas).
9. "nama_ibu": Nama lengkap Ibu (opsional jika terlihat jelas).

BERIKAN RESPON DALAM FORMAT JSON MURNI TANPA MARKDOWN ATAU TEKS LAINNYA. CONTOH:
{
  "no_kk": "8101010101010001",
  "nik_ayah": "8101011205800001",
  "nik_ibu": "8101014502830002",
  "tahun_lahir_ayah": "1980",
  "tahun_lahir_ibu": "1983",
  "pekerjaan_ayah": "Petani/Pekebun",
  "pekerjaan_ibu": "Mengurus Rumah Tangga",
  "nama_ayah": "Ahmad",
  "nama_ibu": "Siti"
}

Jika ada bidang data yang tidak terlihat atau tidak ada pada gambar/dokumen PDF, berikan nilai null untuk bidang tersebut.`;

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
            temperature: 0.1,
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

        // Fallback model if default is unavailable
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

    return extractedData;
}

// Expose OCR module to window
window.processKartuKeluargaOCR = processKartuKeluargaOCR;
window.getGeminiApiKey = getGeminiApiKey;
window.saveGeminiApiKey = saveGeminiApiKey;
window.promptForApiKey = promptForApiKey;
