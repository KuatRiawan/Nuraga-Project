# PANDUAN PENGGUNAAN APLIKASI NURAGA
*(Integrated Safety Intelligence System)*

---

## 1. PENDAHULUAN

Aplikasi **Nuraga** merupakan *Integrated Safety Intelligence System* (Sistem Kecerdasan Keselamatan Terintegrasi) yang dirancang secara khusus untuk mendigitalisasi dan mengoptimalkan seluruh aspek manajemen Keselamatan dan Kesehatan Kerja (K3) di lingkungan industri maupun proyek konstruksi. 

Tujuan utama dari aplikasi ini adalah untuk membantu organisasi mencapai target **nol kecelakaan (*zero accident*)** dan membangun budaya keselamatan kerja yang proaktif. Dengan Nuraga, perusahaan dapat memantau tingkat kelelahan pekerja, memproses izin kerja secara digital, menerima laporan bahaya (*hazard*) dan insiden secara *real-time*, serta memotivasi pekerja melalui sistem penghargaan berbasis poin (gamifikasi).

---

## 2. HAK AKSES PENGGUNA (ROLES)

Sistem Nuraga dilengkapi dengan fitur Kontrol Akses Berbasis Peran (*Role-Based Access Control*). Setiap pengguna memiliki batasan menu dan fitur sesuai dengan jabatan dan tanggung jawabnya. Berikut adalah pembagian perannya:

- **Staff / Operator / Vendor**
  - *Peran:* Pekerja lapangan atau pihak ketiga.
  - *Akses:* Melakukan absensi (masuk/keluar), melaporkan potensi bahaya (*hazard*), mengajukan izin kerja, melihat profil dan sertifikat sendiri, serta menukarkan poin hadiah (*reward*).

- **Supervisor (SPV)**
  - *Peran:* Pengawas lapangan.
  - *Akses:* Memantau tingkat kehadiran dan kelelahan anggota timnya, serta memberikan persetujuan tahap pertama untuk pengajuan izin kerja (e-PTW).

- **HSE (*Health, Safety, and Environment*) Officer**
  - *Peran:* Petugas Keselamatan Kerja.
  - *Akses:* Melihat statistik analitik keselamatan, memverifikasi laporan insiden, menyetujui dokumen penting, mengawasi laporan bahaya, melakukan audit, dan mengelola sistem gamifikasi.

- **Manager**
  - *Peran:* Manajemen tingkat eksekutif.
  - *Akses:* Mengakses dasbor manajerial yang menampilkan metrik K3 secara komprehensif, melihat analitik tingkat kelelahan perusahaan, dan memberikan persetujuan akhir.

- **Admin**
  - *Peran:* Administrator Sistem.
  - *Akses:* Memiliki kendali penuh (*full access*) terhadap semua fitur aplikasi, termasuk manajemen pengguna, pengaturan modul, dan penyelesaian masalah (*troubleshooting*).

---

## 3. PANDUAN NAVIGASI & FITUR UTAMA

Berikut ini adalah penjelasan detail mengenai menu-menu utama dan cara bernavigasi di dalam aplikasi berdasarkan antarmuka (*UI/UX*) yang telah disediakan:

### 3.1 Dashboard & Visualisasi
Saat Anda pertama kali masuk (Login), Anda akan diarahkan ke halaman **Dashboard**. Halaman ini menampilkan ringkasan data yang divisualisasikan dengan menarik.
- **Grafik Garis (*Spline Chart*):** Digunakan untuk menampilkan tren keselamatan dari waktu ke waktu (misalnya jumlah laporan insiden vs laporan bahaya bulanan). Arahkan kursor Anda ke titik-titik pada grafik untuk melihat rincian angkanya.
- **Skor Keselamatan:** Menampilkan persentase kepatuhan atau kesehatan secara keseluruhan (*overall safety score*). Warna indikator (Hijau/Kuning/Merah) akan membantu Anda mengidentifikasi status K3 sekilas.

### 3.2 Modul Pekerja (Daftar Pekerja)
Untuk melihat daftar karyawan, masuk ke menu **Pekerja**.
- **Pencarian (*Search Bar*):** Gunakan kotak pencarian di bagian atas tabel untuk mencari pekerja secara spesifik. Anda bisa mengetikkan **Nama** pekerja, lalu tabel akan secara otomatis menyaring data dan hanya menampilkan hasil yang relevan.

### 3.3 Modul Absensi & Izin/Cuti
Di dalam menu **Absensi**, pekerja dapat mencatatkan kehadiran harian, sedangkan pengawas dapat melihat riwayat kehadiran tim.
- **Sub-Tab Pil (*Pill Tabs*):** Di bagian riwayat laporan, terdapat tombol navigasi berbentuk "pil" oval di bagian atas layar (misal: **[Riwayat Absensi]** dan **[Riwayat Izin/Cuti]**). Cukup klik salah satu tombol pil tersebut untuk beralih antara daftar kehadiran dan daftar izin tanpa perlu membuka halaman baru atau menggulir layar (*scroll*) panjang ke bawah.

