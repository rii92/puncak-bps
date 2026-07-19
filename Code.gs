/* =====================================================================
   Code.gs — Backend Google Apps Script
   Manajemen Kinerja Tim — BPS Kabupaten Puncak

   Spreadsheet tabs:
     • Users     : id | nama | role | passwordHash | salt | createdAt
     • Sessions  : token | userId | expiresAt
     • Aktivitas : id | tujuan | sasaran | iku | kegiatan | subKegiatan
                   | nama | target | satuan | periodeMulai | periodeSelesai
                   | assignedTo | createdBy | createdAt
     • Laporan   : id | aktivitasId | pegawaiId | tanggal | uraian | capaian
                   | buktiTipe | buktiUrl | buktiNama | createdAt

   Referensi (Tujuan/Sasaran/IKU/Kegiatan/SubKegiatan) hardcoded di bawah.
   ===================================================================== */

// ID folder Google Drive tempat menyimpan file bukti dukung (WAJIB diisi)
const DRIVE_FOLDER_ID = '1R3IMVaNRJePMidiffq6iJco6sKcEGA9M';

// Masa berlaku sesi login (dalam milidetik). Default: 1 hari.
const SESSION_DURATION_MS = 1 * 24 * 60 * 60 * 1000;

const SHEETS = {
  USERS: "Users",
  SESSIONS: "Sessions",
  AKTIVITAS: "Aktivitas",
  LAPORAN: "Laporan",
};

const HEADERS = {
  Users: ["id", "nama", "role", "passwordHash", "salt", "createdAt"],
  Sessions: ["token", "userId", "expiresAt"],
  Aktivitas: ["id", "tujuan", "sasaran", "iku", "kegiatan", "subKegiatan",
              "nama", "target", "satuan", "periodeMulai", "periodeSelesai",
              "assignedTo", "createdBy", "createdAt"],
  Laporan: ["id", "aktivitasId", "pegawaiId", "tanggal", "uraian", "capaian",
            "buktiTipe", "buktiUrl", "buktiNama", "createdAt"],
};

/**
 * Data referensi Tujuan > Sasaran > IKU > Kegiatan > Sub Kegiatan.
 * Hardcoded agar tidak perlu sheet tambahan.
 * Ganti isi array ini kalau rencana kinerja berubah tahun depan.
 */
