let allData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Admin Session)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Initial Data Load
    await loadData();

    // 3. Register Event Listeners
    document.getElementById('search-input').addEventListener('input', filterData);
    document.getElementById('school-filter').addEventListener('input', filterData);
    document.getElementById('status-filter').addEventListener('change', filterData);
    document.getElementById('date-filter').addEventListener('change', filterData);

    // Export Dropdown Click Handler
    const btnExport = document.getElementById('btn-export-dropdown');
    const menuExport = document.getElementById('export-dropdown-menu');
    const chevronExport = document.getElementById('icon-export-chevron');

    if (btnExport && menuExport) {
        btnExport.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menuExport.classList.contains('hidden');
            if (isHidden) {
                menuExport.classList.remove('hidden');
                setTimeout(() => {
                    menuExport.classList.remove('scale-95', 'opacity-0');
                    menuExport.classList.add('scale-100', 'opacity-100');
                }, 10);
                if (chevronExport) chevronExport.classList.add('rotate-180');
            } else {
                menuExport.classList.remove('scale-100', 'opacity-100');
                menuExport.classList.add('scale-95', 'opacity-0');
                if (chevronExport) chevronExport.classList.remove('rotate-180');
                setTimeout(() => {
                    menuExport.classList.add('hidden');
                }, 200);
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!menuExport.classList.contains('hidden') && !btnExport.contains(e.target) && !menuExport.contains(e.target)) {
                menuExport.classList.remove('scale-100', 'opacity-100');
                menuExport.classList.add('scale-95', 'opacity-0');
                if (chevronExport) chevronExport.classList.remove('rotate-180');
                setTimeout(() => {
                    menuExport.classList.add('hidden');
                }, 200);
            }
        });
    }
});