### 3.4 Pelaporan Keselamatan (Hazard & Incident)
- **Laporan Bahaya (*Hazard*):** Pekerja dapat memfoto kondisi tidak aman di lapangan, memberikan deskripsi, dan mengirimkannya. 
- **Laporan Insiden:** Jika terjadi kecelakaan, laporan insiden diisi dengan tingkat keparahannya.
- **Tindakan Perbaikan (CAPA):** Setiap bahaya atau insiden yang masuk dapat ditautkan ke menu tindakan perbaikan untuk dikerjakan. Laporan tidak bisa berstatus selesai sebelum tindakan perbaikannya dituntaskan.

### 3.5 Izin Kerja (*Permit to Work*) & Audit
- **Izin Kerja:** Merupakan formulir digital untuk pekerjaan berisiko tinggi. Pengguna cukup memilih jenis pekerjaan (misal: Kerja di Ketinggian) dan izin tersebut akan masuk ke alur persetujuan Supervisor dan HSE.
- **Audit K3:** Formulir ceklis inspeksi harian yang dapat diisi melalui aplikasi saat melakukan patroli area kerja.

### 3.6 Profil & Sertifikasi K3
Setiap pekerja dapat mengakses **Profil** mereka melalui ikon foto di pojok layar.
- **Sertifikasi Dinamis:** Di halaman profil, akan ada daftar kartu (*card*) yang menampilkan sertifikat keahlian K3 pekerja (misal: SIO Forklift atau Sertifikat Ahli K3 Umum). Kartu ini akan menampilkan status validitas sertifikat (Aktif/Akan Kedaluwarsa/Kedaluwarsa).

### 3.7 Sistem Reward (Gamifikasi)
Sebagai bentuk apresiasi karena aktif menjaga keselamatan (seperti rajin melaporkan *Hazard* atau masuk kerja tepat waktu), pekerja akan mendapatkan poin.
- Poin yang terkumpul dapat dilihat pada pojok layar atau halaman **Reward**.
- **Klaim Voucher:** Poin dapat ditukar dengan voucer dalam **kelipatan 100** (misalnya 100 poin untuk Rp 100.000, 200 poin untuk Rp 250.000).

---

## 4. PANDUAN LANGKAH DEMI LANGKAH (STEP-BY-STEP)

Berikut adalah panduan praktis untuk melakukan tugas umum di dalam aplikasi:

### 4.1 Cara Melaporkan Bahaya (*Hazard*)
1. Masuk ke aplikasi dan pilih menu **Lapor Bahaya** dari bilah navigasi samping (*sidebar*).
2. Klik tombol **Buat Laporan Baru**.
3. Di dalam formulir, pilih **Kategori Bahaya** (misalnya: Masalah Kelistrikan, Ceceran Bahan Kimia).
4. Ketikkan penjelasan rinci di kolom **Deskripsi** tentang apa bahaya yang Anda temukan.
5. Pilih **Tingkat Risiko** perkiraan Anda (Rendah/Sedang/Tinggi).
6. Ketik lokasi spesifik temuan tersebut.
7. Klik tombol **Unggah Foto** dan pilih foto dari galeri gawai Anda sebagai bukti.
8. Klik tombol **Kirim Laporan**. Sistem akan memberikan notifikasi bahwa laporan berhasil diajukan kepada HSE.

### 4.2 Cara Menukarkan Poin Reward
1. Pastikan Anda memiliki saldo poin yang mencukupi (minimal 100 poin). Anda bisa mengeceknya di angka sebelah ikon bintang di navigasi.
2. Buka menu **Reward / Hadiah**.
3. Sistem akan menampilkan daftar katalog voucer yang tersedia. Pilih voucer yang nilainya sesuai dengan poin Anda (ingat, sistem menggunakan **kelipatan 100 poin**).
4. Klik tombol **Klaim Voucer** pada item yang Anda inginkan.
5. Sebuah dialog konfirmasi akan muncul. Klik **Ya, Tukarkan Poin**.
6. Poin Anda akan terpotong secara otomatis, dan voucer digital (beserta kodenya) akan masuk ke menu tab "Voucer Saya". Anda bisa menunjukkan kode ini kepada petugas HR/koperasi untuk dicairkan.

### 4.3 Cara Melakukan Absensi (Masuk Kerja)
1. Buka menu **Absensi**.
2. Anda akan melihat formulir penilaian mandiri kelelahan (*fatigue*).
3. Geser *slider* atau isi kolom untuk mengonfirmasi **Jumlah Jam Tidur** Anda semalam dan **Tingkat Stres** yang Anda rasakan hari ini.
4. Klik tombol ikon kamera **"Ambil Foto Selfie"**. Kamera depan peramban Anda akan terbuka. Posisikan wajah Anda dengan jelas, lalu ambil gambar.
5. Klik tombol hijau **Absen Masuk (Clock In)**. 
6. Status Anda otomatis tercatat di sistem beserta zona warna kelelahan (Hijau/Kuning/Merah) untuk dipantau oleh pengawas Anda.
