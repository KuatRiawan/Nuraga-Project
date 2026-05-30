"""
A/B Testing untuk WellGuard - Menguji Efektivitas Intervensi Fatigue

Skenario:
- Group A (Control): Tidak mendapat intervensi
- Group B (Treatment): Mendapat intervensi (program tidur + manajemen stress)

Metric: Skor fatigue (0=Rendah, 1=Sedang, 2=Tinggi)
"""

import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns

# =====================================================
# 1. SIMULASI DATA A/B TEST
# =====================================================

np.random.seed(42)

n_per_group = 500  # 500 karyawan per group

# Group A (Control) - tidak dapat intervensi
# Skor fatigue: mean ~1.0 (Sedang)
group_a_fatigue = np.random.normal(loc=1.0, scale=0.5, size=n_per_group)
group_a_fatigue = np.clip(group_a_fatigue, 0, 2).round().astype(int)

# Group B (Treatment) - dapat intervensi
# Skor fatigue turun: mean ~0.7 (antara Rendah dan Sedang)
group_b_fatigue = np.random.normal(loc=0.7, scale=0.5, size=n_per_group)
group_b_fatigue = np.clip(group_b_fatigue, 0, 2).round().astype(int)

# Buat DataFrame
ab_data = pd.DataFrame({
    'employee_id': range(1, 2*n_per_group + 1),
    'group': ['A'] * n_per_group + ['B'] * n_per_group,
    'fatigue_score': np.concatenate([group_a_fatigue, group_b_fatigue])
})

# Map fatigue score ke label
fatigue_map = {0: 'Rendah', 1: 'Sedang', 2: 'Tinggi'}
ab_data['fatigue_label'] = ab_data['fatigue_score'].map(fatigue_map)

print("=" * 50)
print("DATA A/B TESTING")
print("=" * 50)
print(f"Total karyawan: {len(ab_data)}")
print(f"Group A (Control): {n_per_group} orang")
print(f"Group B (Treatment): {n_per_group} orang")
print("\nPreview data:")
print(ab_data.head(10))

# =====================================================
# 2. ANALISIS DESKRIPTIF
# =====================================================

print("\n" + "=" * 50)
print("ANALISIS DESKRIPTIF")
print("=" * 50)

# Distribusi per group
dist_a = ab_data[ab_data['group'] == 'A']['fatigue_label'].value_counts()
dist_b = ab_data[ab_data['group'] == 'B']['fatigue_label'].value_counts()

print("\nGroup A (Control - Tanpa Intervensi):")
for level in ['Rendah', 'Sedang', 'Tinggi']:
    count = dist_a.get(level, 0)
    pct = count / n_per_group * 100
    print(f"  {level}: {count} ({pct:.1f}%)")

print("\nGroup B (Treatment - Dengan Intervensi):")
for level in ['Rendah', 'Sedang', 'Tinggi']:
    count = dist_b.get(level, 0)
    pct = count / n_per_group * 100
    print(f"  {level}: {count} ({pct:.1f}%)")

# Hitung rata-rata fatigue score
mean_a = ab_data[ab_data['group'] == 'A']['fatigue_score'].mean()
mean_b = ab_data[ab_data['group'] == 'B']['fatigue_score'].mean()

print(f"\nRata-rata fatigue score:")
print(f"  Group A: {mean_a:.3f}")
print(f"  Group B: {mean_b:.3f}")
print(f"  Penurunan: {(mean_a - mean_b):.3f} poin ({(mean_a - mean_b)/mean_a*100:.1f}%)")

# =====================================================
# 3. UJI STATISTIK (T-TEST)
# =====================================================

print("\n" + "=" * 50)
print("UJI STATISTIK (T-TEST)")
print("=" * 50)

# Uji normalitas (Shapiro-Wilk)
shapiro_a = stats.shapiro(ab_data[ab_data['group'] == 'A']['fatigue_score'])
shapiro_b = stats.shapiro(ab_data[ab_data['group'] == 'B']['fatigue_score'])

print(f"\nUji Normalitas (Shapiro-Wilk):")
print(f"  Group A: p-value = {shapiro_a.pvalue:.4f} {'(Normal)' if shapiro_a.pvalue > 0.05 else '(Tidak Normal)'}")
print(f"  Group B: p-value = {shapiro_b.pvalue:.4f} {'(Normal)' if shapiro_b.pvalue > 0.05 else '(Tidak Normal)'}")

# Independent t-test (bandingkan 2 group)
t_stat, p_value = stats.ttest_ind(
    ab_data[ab_data['group'] == 'A']['fatigue_score'],
    ab_data[ab_data['group'] == 'B']['fatigue_score']
)

print(f"\nIndependent T-Test:")
print(f"  T-statistic: {t_stat:.4f}")
print(f"  P-value: {p_value:.6f}")

# Interpretasi
alpha = 0.05
if p_value < alpha:
    print(f"  ✅ Hasil SIGNIFIKAN (p < {alpha})")
    print(f"     → Intervensi terbukti efektif menurunkan fatigue!")
else:
    print(f"  ❌ Hasil TIDAK SIGNIFIKAN (p > {alpha})")
    print(f"     → Intervensi belum terbukti efektif.")

# =====================================================
# 4. UJI MANN-WHITNEY (Alternatif non-parametrik)
# =====================================================

print("\n" + "=" * 50)
print("UJI MANN-WHITNEY (Non-Parametrik)")
print("=" * 50)

