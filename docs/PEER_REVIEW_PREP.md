# PERSIAPAN PEER REVIEW - SISTEM NURAGA
**Tanggal Pelaksanaan:** 9 Juni 2026
**Tim:** CC26-PRU428

Dokumen ini adalah panduan persiapan komprehensif bagi tim internal untuk menghadapi *Peer Review*. Pastikan semua poin di bawah ini telah disiapkan, diuji, dan dipahami oleh seluruh anggota tim yang akan melakukan presentasi atau demonstrasi.

---

## 1. PERSIAPAN INFRASTRUKTUR & AKSES

Sebelum *review* dimulai, pastikan aset-aset berikut sudah siap dan berjalan lancar:
- [ ] **Tautan Aplikasi Produksi (Live URL):** Pastikan aplikasi dapat diakses tanpa *down-time* di AWS EC2.
- [ ] **Kredensial Pengujian (Test Accounts):** Siapkan daftar akun untuk mendemonstrasikan Role-Based Access Control (RBAC).
  - *Admin:* `admin@nuraga.com` / `password123`
  - *Manager:* `manager@nuraga.com` / `password123`
  - *HSE:* `hse@nuraga.com` / `password123`
  - *Staff/Pekerja:* `staff@nuraga.com` / `password123`
- [ ] **Dokumentasi Proyek:** Pastikan tautan ke `NURAGA_SRS.md`, `NURAGA_PRD.md`, dan `USER_GUIDE.md` siap dibagikan jika *reviewer* memintanya.
- [ ] **Layanan Pihak Ketiga:** Pastikan *Bot* WhatsApp (Baileys) aktif dan *smartphone* penguji sudah siap memindai QR (jika sesi *bot* perlu diulang) atau menerima pesan siaran.

---

## 2. CHECKLIST SKENARIO DEMONSTRASI (LIVE DEMO)

Gunakan alur skenario berikut agar presentasi berjalan sistematis, lancar, dan meng- *highlight* nilai jual utama aplikasi Nuraga:

### Skenario A: Pelaporan K3 dan Persetujuan (HSE/Manager)
1. **Login sebagai Pekerja:** Tunjukkan *dashboard* dari kacamata pekerja biasa.
2. **Lapor Bahaya (*Hazard*):** Buat satu laporan bahaya baru (sertakan foto dan deskripsi).
3. **Login sebagai HSE:** Pindah akun ke HSE, tunjukkan notifikasi (Socket.IO) yang masuk secara *real-time*.
4. **Tindakan Perbaikan (CAPA):** Demonstrasikan bagaimana HSE menautkan laporan bahaya tersebut ke formulir CAPA dan menugaskan penyelesaiannya.

### Skenario B: Sistem Izin Kerja (e-PTW)
1. **Pengajuan (Pekerja):** Ajukan Izin Kerja Risiko Tinggi (misal: Ruang Terbatas / *Confined Space*).
2. **Persetujuan (Supervisor):** Login sebagai Supervisor, lakukan persetujuan level 1.
3. **Persetujuan Akhir (HSE):** Lakukan persetujuan final hingga PTW terbit.

### Skenario C: Tanggap Darurat & WhatsApp Bot
1. **Pemicu Darurat:** Tekan tombol SOS Darurat di aplikasi.
2. **Notifikasi *Real-Time*:** Perlihatkan bahwa layar seluruh pengguna berubah menjadi merah (Alert SOS) tanpa perlu *refresh*.
3. **Notifikasi WhatsApp:** Perlihatkan bukti bahwa pesan siaran/peringatan darurat masuk ke WhatsApp melalui integrasi Baileys.
4. **Penyelesaian Darurat:** Tutup status darurat dan tunjukkan notifikasi hijau (kondisi aman) di layar semua pengguna.

### Skenario D: Absensi Pintar & Gamifikasi
1. **Pemeriksaan Kelelahan:** Lakukan absensi (*clock in*) dengan kuesioner kelelahan (*sleep hours* & *stress level*).
2. **Tukar Poin (*Reward*):** Tunjukkan saldo poin pekerja yang bertambah dan simulasikan penukaran voucer.

---

## 3. HIGHLIGHT TEKNIKAL & ARSITEKTUR (Untuk Sesi Tanya Jawab)

*Reviewer* biasanya akan menanyakan keputusan teknis dan seberapa aman/skalabel kode yang ditulis. Siapkan jawaban berikut:

- **Arsitektur Waktu-Nyata (*Real-time*):** Kita menggunakan **Socket.IO** untuk komunikasi dua arah sehingga notifikasi, alarm darurat, dan pembaruan *dashboard* terjadi seketika (*instant*).
- **Keamanan Autentikasi:** Kita **tidak menyimpan token JWT di LocalStorage** untuk mencegah pencurian XSS, melainkan menggunakan sistem **Kuki HttpOnly** (*HttpOnly Cookies*) yang lebih aman, beserta perlindungan CORS (*Cross-Origin Resource Sharing*).
- **Integritas Data:** Basis data PostgreSQL dikelola melalui ORM Sequelize dengan penerapan `ON DELETE CASCADE` untuk menjaga integritas relasional, serta pembungkus transaksi (*Database Transactions*) untuk operasi sensitif agar tidak terjadi data korup jika koneksi terputus.
- **Pencegahan *Spam* (*Rate Limiting*):** Pada *backend*, terdapat `express-rate-limit` yang membatasi panggilan *API* guna mencegah serangan *Brute-Force* dan (D)DoS.
- **Bot Notifikasi Kustom:** Tidak menggunakan API berbayar, melainkan mengimplementasikan pustaka **Baileys (WebSockets)** untuk membangun bot WhatsApp yang persisten dan terintegrasi langsung dengan ekosistem aplikasi.

---

## 4. PEMBAGIAN PERAN SAAT PRESENTASI

Bagi tugas agar setiap anggota tim terlihat aktif saat *peer review*:
- **Anggota 1 (System Analyst/PM):** Membuka presentasi, menjelaskan masalah K3 di lapangan, solusi (Nuraga), dan struktur dokumen SRS/PRD.
- **Anggota 2 (Frontend Engineer):** Melakukan "Setir" layar (Demo UI/UX), menjelaskan pendekatan React Context API, arsitektur tata letak, dan implementasi UI *dashboard*.
- **Anggota 3 (Backend Engineer):** Membantu menjawab pertanyaan teknis terkait keamanan (Kuki HttpOnly, Rate Limiting), desain basis data ERD, dan demonstrasi arsitektur Socket.IO & Baileys WA Bot.

---
**Catatan Penting:** 
Lakukan gladi bersih (*dry-run*) skenario di atas minimal 1-2 kali sebelum tanggal 9 Juni untuk membiasakan perpindahan peran dan meminimalisir *bug* saat *live demo*. Semoga sukses!
