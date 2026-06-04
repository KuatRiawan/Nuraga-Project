# Nuraga: Integrated Safety Intelligence System

[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Status](https://img.shields.io/badge/status-Production-success)]()

> **Sistem kecerdasan keselamatan terintegrasi untuk memprediksi, mencegah, dan mengelola risiko kecelakaan kerja.**

---

## Tentang Nuraga

**Nuraga** adalah platform berbasis kecerdasan buatan yang membantu perusahaan dalam menciptakan lingkungan kerja yang lebih aman dan sehat. Nama "Nuraga" mencerminkan filosofi bahwa setiap pekerja adalah manusia berharga, bukan sekadar angka dalam statistik kecelakaan.

Dengan menggabungkan prediksi kelelahan, klasifikasi bahaya otomatis, dan manajemen sertifikasi K3, Nuraga memungkinkan perusahaan beralih dari pendekatan **reaktif** menjadi **prediktif** dalam menjaga keselamatan pekerja.

---

## Fitur Utama

### 🔮 WellGuard - Prediksi Kelelahan
Memprediksi tingkat kelelahan pekerja berdasarkan jam kerja, shift, dan jenis pekerjaan. Hasil prediksi dapat digunakan untuk mengoptimalkan jadwal kerja dan mencegah kecelakaan akibat kelelahan.

### ⚠️ Hazard-NLP - Klasifikasi Laporan Bahaya
Pekerja dapat melaporkan potensi bahaya melalui teks alami. Sistem secara otomatis mengklasifikasikan laporan ke dalam kategori risiko (listrik, mekanik, kimia, ergonomi, dll.) dan menentukan tingkat prioritas penanganan.

### 📋 Safety Certification Management
Manajemen sertifikasi pekerja (P3K, penanggulangan kebakaran, dll.) dengan fitur:
- Pencatatan dan pelacakan masa berlaku sertifikat
- Notifikasi otomatis menjelang kadaluarsa
- Laporan kompetensi tim per departemen

### 📊 K3 Metrics Dashboard
Dashboard interaktif yang menampilkan metrik keselamatan kerja secara real-time:
- *Accident Frequency Rate* (AFR)
- *Severity Rate* (SR)
- Tren kecelakaan per periode
- Heatmap lokasi rawan kecelakaan

---

## Cara Kerja Nuraga

| Langkah | Proses | Keterangan |
|:---:|:---|:---|
| **1** | 👷 **Input dari Pekerja** | Laporan bahaya, data jam kerja/shift, data sertifikasi |
| **2** | ⚠️ **Hazard NLP** | Mengklasifikasikan laporan bahaya ke dalam kategori risiko |
| **3** | 😴 **WellGuard** | Memprediksi tingkat kelelahan pekerja |
| **4** | 📜 **Manajemen Sertifikasi** | Mengelola data kompetensi & masa berlaku sertifikat |
| **5** | 🧠 **AI Engine (TensorFlow)** | Memproses seluruh data dengan model custom |
| **6** | 📊 **Dashboard & Notifikasi** | Menampilkan metrik K3 dan mengirim notifikasi |
| **7** | 👔 **Manajer K3** | Melihat data, menganalisis, dan mengambil tindakan |

## Manfaat untuk Perusahaan

| Manfaat | Deskripsi |
|:---|:---|
| **Penurunan kecelakaan kerja** | Prediksi dini mencegah insiden sebelum terjadi |
| **Efisiensi pelaporan** | Klasifikasi otomatis mempercepat tindak lanjut laporan bahaya |
| **Kepatuhan regulasi** | Manajemen sertifikasi terpusat memudahkan audit K3 |
| **Pengambilan keputusan berbasis data** | Dashboard metrik membantu evaluasi kebijakan keselamatan |

---

## Teknologi yang Digunakan

| Komponen | Teknologi |
|:---|:---|
| **Model AI** | TensorFlow (Custom Architecture) |
| **AI Service** | FastAPI (Python) |
| **Backend API** | Node.js, Express.js |
| **Dashboard** | Streamlit |
| **Database** | PostgreSQL |
| **Deployment** | Docker, Hercules |

---

## Petunjuk Setup Environment

Sistem ini terdiri dari 3 komponen utama: Frontend, Backend, dan AI Service. Berikut adalah cara untuk mengatur *environment* (lingkungan kerja) untuk masing-masing komponen:

1. **Backend (`/backend`)**
   - Masuk ke direktori `backend`.
   - Salin file `.env.example` menjadi `.env` (contoh di terminal: `cp .env.example .env`).
   - Buka file `.env` dan sesuaikan nilai variabel seperti kredensial database (DB_USER, DB_PASS), `JWT_SECRET`, dan lainnya agar sesuai dengan lokal Anda.

2. **Frontend (`/frontend`)**
   - Masuk ke direktori `frontend`.
   - Salin file `.env.example` menjadi `.env` (contoh di terminal: `cp .env.example .env`).
   - Pastikan URL API menunjuk ke server backend yang tepat.

3. **AI Service (`/aiservice`)**
   - AI service tidak memerlukan file `.env` khusus untuk dijalankan secara dasar (kecuali ditambahkan integrasi lanjutan).

---

## Cara Menjalankan Aplikasi

Aplikasi dapat dijalankan baik menggunakan Docker maupun secara manual (lokal).

### Opsi 1: Menjalankan dengan Docker (Rekomendasi)
Untuk kemudahan setup, Anda dapat menjalankan seluruh layanan sekaligus menggunakan Docker Compose.
```bash
# Pastikan Anda berada di direktori root proyek
docker-compose up -d --build
```
*(Catatan: Pastikan file `docker-compose.yml` telah tersedia jika memilih opsi ini).*

### Opsi 2: Menjalankan Secara Manual (Lokal)

**1. Menjalankan Backend (Node.js)**
```bash
cd backend
npm install
npm run dev
```

**2. Menjalankan AI Service (Python / FastAPI)**
Buka terminal/tab baru dan jalankan:
```bash
cd aiservice
python -m venv .venv
source .venv/bin/activate  # Untuk Windows gunakan: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**3. Menjalankan Frontend (React/Vite)**
Buka terminal/tab baru dan jalankan:
```bash
cd frontend
npm install
npm run dev
```

---

## Tautan Model ML

Proyek ini memanfaatkan model AI untuk fitur prediksi kelelahan (WellGuard) dan klasifikasi bahaya (Hazard-NLP).

> **🔗 LINK MODEL ML GOOGLE DRIVE:** `https://drive.google.com/drive/folders/1vha7juCjcoUO4XWSxib-zvedRy18LyUv?usp=sharing`





---

## Roadmap Pengembangan

| Fitur | Status |
|:---|:---|
| WellGuard (Prediksi Kelelahan) | ✅ Rilis v1.0 |
| Hazard-NLP (Klasifikasi Bahaya) | ✅ Rilis v1.0 |
| Manajemen Sertifikasi | ✅ Rilis v1.0 |
| Dashboard Metrik K3 | ✅ Rilis v1.0 |
| Mobile App (Android/iOS) | ✅ Rilis v1.0 |
| Real-time Alert System | ✅ Rilis v1.0 |
| Integrasi IoT (Wearables) | 📋 Terencana |

---

## Kontak & Dukungan

- **Email**: cc26-pru428@student.devacademy.id

---

## Lisensi

Hak Cipta © 2026 Tim Capstone CC26-PRU428

Dilisensikan di bawah [MIT License](LICENSE).

---

<div align="center">
  <b>Nuraga</b><br>
  <i>"Manusia yang dilindungi, bukan sekadar angka yang tercatat."</i>
</div>
