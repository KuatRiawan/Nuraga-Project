# Laporan Audit Statis: Nuraga Safety Project
**Peran:** Senior QA Engineer, Lead Fullstack Developer, Security Expert
**Metode:** Blind Static Code Analysis
**Tanggal:** 4 Juni 2026

Berikut adalah hasil temuan audit menyeluruh dari *codebase* proyek ini, dikelompokkan berdasarkan area fokus dan tingkat keparahannya.

---

## 1. Performa & Skalabilitas (Performance & Scalability)

- 🔴 **CRITICAL: Potensi *Memory Leak* & *Over-fetching***
  Di file `frontend/src/pages/DashboardPage.jsx`, terdapat pemanggilan API yang tidak terpaginasi dengan baik: `api.get('/incidents?limit=1000')` dan `api.get('/hazards?limit=1000')`. Jika data insiden bertambah hingga puluhan ribu baris, memuat ribuan *array* objek sekaligus ke memori peramban (browser) akan menyebabkan *freeze* (aplikasi macet) dan *re-rendering* komponen tabel/grafik yang sangat lambat.
  *Saran:* Terapkan paginasi di *backend* dan *infinite scroll* atau *server-side pagination* di tabel React.

- 🟢 **SUGGESTION: Tidak Ditemukan Grafik Spline**
  Anda menyebutkan evaluasi komponen "Grafik Spline", namun dari pemindaian *codebase*, tidak ditemukan pustaka `@splinetool/react-spline` maupun komponen 3D Spline di dalam proyek ini. Jika ke depannya Anda berencana memasukkannya, pastikan melakukan *lazy loading* (`React.lazy`) karena *engine* 3D sangat memakan performa (*thread-blocking*).

## 2. Keamanan & Proteksi (Security & Protection)

- 🔴 **CRITICAL: Penyimpanan JWT di LocalStorage**
  Pemindaian menemukan `localStorage.setItem('token', ...)` di dalam `frontend/src/store/AuthContext.jsx` dan *interceptor* di `axios.js`. Menyimpan token akses di `localStorage` sangat rentan terhadap serangan **Cross-Site Scripting (XSS)**. Jika ada injeksi skrip berbahaya, token dapat dengan mudah dicuri.
  *Saran:* Segera migrasikan manajemen sesi menggunakan `HttpOnly Cookies` yang dikirim otomatis oleh *backend* pada setiap *request*.

- 🟢 **SUGGESTION: Proteksi Eksekusi Eksternal & Rate Limiting**
  *Rate limiting* (`express-rate-limit`) sudah terpasang dengan baik di `server.js` yang merupakan praktik bagus untuk mencegah DDoS/Brute-Force. Namun, pastikan layanan pihak ketiga (seperti WhatsApp Bot/Baileys) memiliki mekanisme *Circuit Breaker* atau *Mocking* saat status aplikasi berjalan di mode `development` agar tidak mengirimkan *spam* secara tidak sengaja saat proses *testing*.

## 3. Integritas Database (Database Integrity)

- 🟡 **WARNING: Inkonsistensi Definisi *Cascade* di Model Sequelize**
  Hanya beberapa model (seperti `LeaveRequest`, `FatigueLog`, `Attendance`) yang secara eksplisit mendefinisikan `onDelete: 'CASCADE'` di dalam kode model Sequelize-nya. Meskipun ada log migrasi yang menunjukkan batasan (constraint) di tingkat *database* telah diterapkan, tidak menulisnya secara seragam di seluruh definisi *Model* ORM dapat menyebabkan galat saat melakukan *seeding* masal ulang, atau menyebabkan *orphan records* (data yatim/gantung) jika *database* di-reset tanpa *script* migrasi yang tepat.

## 4. Konsistensi UI/UX (UI/UX Consistency)

- 🟡 **WARNING: Sisa *Dead Code* / *Console.log***
  Ditemukan cukup banyak `console.log` yang tertinggal di area produksi, salah satunya di dalam file utama `frontend/src/App.jsx` (misal: `console.log('PTW Request Created:', data);` dan banyak log soket lainnya). Hal ini bukan hanya mengotori konsol peramban pengguna, tapi juga berpotensi membocorkan struktur data mentah (*data leaks*) ke pihak luar.
  *Saran:* Gunakan *logger custom* yang otomatis mati (`disabled`) apabila `process.env.NODE_ENV === 'production'`.

- 🟢 **SUGGESTION: Penggunaan Modal/Popup**
  Audit tidak menemukan penggunaan `window.confirm` atau `window.alert` bawaan peramban sama sekali. Ini adalah indikator UI/UX yang sangat baik! Artinya sistem Anda telah sepenuhnya menggunakan komponen Modal/Dialog buatan sendiri secara konsisten di seluruh *sub-tab* aplikasi.

---
*Laporan ini dihasilkan dari hasil inspeksi kode buta (blind audit) tanpa modifikasi file secara langsung.*
