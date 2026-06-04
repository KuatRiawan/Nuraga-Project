# PANDUAN PENGGUNAAN & INSTALASI (USER MANUAL)
## NURAGA - Integrated Safety Intelligence

Dokumen ini berisi panduan teknis bagi pengembang (*developer*) dan penguji perangkat lunak, serta panduan operasional bagi pengguna akhir (*end-user*) untuk aplikasi Keselamatan dan Kesehatan Kerja (K3) Nuraga.

---

## 1. PANDUAN INSTALASI & TEKNIS (Untuk Penguji/Developer)

### 1.1 Prasyarat Sistem
Pastikan perangkat/server Anda telah menginstal lingkungan pengembangan berikut:
- **Node.js**: Versi 18.x atau lebih baru (direkomendasikan versi 20.x LTS).
- **PostgreSQL**: Versi 12 atau lebih baru.
- **NPM** atau **Yarn**: Untuk mengelola paket dependensi.
- **Git**: Untuk manajemen basis kode (repositori).

### 1.2 Cara Instalasi Dependensi
Aplikasi Nuraga dipisahkan ke dalam dua layanan mandiri: `frontend` dan `backend`. Buka terminal operasi Anda dan jalankan perintah instalasi berikut:

**Instalasi Backend:**
```bash
cd backend
npm install
```

**Instalasi Frontend:**
```bash
cd frontend
npm install
```

### 1.3 Konfigurasi File `.env`
Sistem ini menggunakan berkas Environment untuk menyimpan rahasia *server*. Buat file `.env` di dalam folder masing-masing.

**Backend (`backend/.env`):**
```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password_database_anda
DB_NAME=nuraga_db
JWT_SECRET=rahasia_jwt_anda
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```
*(Catatan: Sesuaikan nilai `DB_PASSWORD` dan `DB_USER` dengan profil database PostgreSQL lokal Anda).*

### 1.4 Migrasi Database & Seeder Data Masal
Untuk menyiapkan struktur tabel di dalam basis data dan mengisinya dengan ribuan data contoh (data *dummy*) secara otomatis:

1. Buat database baru bernama `nuraga_db` melalui pgAdmin atau terminal PostgreSQL (psql).
2. Menjalankan *Seeder*: Panggil perintah *seed* dari direktori backend untuk memproduksi ratusan pekerja (*users*) fiktif berserta riwayat absensi, insiden, dan laporan bahaya secara acak namun masuk akal.
```bash
cd backend
npm run seed
```
*(Tunggu hingga indikator terminal menampilkan centang hijau "500 Users generated" dan riwayat transaksi selesai dimasukkan).*

### 1.5 Menjalankan Server Lokal

**Backend (Node.js/Express):**
Untuk menjalankan *server backend* pada mode pengembangan (dilengkapi dengan *nodemon*):
```bash
cd backend
npm run dev
```
*(Server akan beroperasi di port 5000. Terminal juga akan memunculkan tautan QR Code WebSocket untuk integrasi Notifikasi Bot WhatsApp Baileys).*

**Frontend (React/Vite):**
Untuk memutar antarmuka pengguna berbasis React:
```bash
cd frontend
npm run dev
```
*(Akses antarmuka melalui peramban web pada tautan lokal `http://localhost:5173` atau port lain yang disesuaikan oleh Vite).*

---

## 2. PANDUAN PENGGUNAAN APLIKASI (User Manual)

### 2.1 Hak Akses dan Peran (Roles)
Aplikasi Nuraga menggunakan arsitektur **Kontrol Akses Berbasis Peran** (*Role-Based Access Control/RBAC*). Setiap pengguna memiliki batasan menu yang disesuaikan dengan tanggung jawab jabatannya:

