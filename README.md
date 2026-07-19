# Manajemen Kinerja Tim — BPS Kabupaten Puncak

Aplikasi web manajemen kinerja tim berbasis Google Apps Script sebagai backend dan Google Sheets sebagai database.

## Alur Kerja

1. **Ketua Tim** menentukan aktivitas dengan target → menugaskan ke pegawai
2. **Pegawai** mengambil aktivitas yang ditugaskan → mengunggah bukti dukung → melaporkan capaian
3. **Ketua Tim** memantau progress → mendownload seluruh rekap aktivitas & log laporan (CSV)

## Cara Setup

### Langkah 1: Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama: **Manajemen Kinerja Tim — BPS Kabupaten Puncak**

### Langkah 2: Buka Script Editor

1. Di spreadsheet, klik menu **Extensions → Apps Script**
2. Hapus isi default, lalu tempelkan seluruh isi **`Code.gs`** yang ada di repositori ini

### Langkah 3: Setup Spreadsheet

1. Di Apps Script Editor, pilih fungsi **`setupSpreadsheet`** dari dropdown fungsi
2. Klik tombol **Run** (▶)
3. Berikan izin akses saat diminta (pertama kali saja)
4. Spreadsheet akan otomatis membuat tab: `Users`, `Aktivitas`, `Laporan`, `Referensi`, `Config`

### Langkah 4: Isi Data Referensi

Buka tab **`Referensi`** di spreadsheet dan isi kolom:

| tujuan | sasaran | iku | kegiatan | subKegiatan |
|--------|---------|-----|----------|-------------|
| Tujuan 1 | Sasaran 1 | IKU 1 | Kegiatan 1 | Sub Kegiatan 1 |
| Tujuan 1 | Sasaran 1 | IKU 1 | Kegiatan 1 | Sub Kegiatan 2 |
| Tujuan 1 | Sasaran 1 | IKU 1 | Kegiatan 2 | Sub Kegiatan 1 |

> **Penting:** Setiap baris = satu kombinasi tujuan/sasaran/IKU/kegiatan/subKegiatan. Jangan ada baris kosong di tengah data.

### Langkah 5: Deploy sebagai Web App

1. Di Apps Script Editor, klik **Deploy → New deployment**
2. Klik ikon gear → pilih **Web app**
3. Isi:
   - **Description:** `Manajemen Kinerja Tim v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Klik **Deploy**
5. **Salin URL Web App** yang muncul

### Langkah 6: Hubungkan ke Frontend

1. Buka file **`index.html`** dengan text editor
2. Cari baris:
   ```javascript
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/...";
   ```
3. Ganti URL dengan URL Web App yang sudah Anda salin di Langkah 5
4. Buka `index.html` di browser → halaman login akan muncul

### Langkah 7: Buat Akun Pertama

- Saat pertama membuka aplikasi, akan muncul form **Bootstrap** (akun pertama)
- Isi nama, pilih peran **Ketua Tim**, buat kata sandi
- Ketua Tim inilah yang nantinya bisa menambah pegawai lain

## Struktur Tab Spreadsheet

| Tab | Keterangan |
|-----|-----------|
| `Users` | Data pengguna (id, nama, role, passwordHash, token) |
| `Aktivitas` | Rencana aktivitas dengan hierarki tujuan/IKU/kegiatan |
| `Laporan` | Log laporan harian pegawai beserta bukti dukung |
| `Referensi` | Data referensi Tujuan → Sasaran → IKU → Kegiatan → Sub Kegiatan |
| `Config` | Pengaturan aplikasi (key-value) |

## Fitur

### Ketua Tim
- Dashboard dengan ringkasan kinerja tim
- Membuat/mengubah/menghapus aktivitas berdasarkan struktur rencana kinerja
- Menugaskan aktivitas ke pegawai (multi-select)
- Melihat rekap seluruh aktivitas dan laporan
- Mengelola anggota tim (tambah/ubah/hapus pegawai & ketua tim)
- Download rekap aktivitas dan log harian (CSV)

### Pegawai
- Melihat aktivitas yang ditugaskan
- Membuat laporan harian dengan:
  - Pilihan aktivitas
  - Uraian pekerjaan
  - Capaian (angka)
  - Bukti dukung (link URL atau unggahan file ke Google Drive)
- Melihat riwayat laporan pribadi
- Rekap tim (read-only, bisa filter)

## Deployment Update

Saat mengubah kode `Code.gs`:
1. Buka Apps Script Editor
2. Klik **Deploy → Manage deployments**
3. Klik ikon edit (pensil) pada deployment
4. Ubah **Version** ke `New version`
5. Klik **Deploy**

> **Catatan:** URL Web App tetap sama selama menggunakan deployment yang sama.
