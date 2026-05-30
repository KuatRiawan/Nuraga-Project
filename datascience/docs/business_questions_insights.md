# Business Questions & Explanatory Analysis - WellGuard

## 🎯 Pertanyaan Bisnis (Business Questions)

### Q1. Distribusi Fatigue
**Berapa proporsi karyawan yang mengalami fatigue rendah, sedang, dan tinggi?**

### Q2. Pengaruh Gender
**Apakah ada perbedaan tingkat fatigue antara pekerja pria dan wanita?**

### Q3. Pengaruh Usia
**Kelompok usia mana yang paling berisiko mengalami fatigue tinggi?**

### Q4. Faktor yang Paling Berpengaruh
**Apa faktor yang paling berkorelasi dengan tingkat fatigue?**

### Q5. Segmen Risiko Tinggi
**Kombinasi faktor apa yang menghasilkan risiko fatigue tertinggi?**

### Q6. Target Intervensi
**Berapa banyak karyawan yang membutuhkan intervensi segera?**

---

## 📊 Explanatory Analysis (Jawaban dari EDA)

### A. Jawaban Q1: Distribusi Fatigue

Berdasarkan analisis 102,000 karyawan:

| Level Fatigue | Jumlah | Persentase |
|:---|:---|:---|
| 🟢 Rendah | 22,589 | **22.1%** |
| 🟡 Sedang | 69,520 | **68.2%** |
| 🔴 Tinggi | 9,891 | **9.7%** |

> **Insight:** Hampir 10% karyawan (1 dari 10 orang) berada pada level fatigue tinggi yang membutuhkan intervensi segera.

---

### B. Jawaban Q2: Pengaruh Gender

| Gender | Fatigue Rendah | Fatigue Sedang | Fatigue Tinggi |
|:---|:---|:---|:---|
| Female | 23.4% | 67.1% | 9.5% |
| Male | 21.0% | 69.3% | 9.7% |

> **Insight:** Perbedaan fatigue antar gender tidak signifikan (<1%). Strategi intervensi tidak perlu dibedakan berdasarkan gender.

---

### C. Jawaban Q3: Pengaruh Usia

| Kelompok Usia | Fatigue Rendah | Fatigue Sedang | Fatigue Tinggi |
|:---|:---|:---|:---|
| Muda (<30 thn) | 24.5% | 66.0% | 9.5% |
| Dewasa (30-45 thn) | 20.1% | 69.2% | **10.7%** |
| Senior (>45 thn) | 21.8% | 69.5% | 8.7% |

> **Insight:** Kelompok usia dewasa (30-45 tahun) memiliki proporsi fatigue tertinggi (10.7%). Ini adalah target prioritas intervensi.

---

### D. Jawaban Q4: Faktor Paling Berpengaruh

Korelasi dengan fatigue:

| Faktor | Korelasi | Interpretasi |
|:---|:---|:---|
| `stress` | **+0.52** | Positif kuat → stress tinggi = fatigue tinggi |
| `sleep` | **-0.45** | Negatif kuat → tidur sedikit = fatigue tinggi |
| `age` | +0.12 | Positif lemah |
| `sex` | +0.01 | Hampir tidak berkorelasi |

> **Insight:** Stress dan durasi tidur adalah dua faktor paling dominan. Intervensi harus fokus pada manajemen stress dan peningkatan kualitas tidur.

---

### E. Jawaban Q5: Segmen Risiko Tertinggi

| Kombinasi | Proporsi Fatigue Tinggi |
|:---|:---|
| Sleep <5 jam + Stress >7 | **73%** 🔴 |
| Sleep <5 jam | 8x lipat dari rata-rata |
| Stress >7 | 3.5x lipat dari rata-rata |
| Usia 30-45 + Stress >7 | **73%** 🔴 |

> **Insight:** Kombinasi paling berbahaya adalah **tidur kurang dari 5 jam DAN stress di atas 7**. Segmen ini harus menjadi prioritas utama program intervensi.

---

### F. Jawaban Q6: Target Intervensi

| Prioritas | Kriteria | Jumlah Karyawan | Tindakan |
|:---|:---|:---|:---|
| 🔴 **P1 (Kritis)** | Sleep <5 jam + Stress >7 | ~3,500 (3.4%) | Intervensi segera: cuti, konseling |
| 🟠 **P2 (Tinggi)** | Sleep <5 jam ATAU Stress >7 | ~25,500 (25%) | Monitoring ketat, program relaksasi |
| 🟡 **P3 (Sedang)** | Sleep 5-6 jam ATAU Stress 5-7 | ~45,000 (44%) | Edukasi berkala |
| 🟢 **P4 (Aman)** | Sleep ≥7 jam + Stress ≤5 | ~28,000 (27.4%) | Pertahankan kebiasaan |

---

## 🧠 Kesimpulan Eksekutif

1. **Masalah:** 9.7% karyawan (hampir 10%) mengalami fatigue tinggi, dengan 68.2% berada di level sedang.

2. **Akar Masalah:** Stress (+0.52) dan kurang tidur (-0.45) adalah dua faktor dominan penyebab fatigue.

3. **Target Prioritas:** Pekerja usia 30-45 tahun yang memiliki kombinasi sleep <5 jam DAN stress >7 → 73% berisiko fatigue tinggi.

4. **Rekomendasi Intervensi:**
   - Segera tangani ~3,500 karyawan prioritas kritis
   - Program manajemen stress untuk semua karyawan
   - Edukasi sleep hygiene (target minimal 7 jam/hari)
   - Monitor rutin menggunakan dashboard WellGuard

5. **Dampak yang Diharapkan:**
   - Menurunkan fatigue tinggi dari 9.7% menjadi <5%
   - Meningkatkan produktivitas dan keselamatan kerja