u_stat, p_value_mw = stats.mannwhitneyu(
    ab_data[ab_data['group'] == 'A']['fatigue_score'],
    ab_data[ab_data['group'] == 'B']['fatigue_score'],
    alternative='two-sided'
)

print(f"  U-statistic: {u_stat:.4f}")
print(f"  P-value: {p_value_mw:.6f}")

if p_value_mw < alpha:
    print(f"  ✅ Hasil SIGNIFIKAN - Intervensi efektif!")
else:
    print(f"  ❌ Hasil TIDAK SIGNIFIKAN")

# =====================================================
# 5. PERHITUNGAN EFFECT SIZE (Cohen's d)
# =====================================================

print("\n" + "=" * 50)
print("EFFECT SIZE (Cohen's d)")
print("=" * 50)

# Pooled standard deviation
std_a = ab_data[ab_data['group'] == 'A']['fatigue_score'].std()
std_b = ab_data[ab_data['group'] == 'B']['fatigue_score'].std()
pooled_std = np.sqrt(((n_per_group - 1) * std_a**2 + (n_per_group - 1) * std_b**2) / (2 * n_per_group - 2))

cohens_d = (mean_a - mean_b) / pooled_std

print(f"  Cohen's d: {cohens_d:.4f}")

# Interpretasi effect size
if abs(cohens_d) < 0.2:
    effect = "sangat kecil"
elif abs(cohens_d) < 0.5:
    effect = "kecil"
elif abs(cohens_d) < 0.8:
    effect = "sedang"
else:
    effect = "besar"

print(f"  Interpretasi: Effect size {effect}")

# =====================================================
# 6. VISUALISASI
# =====================================================

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Bar chart distribusi
ax1 = axes[0]
colors = ['#22c55e', '#f59e0b', '#ef4444']
labels = ['Rendah', 'Sedang', 'Tinggi']

x = np.arange(len(labels))
width = 0.35

a_counts = [dist_a.get('Rendah', 0), dist_a.get('Sedang', 0), dist_a.get('Tinggi', 0)]
b_counts = [dist_b.get('Rendah', 0), dist_b.get('Sedang', 0), dist_b.get('Tinggi', 0)]

ax1.bar(x - width/2, a_counts, width, label='Group A (Control)', color='#94a3b8')
ax1.bar(x + width/2, b_counts, width, label='Group B (Treatment)', color='#2563eb')
ax1.set_xlabel('Level Fatigue')
ax1.set_ylabel('Jumlah Karyawan')
ax1.set_title('Distribusi Fatigue: Control vs Treatment')
ax1.set_xticks(x)
ax1.set_xticklabels(labels)
ax1.legend()
ax1.grid(axis='y', alpha=0.3)

# Boxplot
ax2 = axes[1]
data_to_plot = [
    ab_data[ab_data['group'] == 'A']['fatigue_score'],
    ab_data[ab_data['group'] == 'B']['fatigue_score']
]
bp = ax2.boxplot(data_to_plot, labels=['Group A (Control)', 'Group B (Treatment)'], patch_artist=True)
bp['boxes'][0].set_facecolor('#94a3b8')
bp['boxes'][1].set_facecolor('#2563eb')
ax2.set_ylabel('Fatigue Score (0=Rendah, 1=Sedang, 2=Tinggi)')
ax2.set_title('Perbandingan Fatigue Score')
ax2.grid(axis='y', alpha=0.3)

plt.suptitle('A/B Testing: Efektivitas Intervensi Fatigue', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('ab_testing_results.png', dpi=150, bbox_inches='tight')
plt.show()

print("\n✅ Visualisasi disimpan sebagai 'ab_testing_results.png'")

# =====================================================
# 7. KESIMPULAN A/B TESTING
# =====================================================

print("\n" + "=" * 50)
print("KESIMPULAN A/B TESTING")
print("=" * 50)

print("""
📋 Ringkasan Hasil:

1. Group A (Control - Tanpa Intervensi):
   - Rata-rata fatigue: {mean_a:.3f}
   - Proporsi fatigue tinggi: {high_a:.1f}%

2. Group B (Treatment - Dengan Intervensi):
   - Rata-rata fatigue: {mean_b:.3f}
   - Proporsi fatigue tinggi: {high_b:.1f}%

3. Uji Statistik:
   - T-test p-value: {p_val:.6f}
   - Effect size (Cohen's d): {d:.4f} ({effect})

4. Kesimpulan:
   {conclusion}

💡 Rekomendasi:
   {recommendation}
""".format(
    mean_a=mean_a,
    mean_b=mean_b,
    high_a=dist_a.get('Tinggi', 0) / n_per_group * 100,
    high_b=dist_b.get('Tinggi', 0) / n_per_group * 100,
    p_val=p_value,
    d=cohens_d,
    effect=effect,
    conclusion="✅ Intervensi TERBUKTI EFEKTIF menurunkan fatigue!" if p_value < alpha else "❌ Intervensi BELUM TERBUKTI EFEKTIF secara statistik.",
    recommendation="Lakukan rollout intervensi ke seluruh karyawan" if p_value < alpha else "Evaluasi ulang desain intervensi dan perpanjang periode uji coba."
))

# =====================================================
# 8. EKSPOR HASIL
# =====================================================

# Simpan hasil ke CSV
results_df = ab_data.groupby(['group', 'fatigue_label']).size().reset_index(name='count')
results_df.to_csv('ab_testing_results.csv', index=False)
print("\n✅ Hasil A/B Testing disimpan sebagai 'ab_testing_results.csv'")