async function loadData() {
    const tbody = document.getElementById('table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Memuat data...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('pendaftaran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data;

        // Render Table
        renderTable(allData);

    } catch (error) {
        console.error(error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Gagal memuat data.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const countEl = document.getElementById('data-count');
    if (countEl) countEl.innerText = `Total: ${data.length} Pendaftar`;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">Tidak ada data yang cocok.</td></tr>';
        return;
    }

    data.forEach((item) => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        let statusClass = 'bg-slate-100 text-slate-800';
        if (item.status === 'Diterima') statusClass = 'bg-green-100 text-green-800';
        else if (item.status === 'Ditolak') statusClass = 'bg-red-100 text-red-800';
        else if (item.status === 'Menunggu Verifikasi') statusClass = 'bg-yellow-100 text-yellow-800';

        const row = `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${item.nama_lengkap}</div>
                    <div class="text-sm text-slate-500">NIK: ${item.nik}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-900">${item.nama_ayah} / ${item.nama_ibu}</div>
                    <div class="text-sm text-slate-500">${item.no_hp}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${item.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="detail-siswa.html?id=${item.id}" class="text-blue-600 hover:text-blue-900 mr-3">Detail/Edit</a>
                    <button onclick="deleteData('${item.id}')" class="text-red-600 hover:text-red-900 cursor-pointer">Hapus</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function filterData() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const school = document.getElementById('school-filter').value.toLowerCase();
    const status = document.getElementById('status-filter').value;
    const dateInput = document.getElementById('date-filter').value;

    const filtered = allData.filter(item => {
        const matchSearch = item.nama_lengkap.toLowerCase().includes(search) || item.nik.includes(search);
        const matchSchool = !school || (item.asal_sekolah && item.asal_sekolah.toLowerCase().includes(school));
        const matchStatus = status === 'all' || item.status === status;

        let matchDate = true;
        if (dateInput) {
            const itemDate = new Date(item.created_at).toISOString().split('T')[0];
            matchDate = itemDate === dateInput;
        }

        return matchSearch && matchSchool && matchStatus && matchDate;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('school-filter').value = '';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('date-filter').value = '';
    renderTable(allData);
}

async function deleteData(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() });

            // Delete Files
            const filesToDelete = [item.foto_url, item.kk_url, item.akte_url].filter(Boolean);
            if (filesToDelete.length > 0) {
                await supabaseClient.storage.from('berkas_siswa').remove(filesToDelete);
            }

            // Delete Record
            const { error } = await supabaseClient.from('pendaftaran').delete().eq('id', id);
            if (error) throw error;

            await logActivity('DELETE_STUDENT', `Menghapus data siswa: ${item.nama_lengkap} (NIK: ${item.nik})`);

            Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');

            // Reload data to update table
            loadData();

        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// --- Export Functions ---
function exportToExcel() {
    if (!allData || allData.length === 0) return Swal.fire('Info', 'Data kosong.', 'info');

    const dataForExcel = allData.map(item => {
        const noKkVal = item.no_kk || (item.custom_data && item.custom_data.no_kk) || '';
        const nikAyahVal = item.nik_ayah || (item.custom_data && item.custom_data.nik_ayah) || '';
        const nikIbuVal = item.nik_ibu || (item.custom_data && item.custom_data.nik_ibu) || '';
        const thnAyahVal = item.tahun_lahir_ayah || (item.custom_data && item.custom_data.tahun_lahir_ayah) || '';
        const thnIbuVal = item.tahun_lahir_ibu || (item.custom_data && item.custom_data.tahun_lahir_ibu) || '';
        const pendAyahVal = item.pendidikan_ayah || (item.custom_data && item.custom_data.pendidikan_ayah) || '';
        const pendIbuVal = item.pendidikan_ibu || (item.custom_data && item.custom_data.pendidikan_ibu) || '';
        const kodeWilayahVal = item.kode_wilayah || (item.custom_data && item.custom_data.kode_wilayah) || '210405AA';

        return {
            'Tanggal Daftar': new Date(item.created_at).toLocaleDateString('id-ID'),
            'No. KK': noKkVal,
            'NIK Siswa': item.nik,
            'Nama Lengkap': item.nama_lengkap,
            'Tempat Lahir': item.tempat_lahir,
            'Tanggal Lahir': item.tanggal_lahir,
            'Jenis Kelamin': item.jenis_kelamin,
            'Agama (Kode)': window.mapAgamaToCode ? window.mapAgamaToCode(item.agama) : (item.agama || ''),
            'Kode Wilayah': kodeWilayahVal,
            'Alamat': item.alamat || '',
            'Sekolah Asal': item.asal_sekolah || '',
            'Nama Ayah': item.nama_ayah || '',
            'NIK Ayah': nikAyahVal,
            'Tahun Lahir Ayah': thnAyahVal,
            'Pekerjaan Ayah (Kode)': window.mapPekerjaanToCode ? window.mapPekerjaanToCode(item.pekerjaan_ayah) : (item.pekerjaan_ayah || ''),
            'Pendidikan Ayah (Kode)': window.mapPendidikanToCode ? window.mapPendidikanToCode(pendAyahVal) : (pendAyahVal || ''),
            'Nama Ibu': item.nama_ibu || '',
            'NIK Ibu': nikIbuVal,
            'Tahun Lahir Ibu': thnIbuVal,
            'Pekerjaan Ibu (Kode)': window.mapPekerjaanToCode ? window.mapPekerjaanToCode(item.pekerjaan_ibu) : (item.pekerjaan_ibu || ''),
            'Pendidikan Ibu (Kode)': window.mapPendidikanToCode ? window.mapPendidikanToCode(pendIbuVal) : (pendIbuVal || ''),
            'No HP': item.no_hp || '',
            'Status': item.status || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendaftar");
    XLSX.writeFile(wb, `Laporan_PPDB_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
    if (!allData || allData.length === 0) return Swal.fire('Info', 'Data kosong.', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text('Laporan Data Pendaftar Siswa Baru (Format Kode Dapodik)', 8, 12);
    doc.setFontSize(9);
    doc.text(`SD INPRES LELINGLUAN - ${new Date().toLocaleDateString('id-ID')}`, 8, 18);

    const formatBirthdate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const tableRows = allData.map((item, i) => {
        const pendAyahVal = item.pendidikan_ayah || (item.custom_data && item.custom_data.pendidikan_ayah) || '';
        const pendIbuVal = item.pendidikan_ibu || (item.custom_data && item.custom_data.pendidikan_ibu) || '';
        const kodeAgama = window.mapAgamaToCode ? window.mapAgamaToCode(item.agama) : (item.agama || '-');
        const kodePekAyah = window.mapPekerjaanToCode ? window.mapPekerjaanToCode(item.pekerjaan_ayah) : (item.pekerjaan_ayah || '-');
        const kodePekIbu = window.mapPekerjaanToCode ? window.mapPekerjaanToCode(item.pekerjaan_ibu) : (item.pekerjaan_ibu || '-');

        return [
            i + 1,
            item.nik || '-',
            item.nama_lengkap || '-',
            item.jenis_kelamin || '-',
            item.tempat_lahir || '-',
            formatBirthdate(item.tanggal_lahir),
            kodeAgama,
            item.nama_ayah || '-',
            kodePekAyah,
            item.nama_ibu || '-',
            kodePekIbu,
            item.no_hp || '-',
            item.alamat || '-',
            item.asal_sekolah || '-'
        ];
    });

    const headers = [
        "NO URUT",
        "NIK",
        "NAMA",
        "JENIS KELAMIN",
        "TEMPAT LAHIR",
        "TANGGAL LAHIR (DD/MM/YYYY)",
        "AGAMA",
        "NAMA AYAH",
        "PEKERJAAN AYAH",
        "NAMA IBU",
        "PEKERJAAN IBU",
        "NOMOR HP",
        "ALAMAT",
        "ASAL SEKOLAH"
    ];

    doc.autoTable({
        head: [headers],
        body: tableRows,
        startY: 22,
        margin: { left: 8, right: 8 },
        theme: 'grid',
        styles: {
            fontSize: 5.5,
            cellPadding: 1,
            valign: 'middle',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [37, 99, 235],
            fontSize: 5.5,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // NO URUT
            1: { cellWidth: 18 },                  // NIK
            2: { cellWidth: 26 },                  // NAMA
            3: { cellWidth: 14 },                  // JENIS KELAMIN
            4: { cellWidth: 16 },                  // TEMPAT LAHIR
            5: { cellWidth: 18, halign: 'center' }, // TANGGAL LAHIR (DD/MM/YYYY)
            6: { cellWidth: 12 },                  // AGAMA
            7: { cellWidth: 18 },                  // NAMA AYAH
            8: { cellWidth: 18 },                  // PEKERJAAN AYAH
            9: { cellWidth: 18 },                  // NAMA IBU
            10: { cellWidth: 18 },                 // PEKERJAAN IBU
            11: { cellWidth: 18 },                 // NOMOR HP
            12: { cellWidth: 32 },                 // ALAMAT
            13: { cellWidth: 20 }                  // ASAL SEKOLAH
        }
    });

    doc.save(`Laporan_PPDB_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportToJSON() {
    try {
        Swal.fire({ title: 'Menyiapkan Backup...', didOpen: () => Swal.showLoading() });

        // Fetch All Data Tables
        const [pendaftaran, settings, fields, logs, announcements] = await Promise.all([
            supabaseClient.from('pendaftaran').select('*'),
            supabaseClient.from('app_settings').select('*'),
            supabaseClient.from('form_fields').select('*'),
            supabaseClient.from('audit_logs').select('*'),
            supabaseClient.from('announcements').select('*')
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            pendaftaran: pendaftaran.data || [],
            app_settings: settings.data || [],
            form_fields: fields.data || [],
            audit_logs: logs.data || [],
            announcements: announcements.data || []
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_PPDB_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire('Berhasil!', 'Backup data JSON berhasil diunduh.', 'success');

    } catch (error) {
        console.error('Backup failed:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyiapkan backup.', 'error');
    }
}

async function downloadAllBerkas() {
    if (!allData || allData.length === 0) return Swal.fire('Info', 'Data kosong.', 'info');

    try {
        const result = await Swal.fire({
            title: 'Download Semua Berkas?',
            text: "Ini akan mengunduh file KK dan Akta Kelahiran dari semua siswa dan menyimpannya dalam satu file ZIP. Proses ini mungkin memakan waktu.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ya, Download',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Menyiapkan File ZIP...',
            html: 'Mohon tunggu, sedang mengunduh berkas.<br>Progress: <b id="zip-progress">0%</b>',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const zip = new JSZip();
        let fileCount = 0;
        let processed = 0;
        const totalItems = allData.length * 2; // KK and Akte for each

        for (const item of allData) {
            // Gunakan nama siswa sebagai nama folder
            const folderName = item.nama_lengkap.replace(/[^a-zA-Z0-9 ]/g, "").trim();
            const folder = zip.folder(folderName);
            
            const addFileToZip = async (path, filenamePrefix) => {
                if (!path) return;
                try {
                    const { data, error } = await supabaseClient.storage.from('berkas_siswa').createSignedUrl(path, 60);
                    if (error || !data?.signedUrl) return;

                    const response = await fetch(data.signedUrl);
                    if (!response.ok) return;
                    
                    const blob = await response.blob();
                    
                    // Get extension
                    const ext = path.split('.').pop() || 'jpg';
                    folder.file(`${filenamePrefix}.${ext}`, blob);
                    fileCount++;
                } catch (e) {
                    console.error('Error fetching file:', e);
                }
            };

            await addFileToZip(item.kk_url, 'Kartu_Keluarga');
            processed++;
            const progressEl1 = document.getElementById('zip-progress');
            if(progressEl1) progressEl1.innerText = Math.round((processed / totalItems) * 100) + '%';
            
            await addFileToZip(item.akte_url, 'Akte_Kelahiran');
            processed++;
            const progressEl2 = document.getElementById('zip-progress');
            if(progressEl2) progressEl2.innerText = Math.round((processed / totalItems) * 100) + '%';
        }

        if (fileCount === 0) {
            return Swal.fire('Info', 'Tidak ada berkas (KK/Akte) yang ditemukan untuk diunduh.', 'info');
        }

        Swal.fire({
            title: 'Menyimpan ZIP...',
            text: 'Sedang membuat file ZIP...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Berkas_Siswa_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire('Berhasil!', `Berhasil mengunduh ${fileCount} berkas dalam file ZIP.`, 'success');
        
    } catch (error) {
        console.error('Download Berkas Error:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan saat mengunduh berkas.', 'error');
    }
}