- **Staff / Operator / Vendor**: Pekerja lapangan (tingkat dasar). Mereka dapat melakukan presensi/absensi kebugaran setiap hari, mengirim laporan temuan bahaya/insiden, dan mengajukan draf izin kerja (*e-PTW*).
- **Supervisor (SPV)**: Tingkat pengawas. Mengawasi absensi staf bawahannya, menyetujui izin kerja pada lapis pertama, dan melakukan inspeksi rutin.
- **HSE (Safety Officer)**: Petugas ahli K3. Menguasai manajemen Gamifikasi (*Safety Rewards*), menerbitkan tindakan korektif (CAPA) atas sebuah insiden, dan melakukan validasi mutlak terhadap semua permohonan keamanan lapangan.
- **Manager / Admin**: Tingkat akses tertinggi. Memiliki wewenang manajemen pengguna (tambah, edit, hapus akun), pengaturan konfigurasi situs, dan akses penuh ke statistik keseluruhan organisasi.

> **[INFO] Kredensial Akun Tester (Dari Data Seeder):**
> Bila menggunakan data hasil *seeder*, Anda bisa bereksperimen dengan *login* menggunakan akun otomatis, yaitu email dengan rentang dari `dummy1@faker.local` hingga `dummy500@faker.local`.
> **Password Bawaan (Default):** `123456`

### 2.2 Penjelasan Fitur Per Modul

1. **Dashboard**: Panel kendali interaktif (dilengkapi bagan *Spline*) yang menunjukkan performa dan indikator K3 *real-time*. Termasuk metrik TRIR (*Total Recordable Incident Rate*) dan tren kemunculan temuan K3 (Hazard).
2. **Absensi Harian & Prediksi Kelelahan (Fatigue AI)**: 
   - Dilengkapi fungsi navigasi *Sub-Tab*. Buka **"Riwayat Absensi"** untuk melihat rekam jejak.
   - Pekerja menginput jam tidur harian. Sistem komputasi AI kemudian akan memberikan indikator kelayakan bekerja (*Aman, Waspada, Bahaya*).
3. **Pencarian Skala Besar**: Fitur pencarian tabel (karyawan, insiden, laporan) berjalan dengan mekanisme *Paginasi Backend* dinamis, sehingga memuat ribuan data dengan sangat ringan.
4. **Safety Rewards (Gamifikasi K3)**: Fitur papan peringkat (*Leaderboard*) yang dibatasi **Top 20** besar. Tujuannya adalah merangsang budaya kompetisi positif dalam melaporkan bahaya (makin banyak lapor, skor apresiasi K3 semakin besar).

### 2.3 Alur Dasar Penggunaan (Workflow)

**A. Membuat Laporan Bahaya (Hazard Report)**
1. Klik menu **Laporan Bahaya** dari navigasi samping (*sidebar*).
2. Klik tombol **Buat Laporan**.
3. Isi kolom rincian temuan bahaya, pilih area kerja, serta level bahaya (*Low/Medium/High/Extreme*), lalu unggah foto lapangan.
4. Klik **Simpan**. Laporan yang dikirim akan menanti respon (status *Pending*) dari petugas HSE.

**B. Pengajuan & Persetujuan Izin Kerja Bertingkat (e-PTW)**
1. Staf membuka menu **Izin Kerja (e-PTW)** dan mengajukan tiket izin kerja risiko tinggi (seperti pekerjaan panas/ruang terbatas).
2. Tiket yang dikirim akan berstatus **Menunggu SPV**.
3. Pengawas lini pertama (*Supervisor*) menyetujui izin tersebut secara digital.
4. Status berpindah ke **Menunggu HSE**. Jika HSE menilai formulir JSA (*Job Safety Analysis*) telah terpenuhi, izin baru akan disahkan sepenuhnya menjadi aktif.

**C. Eksekusi Tindakan Perbaikan Insiden (CAPA)**
1. Saat insiden fatal tercatat, petugas HSE dapat mendelegasikan tugas (*Task*) korektif ke staf pada menu **Tindakan Perbaikan**.
2. Staf yang ditugaskan (*Assigned To*) masuk ke akunnya dan menandai tugas tersebut sebagai **Selesai**, sambil melampirkan foto bukti perbaikan mesin/infrastruktur.
3. HSE memeriksa dan menutup (*Close*) kasus insiden tersebut jika divalidasi aman.
