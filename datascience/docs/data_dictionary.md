# Data Dictionary - WellGuard & Hazard-NLP

## 📊 Dataset 1: wellguard.csv (102,000 baris x 7 kolom)

Dataset utama untuk prediksi kelelahan pekerja (fatigue).

| Kolom | Tipe Data | Deskripsi | Range / Nilai |
|:---|:---|:---|:---|
| `id` | Integer | ID unik setiap karyawan | 1 - 102,000 |
| `age` | Integer | Usia karyawan dalam tahun | 18 - 69 tahun |
| `sex` | Float | Jenis kelamin (0 = Female, 1 = Male) | 0.0 / 1.0 |
| `sleep` | Float | Rata-rata durasi tidur per malam | 3.0 - 10.5 jam |
| `shift` | Integer | Shift kerja (1 = reguler) | 1 |
| `stress` | Float | Tingkat stress (skala 1-10) | 1.0 - 10.0 |
| `fatigue` | Integer | Level kelelahan (target variable) | 0 = Rendah, 1 = Sedang, 2 = Tinggi |

### Distribusi Fatigue
| Level | Kode | Jumlah | Persentase |
|:---|:---|:---|:---|
| Rendah | 0 | 22,589 | 22.1% |
| Sedang | 1 | 69,520 | 68.2% |
| Tinggi | 2 | 9,891 | 9.7% |

---

## 📝 Dataset 2: nlp.csv (5,272 baris x 2 kolom)

Dataset teks untuk klasifikasi laporan bahaya (Hazard-NLP).

| Kolom | Tipe Data | Deskripsi | Contoh |
|:---|:---|:---|:---|
| `text_description` | String | Deskripsi kecelakaan atau potensi bahaya | "While removing the drill rod, the bar slides and tightens the mechanic's fingers..." |
| `source` | String | Sumber data | `industrial_safety` (425 baris) / `osha` (4,847 baris) |

---

## 🔧 Feature Engineering (Fitur Turunan)

Fitur tambahan yang dibuat dari kolom existing untuk meningkatkan performa model:

| Fitur | Rumus | Deskripsi |
|:---|:---|:---|
| `stress_sleep_ratio` | stress / (sleep + 1) | Rasio stress terhadap tidur (semakin tinggi, semakin buruk) |
| `sleep_deficit` | 7 - sleep | Kekurangan tidur dari target 7 jam (nilai positif = kurang tidur) |
| `age_stress` | (age × stress) / 100 | Interaksi antara usia dan stress |
| `sleep_sq` | sleep² | Kuadrat tidur (menangkap efek non-linear) |
| `stress_sq` | stress² | Kuadrat stress (menangkap efek non-linear) |
| `age_sq` | age² | Kuadrat usia |
| `sex_stress` | sex × stress | Interaksi gender dan stress |

---

## 📈 Statistik Ringkasan (wellguard.csv)

| Kolom | Mean | Std | Min | Max |
|:---|:---|:---|:---|:---|
| age | 34.83 | 11.07 | 18 | 69 |
| sleep | 6.43 | 1.28 | 3.0 | 10.5 |
| stress | 5.73 | 1.62 | 1.0 | 10.0 |
| fatigue | 0.88 | 0.55 | 0 | 2 |

> **Catatan:** Dataset memiliki 2,053 missing values pada kolom `sex` yang telah diisi dengan nilai default.