const REFERENSI = [{"nama":"1. Mewujudkan Perumusan Kebijakan dan Pengambilan Keputusan Berbasis Data Statistik Berkualitas dan Insight yang Relevan","sasaran":[{"nama":"1.1 Terwujudnya Penyediaan Data Dan Insight Statistik Kependudukan Dan Ketenagakerjaan Yang Berkualitas","iku":[{"nama":"1.1.1 Persentase Publikasi/Laporan Statistik Kependudukan Dan Ketenagakerjaan Yang Berkualitas","kegiatan":[{"nama":"Sakernas Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Sakernas Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Sakernas Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Sakernas November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.2 Terwujudnya Penyediaan Data Dan Insight Statistik Kesejahteraan Rakyat Yang Berkualitas","iku":[{"nama":"1.2.1 Persentase Publikasi/Laporan Statistik Kesejahteraan Rakyat Yang Berkualitas","kegiatan":[{"nama":"Susenas Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Susenas September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Seruti Triwulan I","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Seruti Triwulan II","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Seruti Triwulan III","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Seruti Triwulan IV","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.3 Terwujudnya Penyediaan Data Dan Insight Statistik Ketahanan Sosial Yang Berkualitas","iku":[{"nama":"1.3.1 Persentase Publikasi/Laporan Statistik Ketahanan Sosial Yang Berkualitas","kegiatan":[{"nama":"Politik dan Keamanan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Potensi Desa","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Desa Cantik","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.4 Terwujudnya Penyediaan Data Dan Insight Statistik Sumber Daya Mineral dan Konstruksi yang Berkualitas","iku":[{"nama":"1.4.1 Persentase Publikasi/Laporan Statistik Sumber Daya Mineral dan Konstruksi yang Berkualitas","kegiatan":[{"nama":"PE Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Konstruksi Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Air Bersih Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Captive Power Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.5 Terwujudnya Penyediaan Data Dan Insight Statistik Sumber Daya Hayati yang Berkualitas","iku":[{"nama":"1.5.1 Persentase Publikasi/Laporan Statistik Sumber Daya Hayati yang Berkualitas","kegiatan":[{"nama":"Peternakan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Perikanan Triwulan 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Perikanan Triwulan 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Perikanan Triwulan 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Kehutanan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"KSA Desember","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Ubinan SR 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Ubinan SR 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Ubinan SR 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Hortikultura","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Perkebunan Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.6 Terwujudnya Penyediaan Data Dan Insight Statistik Industri Yang Berkualitas","iku":[{"nama":"1.6.1 Persentase Publikasi/Laporan Statistik Industri yang Berkualitas","kegiatan":[{"nama":"IMK Triwulan 4","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IMK Triwulan 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IMK Triwulan 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IMK Triwulan 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IMK Tahunan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IBS Triwulan 4","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IBS Triwulan 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IBS Triwulan 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IBS Triwulan 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"IBS Tahunan (STPIM)","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.7 Terwujudnya Penyediaan Data Dan Insight Statistik Distribusi Yang Berkualitas","iku":[{"nama":"1.7.1 Persentase Publikasi/Laporan Statistik Distribusi Yang Berkualitas","kegiatan":[{"nama":"Survei Jasa Penunjang Angkutan","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Simoppel November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Sensus Ekonomi 2026","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.8 Terwujudnya Penyediaan Data Dan Insight Statistik Harga Yang Berkualitas","iku":[{"nama":"1.8.1 Persentase Publikasi/Laporan Statistik Harga Yang Berkualitas","kegiatan":[{"nama":"Survei Harga Kemahalan Konstruksi Triwulan I","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Survei Harga Kemahalan Konstruksi Triwulan II","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Survei Harga Kemahalan Konstruksi Triwulan III","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Survei Harga Kemahalan Konstruksi Triwulan IV","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPED Desember","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHPB Desember","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SHP Desember","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.9 Terwujudnya Penyediaan Data Dan Insight Statistik Jasa Yang Berkualitas","iku":[{"nama":"1.9.1 Persentase Publikasi/Laporan Statistik Jasa Yang Berkualitas","kegiatan":[{"nama":"Survei Statistik Keuangan Desa/Nagari (K3)","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Survei Lembaga Keuangan Koperasi Simpan Pinjam","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"BUMD","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Januari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Februari","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Maret","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS April","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Mei","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Juni","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Juli","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Agustus","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS September","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Oktober","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS November","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTS Desember","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VHTL","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VDTW","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"VREST","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]},{"nama":"1.10 Terwujudnya Penyediaan Data Dan Insight Statistik Lintas Sektor Yang Berkualitas","iku":[{"nama":"1.10.1 Persentase Publikasi/Laporan Neraca Produksi Yang Berkualitas","kegiatan":[{"nama":"SKNP","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKTNP Tahap 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKTNP Tahap 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKTNP Tahap 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKTNP Tahap 4","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 4 2025 PDRB Lapangan Usaha","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 1 2026 PDRB Lapangan Usaha","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 2 2026 PDRB Lapangan Usaha","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 3 2026 PDRB Lapangan Usaha","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]},{"nama":"1.10.2 Persentase Publikasi/Laporan Neraca Pengeluaran Yang Berkualitas","kegiatan":[{"nama":"SKLNP Triwulan 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKLNP Triwulan 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKLNP Triwulan 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKLNP Triwulan 4","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"SKSPPI","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 4 2025 PDRB Pengeluaran","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 1 2026 PDRB Pengeluaran","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 2 2026 PDRB Pengeluaran","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Penyusunan Data TW 3 2026 PDRB Pengeluaran","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]},{"nama":"1.10.3 Persentase publikasi/laporan Analisis dan Pengembangan Statistik yang berkualitas","kegiatan":[{"nama":"Pengumpulan Quality Gates TW 1","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Pengumpulan Quality Gates TW 2","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Pengumpulan Quality Gates TW 3","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Pengumpulan Quality Gates TW 4","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Publikasi Inkesra","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]},{"nama":"Publikasi Statda","subKegiatan":["Pelatihan","Pendataan","Pengolahan","Diseminasi"]}]}]}]},{"nama":"2. Mewujudkan Penyelenggaraan Sistem Statistik Nasional yang Andal, Efektif, dan Efisien","sasaran":[{"nama":"2.1 Terwujudnya Kapasitas Tata Kelola Pemerintah Desa Untuk Menghasilkan Statistik Berkualitas","iku":[{"nama":"2.1.1 Persentase Kumulatif Desa Yang Berpredikat Desa Cinta Statistik","kegiatan":[{"nama":"Pembinaan Desa Cantik","subKegiatan":["Pembinaan Desa Cantik Desa A","Pembinaan Desa Cantik Desa B","Pembinaan Desa Cantik Desa C"]}]}]},{"nama":"2.2 Terwujudnya Penguatan Penyelenggaraan Pembinaan Statistik Sektoral Kementerian/Lembaga/Pemerintah Daerah","iku":[{"nama":"2.2.1 Tingkat Penyelenggaraan Pembinaan Statistik Sektoral sesuai standar","kegiatan":[{"nama":"Pembinaan Sektoral","subKegiatan":["Pembinaan Sektoral"]}]}]},{"nama":"2.3 Terwujudnya Kemudahan Akses Data Bps","iku":[{"nama":"2.3.1 Indeks Pelayanan Publik - Penilaian Mandiri","kegiatan":[{"nama":"Pelayanan Permintaan Data","subKegiatan":["Pelayanan Permintaan Data"]},{"nama":"Pelayanan Konsultasi Statistik","subKegiatan":["Pelayanan Konsultasi Statistik"]},{"nama":"Penanganan Whistle Blower","subKegiatan":["Penanganan Whistle Blower"]}]}]}]},{"nama":"3. Mewujudkan Tata Kelola Badan Pusat Statistik yang Berkualitas, Akuntabel, Efektif, dan Efisien dalam Menyelenggarakan Statistik","sasaran":[{"nama":"3.1 Terwujudnya Dukungan Manajemen Pada Bps Provinsi Dan Bps Kabupaten/Kota","iku":[{"nama":"3.1.1 Nilai SAKIP oleh Inspektorat","kegiatan":[{"nama":"Perjanjian Kinerja","subKegiatan":["Reviu","Penyusunan"]},{"nama":"Evaluasi Kinerja","subKegiatan":["Monitoring dan Evaluasi Capaian Kinerja TW 1","Monitoring dan Evaluasi Capaian Kinerja TW 2","Monitoring dan Evaluasi Capaian Kinerja TW 3","Monitoring dan Evaluasi Capaian Kinerja TW 4"]},{"nama":"Pelaporan Kinerja","subKegiatan":["Penyusunan Laporan Kinerja"]},{"nama":"Rencana Strategis","subKegiatan":["Reviu"]}]},{"nama":"3.1.2 Indeks Implementasi BerAKHLAK","kegiatan":[{"nama":"BMN","subKegiatan":["Penyusunan Pengawasan dan Pengendalian","Penyusunan Laporan Barang","Kegiatan Rutin","Kegiatan Semesteran"]},{"nama":"Keuangan","subKegiatan":["Kegiatan Rutin","Kegiatan Triwulanan","Kegiatan Semesteran"]},{"nama":"Manajemen SDM","subKegiatan":["Penilaian Kinerja Pegawai","Teguran Pegawai","Pembuatan SK Tim"]},{"nama":"Pengelolaan kebersihan, dan kenyamanan lingkungan","subKegiatan":["Pengelolaan kebersihan, dan kenyamanan lingkungan"]},{"nama":"Persediaan","subKegiatan":["Transaksi Sakti","Pembuatan Laporan Persediaan"]},{"nama":"Surat-Menyurat","subKegiatan":["Pembuatan Surat Internal","Pembuatan Surat Eksternal","Pengandaan Dokumen dengan tujuan mendukung kegiatan lainnya"]}]}]}]}];

/* ========================= UTIL SHEET ========================= */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet '" + name + "' tidak ditemukan. Pastikan sudah dibuat sesuai README.");
  return sheet;
}

function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      let v = values[i][idx];
      if (v instanceof Date && (h === "tanggal" || h === "periodeMulai" || h === "periodeSelesai")) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = v;
    });
    rows.push(obj);
  }
  return rows;
}

function findRowIndexById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) return i + 1;
  }
  return -1;
}

function appendObject(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const row = headers.map(h => (obj[h] !== undefined ? obj[h] : ""));
  sheet.appendRow(row);
  return obj;
}

function updateObjectById(sheetName, id, patch) {
  const rowIdx = findRowIndexById(sheetName, id);
  if (rowIdx === -1) return null;
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  headers.forEach((h, colIdx) => {
    if (patch[h] !== undefined) sheet.getRange(rowIdx, colIdx + 1).setValue(patch[h]);
  });
  const values = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  const result = {};
  const dateCols = ["tanggal", "periodeMulai", "periodeSelesai", "createdAt"];
  headers.forEach((h, i) => {
    let v = values[i];
    if (v instanceof Date && dateCols.includes(h)) {
      v = h === "createdAt" ? v.getTime() : Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    result[h] = v;
  });
  return result;
}

function deleteRowById(sheetName, id) {
  const rowIdx = findRowIndexById(sheetName, id);
  if (rowIdx === -1) return false;
  getSheet(sheetName).deleteRow(rowIdx);
  return true;
}

function deleteRowsByCol(sheetName, colName, value) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const colIdx = headers.indexOf(colName);
  if (colIdx < 0) return 0;
  const values = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colIdx]) === String(value)) rowsToDelete.push(i + 1);
  }
  for (let j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }
  return rowsToDelete.length;
}

function newId(prefix) {
  return prefix + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

/* ========================= PASSWORD & SESSION ========================= */
function hashPassword(password, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + "::" + salt, Utilities.Charset.UTF_8);
  return raw.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function makeSalt() {
  return Utilities.getUuid();
}

function createSession(userId) {
  const token = Utilities.getUuid();
  appendObject(SHEETS.SESSIONS, { token, userId, expiresAt: Date.now() + SESSION_DURATION_MS });
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const sessions = sheetToObjects(SHEETS.SESSIONS);
  const s = sessions.find(s => s.token === token);
  if (!s) return null;
  if (Number(s.expiresAt) < Date.now()) return null;
  const users = sheetToObjects(SHEETS.USERS);
  const u = users.find(u => u.id === s.userId);
  return u || null;
}

function deleteSession(token) {
  deleteRowById(SHEETS.SESSIONS, token);
}

function cleanupExpiredSessions() {
  const sheet = getSheet(SHEETS.SESSIONS);
  const values = sheet.getDataRange().getValues();
  const now = Date.now();
  for (let i = values.length - 1; i >= 1; i--) {
    if (Number(values[i][2]) < now) sheet.deleteRow(i + 1);
  }
}

function sanitizeUser(u) {
  if (!u) return null;
  return { id: u.id, nama: u.nama, role: u.role, createdAt: u.createdAt };
}

/* ========================= RESPONSE HELPER ========================= */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, code) {
  return jsonResponse({ error: message, code: code || 400 });
}

/* ========================= AUTH GUARD ========================= */
function requireUser(token) {
  const u = getUserByToken(token);
  if (!u) {
    const err = new Error("Sesi tidak valid. Silakan login kembali.");
    err.isAuthError = true;
    throw err;
  }
  return u;
}

function requireRole(user, role) {
  if (user.role !== role) {
    const err = new Error("Anda tidak memiliki akses untuk aksi ini.");
    err.isAuthError = true;
    throw err;
  }
}

/* ========================= SHEET SETUP ========================= */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sh.setFrozenRows(1);
      sh.setRowHeight(1, 28);
      sh.getRange(1, 1, 1, HEADERS[name].length)
        .setBackground("#12335F")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setFontSize(10);
    }
  });
  SpreadsheetApp.getUi().alert(
    "Setup selesai!\n\nSheet yang dibuat:\n- Users\n- Sessions\n- Aktivitas\n- Laporan\n\n" +
    "Langkah selanjutnya:\n1. Deploy sebagai Web App\n2. Execute as: Me\n3. Who has access: Anyone"
  );
}

/* ========================= ENTRY POINTS ========================= */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const token = e.parameter.token;

    if (action === "referensi") return jsonResponse(REFERENSI);
    if (action === "status") {
      const users = sheetToObjects(SHEETS.USERS);
      cleanupExpiredSessions();
      return jsonResponse({ hasUsers: users.length > 0 });
    }
    if (action === "me") return jsonResponse(sanitizeUser(requireUser(token)));
    if (action === "users") { requireUser(token); return jsonResponse(sheetToObjects(SHEETS.USERS).map(sanitizeUser)); }
    if (action === "aktivitas") { requireUser(token); return jsonResponse(sheetToObjects(SHEETS.AKTIVITAS).map(normalizeAktivitasOut)); }
    if (action === "laporan") { requireUser(token); return jsonResponse(sheetToObjects(SHEETS.LAPORAN)); }

    const mutationActions = ["register","login","logout","updateUser","deleteUser",
      "createAktivitas","updateAktivitas","deleteAktivitas",
      "createLaporan","updateLaporan","deleteLaporan"];
    if (mutationActions.includes(action)) {
      const body = {};
      for (const key of Object.keys(e.parameter)) {
        if (key !== "action" && key !== "token") {
          let val = e.parameter[key];
          try { val = JSON.parse(val); } catch(pe) {}
          body[key] = val;
        }
      }
      body.token = token;
      return executeAction(action, body);
    }

    return errorResponse("Aksi tidak dikenal: " + action, 404);
  } catch (err) {
    return errorResponse(err.message, err.isAuthError ? 401 : 400);
  }
}

function executeAction(action, body) {
  let result;
  switch (action) {
    case "register":         result = handleRegister(body); break;
    case "login":            result = handleLogin(body); break;
    case "logout":           result = handleLogout(body); break;
    case "updateUser":       result = handleUpdateUser(body); break;
    case "deleteUser":       result = handleDeleteUser(body); break;
    case "createAktivitas":  result = handleCreateAktivitas(body); break;
    case "updateAktivitas":  result = handleUpdateAktivitas(body); break;
    case "deleteAktivitas":  result = handleDeleteAktivitas(body); break;
    case "createLaporan":    result = handleCreateLaporan(body); break;
    case "updateLaporan":    result = handleUpdateLaporan(body); break;
    case "deleteLaporan":    result = handleDeleteLaporan(body); break;
    default: return errorResponse("Aksi tidak dikenal: " + action, 404);
  }
  return jsonResponse(result);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (le) {
    return errorResponse("Server sedang sibuk, coba lagi sebentar.", 503);
  }
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    return executeAction(body.action, body);
  } catch (err) {
    return errorResponse(err.message, err.isAuthError ? 401 : 400);
  } finally {
    lock.releaseLock();
  }
}

/* ========================= AUTH HANDLERS ========================= */
function handleRegister(body) {
  const nama = (body.nama || "").trim();
  const role = body.role;
  const password = body.password || "";
  if (!nama || !password || (role !== "ketua_tim" && role !== "pegawai")) {
    throw new Error("Nama, peran, dan kata sandi wajib diisi.");
  }
  const users = sheetToObjects(SHEETS.USERS);
  const isBootstrap = users.length === 0;

  if (!isBootstrap) {
    const current = requireUser(body.token);
    requireRole(current, "ketua_tim");
  }

  const exists = users.find(u => String(u.nama).toLowerCase() === nama.toLowerCase());
  if (exists) throw new Error("Nama pengguna sudah digunakan.");

  const salt = makeSalt();
  const user = {
    id: newId("usr"), nama, role,
    passwordHash: hashPassword(password, salt), salt,
    createdAt: Date.now(),
  };
  appendObject(SHEETS.USERS, user);

  if (isBootstrap) {
    const token = createSession(user.id);
    return { user: sanitizeUser(user), token };
  }
  return { user: sanitizeUser(user) };
}

function handleLogin(body) {
  const nama = (body.nama || "").trim();
  const password = body.password || "";
  if (!nama || !password) throw new Error("Nama dan kata sandi wajib diisi.");
  const users = sheetToObjects(SHEETS.USERS);
  const user = users.find(u => String(u.nama).toLowerCase() === nama.toLowerCase());
  if (!user) throw new Error("Nama pengguna atau kata sandi salah.");
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Nama pengguna atau kata sandi salah.");
  const token = createSession(user.id);
  return { user: sanitizeUser(user), token };
}

function handleLogout(body) {
  deleteSession(body.token);
  return { ok: true };
}

/* ========================= USER HANDLERS ========================= */
function handleUpdateUser(body) {
  const current = requireUser(body.token);
  requireRole(current, "ketua_tim");
  const patch = {};
  if (body.nama) patch.nama = String(body.nama).trim();
  if (body.role) patch.role = body.role;
  if (body.password) {
    const salt = makeSalt();
    patch.salt = salt;
    patch.passwordHash = hashPassword(body.password, salt);
  }
  const updated = updateObjectById(SHEETS.USERS, body.id, patch);
  if (!updated) throw new Error("Pengguna tidak ditemukan.");
  return sanitizeUser(updated);
}

function handleDeleteUser(body) {
  const current = requireUser(body.token);
  requireRole(current, "ketua_tim");
  const id = body.id;
  if (current.id === id) throw new Error("Tidak dapat menghapus akun sendiri.");

  // Cascade: hapus dari assignedTo di semua aktivitas
  const aktivitasList = sheetToObjects(SHEETS.AKTIVITAS);
  aktivitasList.forEach(a => {
    const assigned = (a.assignedTo || "").split(",").map(s => s.trim()).filter(Boolean);
    if (assigned.includes(id)) {
      updateObjectById(SHEETS.AKTIVITAS, a.id, { assignedTo: assigned.filter(x => x !== id).join(",") });
    }
  });
  // Hapus laporan milik pegawai ini
  deleteRowsByCol(SHEETS.LAPORAN, "pegawaiId", id);
  // Hapus session
  deleteRowsByCol(SHEETS.SESSIONS, "userId", id);
  // Hapus user
  const ok = deleteRowById(SHEETS.USERS, id);
  if (!ok) throw new Error("Pengguna tidak ditemukan.");
  return { ok: true };
}

/* ========================= AKTIVITAS HANDLERS ========================= */
function normalizeAktivitasOut(a) {
  return Object.assign({}, a, {
    assignedTo: (a.assignedTo || "").split(",").map(s => s.trim()).filter(Boolean),
    target: Number(a.target) || 0,
  });
}

function handleCreateAktivitas(body) {
  const current = requireUser(body.token);
  requireRole(current, "ketua_tim");
  if (!body.nama || !body.target) throw new Error("Nama aktivitas dan target wajib diisi.");
  const item = {
    id: newId("akt"),
    tujuan: body.tujuan || "", sasaran: body.sasaran || "", iku: body.iku || "",
    kegiatan: body.kegiatan || "", subKegiatan: body.subKegiatan || "",
    nama: body.nama, target: Number(body.target), satuan: body.satuan || "",
    periodeMulai: body.periodeMulai || "", periodeSelesai: body.periodeSelesai || "",
    assignedTo: Array.isArray(body.assignedTo) ? body.assignedTo.join(",") : "",
    createdBy: current.id, createdAt: Date.now(),
  };
  appendObject(SHEETS.AKTIVITAS, item);
  return normalizeAktivitasOut(item);
}

function handleUpdateAktivitas(body) {
  const current = requireUser(body.token);
  requireRole(current, "ketua_tim");
  const patch = {};
  ["tujuan", "sasaran", "iku", "kegiatan", "subKegiatan", "nama", "satuan", "periodeMulai", "periodeSelesai"].forEach(k => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  if (body.target !== undefined) patch.target = Number(body.target);
  if (body.assignedTo !== undefined) patch.assignedTo = Array.isArray(body.assignedTo) ? body.assignedTo.join(",") : "";
  const updated = updateObjectById(SHEETS.AKTIVITAS, body.id, patch);
  if (!updated) throw new Error("Aktivitas tidak ditemukan.");
  return normalizeAktivitasOut(updated);
}

function handleDeleteAktivitas(body) {
  const current = requireUser(body.token);
  requireRole(current, "ketua_tim");
  // Hapus laporan terkait
  deleteRowsByCol(SHEETS.LAPORAN, "aktivitasId", body.id);
  const ok = deleteRowById(SHEETS.AKTIVITAS, body.id);
  if (!ok) throw new Error("Aktivitas tidak ditemukan.");
  return { ok: true };
}

/* ========================= LAPORAN HANDLERS ========================= */
function saveBuktiFileToDrive(base64Data, fileName, mimeType) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", fileName || "bukti");
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("setSharing gagal (non-fatal): " + e.message);
  }
  return { url: "https://drive.google.com/uc?id=" + file.getId(), name: fileName || file.getName() };
}

function handleCreateLaporan(body) {
  const current = requireUser(body.token);
  requireRole(current, "pegawai");
  if (!body.aktivitasId || !body.tanggal || !body.uraian || !body.capaian) {
    throw new Error("Aktivitas, tanggal, uraian, dan capaian wajib diisi.");
  }
  const aktivitas = sheetToObjects(SHEETS.AKTIVITAS).find(a => a.id === body.aktivitasId);
  if (!aktivitas) throw new Error("Aktivitas tidak ditemukan.");
  const assigned = (aktivitas.assignedTo || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!assigned.includes(current.id)) throw new Error("Anda tidak ditugaskan pada aktivitas ini.");

  let buktiUrl = "", buktiNama = "";
  const buktiTipe = body.buktiTipe === "file" ? "file" : "link";
  if (buktiTipe === "file" && body.buktiFileBase64) {
    const saved = saveBuktiFileToDrive(body.buktiFileBase64, body.buktiFileName, body.buktiFileMime);
    buktiUrl = saved.url; buktiNama = saved.name;
  } else if (buktiTipe === "link") {
    buktiUrl = (body.buktiLink || "").trim();
  }

  const item = {
    id: newId("lap"), aktivitasId: body.aktivitasId, pegawaiId: current.id,
    tanggal: body.tanggal, uraian: String(body.uraian).trim(), capaian: Number(body.capaian),
    buktiTipe, buktiUrl, buktiNama, createdAt: Date.now(),
  };
  appendObject(SHEETS.LAPORAN, item);
  return item;
}

function handleUpdateLaporan(body) {
  const current = requireUser(body.token);
  const existing = sheetToObjects(SHEETS.LAPORAN).find(l => l.id === body.id);
  if (!existing) throw new Error("Laporan tidak ditemukan.");
  if (existing.pegawaiId !== current.id && current.role !== "ketua_tim") {
    throw new Error("Anda tidak dapat mengubah laporan ini.");
  }
  const patch = {};
  if (body.tanggal) patch.tanggal = body.tanggal;
  if (body.uraian) patch.uraian = String(body.uraian).trim();
  if (body.capaian !== undefined) patch.capaian = Number(body.capaian);
  if (body.buktiTipe === "file" && body.buktiFileBase64) {
    const saved = saveBuktiFileToDrive(body.buktiFileBase64, body.buktiFileName, body.buktiFileMime);
    patch.buktiTipe = "file"; patch.buktiUrl = saved.url; patch.buktiNama = saved.name;
  } else if (body.buktiTipe === "link") {
    patch.buktiTipe = "link"; patch.buktiUrl = (body.buktiLink || "").trim(); patch.buktiNama = "";
  }
  const updated = updateObjectById(SHEETS.LAPORAN, body.id, patch);
  return updated;
}

function handleDeleteLaporan(body) {
  const current = requireUser(body.token);
  const existing = sheetToObjects(SHEETS.LAPORAN).find(l => l.id === body.id);
  if (!existing) throw new Error("Laporan tidak ditemukan.");
  if (existing.pegawaiId !== current.id && current.role !== "ketua_tim") {
    throw new Error("Anda tidak dapat menghapus laporan ini.");
  }
  deleteRowById(SHEETS.LAPORAN, body.id);
  return { ok: true };
}
