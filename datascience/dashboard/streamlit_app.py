# =====================================================
# WELLGUARD DASHBOARD — FIXED & ALIGNED WITH DATA
# =====================================================

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import seaborn as sns
import torch
import torch.nn as nn
from datetime import datetime
import pathlib

# =====================================================
# PAGE CONFIG
# =====================================================

st.set_page_config(
    page_title="WellGuard Dashboard",
    page_icon="🛡️",
    layout="wide"
)

# =====================================================
# CUSTOM CSS
# =====================================================

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

* { font-family: 'Inter', sans-serif; }
.main { background-color: #f0f4f8; }

[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}
[data-testid="stSidebar"] * { color: white; }

div[data-testid="metric-container"] {
    background: white;
    border: none;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}

.stButton > button {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    padding: 12px 20px;
    transition: all 0.2s;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #1d4ed8, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(37,99,235,0.4);
}

.section-card {
    background: white;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}

h1, h2, h3 { color: #0f172a; }
</style>
""", unsafe_allow_html=True)

# =====================================================
# SESSION STATE
# =====================================================

if 'prediction_history' not in st.session_state:
    st.session_state.prediction_history = []

# =====================================================
# MODEL ARCHITECTURE (sesuai wellguard_model.pt)
# =====================================================

class FourierEmbedder(nn.Module):
    def __init__(self, n_features=12, freq_dim=16):
        super().__init__()
        self.freqs = nn.Parameter(torch.randn(n_features, freq_dim))
        self.linear = nn.Linear(n_features * freq_dim * 2, n_features * freq_dim * 2 // 2)

    def forward(self, x):
        angles = x.unsqueeze(-1) * self.freqs.unsqueeze(0)
        emb = torch.cat([torch.sin(angles), torch.cos(angles)], dim=-1)
        emb = emb.view(emb.size(0), -1)
        return self.linear(emb)


class ResBlock(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.fc1  = nn.Linear(in_dim, out_dim)
        self.bn1  = nn.BatchNorm1d(out_dim)
        self.fc2  = nn.Linear(out_dim, out_dim)
        self.bn2  = nn.BatchNorm1d(out_dim)
        self.proj = nn.Linear(in_dim, out_dim) if in_dim != out_dim else nn.Identity()
        self.act  = nn.GELU()

    def forward(self, x):
        res = self.proj(x)
        x   = self.act(self.bn1(self.fc1(x)))
        x   = self.bn2(self.fc2(x))
        return self.act(x + res)


class WellGuardModel(nn.Module):
    def __init__(self, n_features=12, freq_dim=16):
        super().__init__()
        embed_dim = n_features * freq_dim * 2 // 2   # 192
        self.embedder  = FourierEmbedder(n_features, freq_dim)
        self.input_bn  = nn.BatchNorm1d(embed_dim)
        self.blocks    = nn.ModuleList([
            ResBlock(192, 512),
            ResBlock(512, 512),
            ResBlock(512, 256),
            ResBlock(256, 128),
        ])
        self.head = nn.Linear(128, 3)

    def forward(self, x):
        x = self.embedder(x)
        x = self.input_bn(x)
        for block in self.blocks:
            x = block(x)
        return self.head(x)
    
# =====================================================
# DEBUG: CEK FILE DI FOLDER
# =====================================================

import os

# Tampilkan debug info di sidebar
st.sidebar.write("### 🔍 Debug Info")
st.sidebar.write(f"Current directory: {os.getcwd()}")

# Cek semua file di folder
all_files = os.listdir('.')
st.sidebar.write(f"Total files: {len(all_files)}")

# Cari file .pt
pt_files = [f for f in all_files if f.endswith('.pt')]
st.sidebar.write(f"PT files found: {pt_files}")

# Cek ukuran file model
if 'wellguard_model.pt' in all_files:
    size = os.path.getsize('wellguard_model.pt')
    st.sidebar.success(f"✅ wellguard_model.pt ditemukan! Size: {size:,} bytes")
else:
    st.sidebar.error("❌ wellguard_model.pt TIDAK ditemukan!")
    
    # Tampilkan 10 file pertama untuk inspect
    st.sidebar.write("Sample files (first 10):")
    for f in all_files[:10]:
        st.sidebar.write(f"  - {f}")




# =====================================================
# LOAD MODEL (DENGAN ERROR HANDLING)
# =====================================================

@st.cache_resource
def load_model():
    """Load model dengan error handling yang baik"""
    try:
        m = WellGuardModel()
        ckpt = torch.load("wellguard_model.pt", map_location="cpu")
        m.load_state_dict(ckpt)
        m.eval()
        return m, True, "✅ Model AI WellGuard (Fourier + ResNet) berhasil dimuat dan siap digunakan"
    except FileNotFoundError:
        return None, False, "⚠️ File model 'wellguard_model.pt' tidak ditemukan. Prediksi AI tidak tersedia."
    except Exception as e:
        return None, False, f"⚠️ Error loading model: {str(e)}. Prediksi AI tidak tersedia."

model, model_loaded, model_message = load_model()

# Tampilkan status model
if model_loaded:
    st.markdown(f"""
    <div style="background: linear-gradient(90deg, #dcfce7, #f0fdf4);
    border: 1px solid #86efac; border-radius: 12px; padding: 12px 20px;
    margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size:20px;">✅</span>
        <span style="color:#166534; font-weight:600; font-size:14px;">{model_message}</span>
    </div>
    """, unsafe_allow_html=True)
else:
    st.markdown(f"""
    <div style="background: linear-gradient(90deg, #fee2e2, #fef2f2);
    border: 1px solid #fca5a5; border-radius: 12px; padding: 12px 20px;
    margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size:20px;">⚠️</span>
        <span style="color:#991b1b; font-weight:600; font-size:14px;">{model_message}</span>
    </div>
    """, unsafe_allow_html=True)

# =====================================================
# LOAD & CLEAN DATA
# =====================================================
@st.cache_data
def load_data():
    DASHBOARD_DIR = pathlib.Path(__file__).parent
    df = pd.read_csv(DASHBOARD_DIR / "wellguard.csv")
    # sex_label sudah ada di CSV — gunakan langsung, jangan re-map
    # Isi NaN sex_label dengan 'Unknown'
    df['sex_label'] = df['sex_label'].fillna('Unknown')

    # age_group sudah ada di CSV — gunakan langsung
    df['age_group'] = df['age_group'].astype(str)

    # Feature engineering
    df['stress_sleep_ratio'] = df['stress'] / (df['sleep'] + 1)
    df['sleep_deficit']      = 7 - df['sleep']
    df['age_stress']         = (df['age'] * df['stress']) / 100

    return df

df = load_data()

# =====================================================
# STATS UNTUK NORMALISASI PREDIKSI
# =====================================================

@st.cache_data
def compute_stats(_df):
    """Hitung stats normalisasi dari full dataset (tanpa NaN sex)."""
    d = _df[_df['sex_label'] != 'Unknown'].copy()
    # fitur tambahan
    d['sex_num']     = d['sex'].astype(float)
    d['sleep_sq']    = d['sleep'] ** 2
    d['stress_sq']   = d['stress'] ** 2
    d['age_sq']      = d['age'] ** 2
    d['sex_stress']  = d['sex_num'] * d['stress']

    feat_cols = ['age','sex_num','sleep','stress','shift',
                 'stress_sleep_ratio','sleep_deficit','age_stress',
                 'sleep_sq','stress_sq','age_sq','sex_stress']
    stats = {}
    for c in feat_cols:
        stats[c] = {'mean': float(d[c].mean()), 'std': float(d[c].std()) + 1e-8,
                    'min': float(d[c].min()), 'max': float(d[c].max())}
    return stats

STATS = compute_stats(df)

FEAT_COLS = ['age','sex_num','sleep','stress','shift',
             'stress_sleep_ratio','sleep_deficit','age_stress',
             'sleep_sq','stress_sq','age_sq','sex_stress']

def build_features(age, sex_num, sleep, stress, shift=1):
    """Buat vektor 12 fitur, normalisasi min-max dari full dataset."""
    ssr     = stress / (sleep + 1)
    sd      = 7 - sleep
    as_     = (age * stress) / 100
    slp_sq  = sleep ** 2
    str_sq  = stress ** 2
    age_sq  = age ** 2
    ss      = sex_num * stress

    raw = [age, sex_num, sleep, stress, shift,
           ssr, sd, as_, slp_sq, str_sq, age_sq, ss]

    normed = []
    for val, col in zip(raw, FEAT_COLS):
        mn = STATS[col]['min']
        mx = STATS[col]['max']
        normed.append((val - mn) / (mx - mn + 1e-8))
    return normed


def rule_based_pred(sleep, stress):
    """Rule-based override berdasarkan threshold empiris dari data."""
    if sleep >= 7.0 and stress <= 4.5:
        return 0   # Rendah
    elif sleep <= 4.8 and stress >= 7.0:
        return 2   # Tinggi
    else:
        return None  # biarkan model


# =====================================================
# HEADER
# =====================================================

st.markdown("""
<div style="
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0ea5e9 100%);
    padding: 36px 40px;
    border-radius: 24px;
    margin-bottom: 28px;
    box-shadow: 0 8px 32px rgba(37,99,235,0.3);
    position: relative; overflow: hidden;
">
<div style="position:absolute; top:-40px; right:-40px; width:200px; height:200px;
background:rgba(255,255,255,0.05); border-radius:50%;"></div>
<div style="position:absolute; bottom:-60px; left:30%; width:150px; height:150px;
background:rgba(255,255,255,0.04); border-radius:50%;"></div>
<h1 style="color:white; text-align:center; font-size:36px; font-weight:900;
margin:0 0 8px 0; letter-spacing:-0.5px;">🛡️ WellGuard Dashboard</h1>
<p style="color:rgba(255,255,255,0.85); text-align:center; font-size:16px;
margin:0; letter-spacing:1px;">AI-BASED EMPLOYEE FATIGUE MONITORING SYSTEM</p>
</div>
""", unsafe_allow_html=True)

# =====================================================
# SIDEBAR — FILTER
# =====================================================

st.sidebar.markdown("""
<div style="text-align:center; padding:16px 0 8px 0;
border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:16px;">
<div style="font-size:28px;">🛡️</div>
<div style="font-weight:800; font-size:16px; letter-spacing:1px;">WellGuard</div>
<div style="font-size:10px; color:#94a3b8; letter-spacing:2px;">AI FATIGUE MONITOR</div>
</div>
""", unsafe_allow_html=True)

st.sidebar.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
letter-spacing:2px; margin-bottom:6px;">FILTER DATA</div>""", unsafe_allow_html=True)

# Gender filter — nilai dari CSV: Female, Male, Unknown
gender_options = sorted([g for g in df['sex_label'].unique() if g != 'Unknown'])
gender_options_all = gender_options + (['Unknown'] if 'Unknown' in df['sex_label'].values else [])

selected_gender = st.sidebar.multiselect(
    "👤 Gender",
    options=gender_options_all,
    default=gender_options,
    help="Pilih satu atau lebih gender untuk ditampilkan di dashboard"
)

selected_fatigue = st.sidebar.multiselect(
    "⚡ Level Fatigue",
    options=df['fatigue_label'].unique().tolist(),
    default=df['fatigue_label'].unique().tolist(),
    help="Pilih level fatigue yang ingin ditampilkan"
)

# =====================================================
# SIDEBAR — PREDIKSI AI (hanya jika model tersedia)
# =====================================================

if model_loaded:
    st.sidebar.markdown("""
    <div style="border-top:1px solid rgba(255,255,255,0.1); margin:16px 0;"></div>
    <div style="font-size:11px; font-weight:700; color:#64748b;
    letter-spacing:2px; margin-bottom:12px;">🧠 PREDIKSI FATIGUE AI</div>
    """, unsafe_allow_html=True)

    # Input fields
    st.sidebar.markdown("""<div style="background:rgba(255,255,255,0.06); border-radius:12px;
    padding:4px 10px 10px 10px; margin-bottom:8px;">
    <div style="font-size:10px; color:#94a3b8; letter-spacing:1px; margin:6px 0 2px;">
    👤 USIA KARYAWAN</div>""", unsafe_allow_html=True)
    input_age = st.sidebar.slider("Usia", 18, 69, 30, label_visibility="collapsed")
    st.sidebar.markdown("</div>", unsafe_allow_html=True)

    st.sidebar.markdown("""<div style="background:rgba(255,255,255,0.06); border-radius:12px;
    padding:4px 10px 10px 10px; margin-bottom:8px;">
    <div style="font-size:10px; color:#94a3b8; letter-spacing:1px; margin:6px 0 2px;">
    ⚥ GENDER</div>""", unsafe_allow_html=True)
    input_gender = st.sidebar.selectbox("Gender", ["Female", "Male"],
                                        label_visibility="collapsed")
    st.sidebar.markdown("</div>", unsafe_allow_html=True)

    st.sidebar.markdown("""<div style="background:rgba(255,255,255,0.06); border-radius:12px;
    padding:4px 10px 10px 10px; margin-bottom:8px;">
    <div style="font-size:10px; color:#94a3b8; letter-spacing:1px; margin:6px 0 2px;">
    🌙 DURASI TIDUR (JAM)</div>""", unsafe_allow_html=True)
    input_sleep = st.sidebar.slider("Tidur", 3.0, 10.5, 6.0, step=0.1,
                                    label_visibility="collapsed")
    st.sidebar.markdown("</div>", unsafe_allow_html=True)

    st.sidebar.markdown("""<div style="background:rgba(255,255,255,0.06); border-radius:12px;
    padding:4px 10px 10px 10px; margin-bottom:12px;">
    <div style="font-size:10px; color:#94a3b8; letter-spacing:1px; margin:6px 0 2px;">
    😰 TINGKAT STRESS (1–10)</div>""", unsafe_allow_html=True)
    input_stress = st.sidebar.slider("Stress", 1.0, 10.0, 5.0, step=0.1,
                                     label_visibility="collapsed")
    st.sidebar.markdown("</div>", unsafe_allow_html=True)

    col_btn1, col_btn2 = st.sidebar.columns(2)
    with col_btn1:
        btn_predict  = st.button("🔍 Prediksi",  use_container_width=True)
    with col_btn2:
        btn_simulate = st.button("⚡ Simulasi", use_container_width=True)

    if btn_simulate:
        st.sidebar.markdown("""
        <div style="background:#7f1d1d; border-radius:10px; padding:10px 12px;
        margin-top:8px; font-size:11px; color:#fca5a5; line-height:1.6;">
        ⚡ <b>Skenario Ekstrem:</b><br>
        Tidur: 4 jam | Stress: 9/10<br>
        → Kemungkinan: <b>FATIGUE TINGGI</b>
        </div>
        """, unsafe_allow_html=True)

    # ── Logika prediksi ──
    if btn_predict:
        with st.spinner("🧠 Model AI sedang menganalisis..."):
            sex_num = 0.0 if input_gender == "Female" else 1.0

            # Cek rule-based override dulu
            rule_pred = rule_based_pred(input_sleep, input_stress)

            # Jalankan model untuk confidence scores
            feats       = build_features(input_age, sex_num, input_sleep, input_stress)
            input_t     = torch.tensor([feats], dtype=torch.float32)
            with torch.no_grad():
                logits  = model(input_t)
                prob    = torch.softmax(logits, dim=1)
            prob_np     = prob.numpy()[0]
            ai_pred     = int(torch.argmax(logits, dim=1).item())

            # Gunakan rule-based jika kondisi ekstrem, else gunakan AI
            pred = rule_pred if rule_pred is not None else ai_pred

        label_map = {
            0: ('🟢', 'RENDAH', '#22c55e', '#dcfce7', 16),
            1: ('🟡', 'SEDANG', '#f59e0b', '#fef9c3', 50),
            2: ('🔴', 'TINGGI', '#ef4444', '#fee2e2', 84),
        }
        icon, label, color, bg, gauge_val = label_map[pred]

        # Gauge
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=gauge_val,
            number={'suffix': "", 'font': {'size': 1, 'color': 'rgba(0,0,0,0)'}},
            gauge={
                'axis': {'range': [0, 100], 'visible': False},
                'bar':  {'color': color, 'thickness': 0.3},
                'bgcolor': "rgba(0,0,0,0)",
                'steps': [
                    {'range': [0,  33], 'color': '#dcfce7'},
                    {'range': [33, 66], 'color': '#fef9c3'},
                    {'range': [66,100], 'color': '#fee2e2'},
                ],
                'threshold': {
                    'line': {'color': color, 'width': 4},
                    'thickness': 0.85, 'value': gauge_val
                }
            }
        ))
        fig_gauge.update_layout(
            height=160,
            margin=dict(l=10, r=10, t=10, b=0),
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font_color='white'
        )
        st.sidebar.plotly_chart(fig_gauge, use_container_width=True)

        st.sidebar.markdown(f"""
        <div style="background:{bg}; border:2px solid {color}; border-radius:16px;
        padding:14px 12px; margin-top:-10px; text-align:center;">
            <div style="font-size:32px; line-height:1;">{icon}</div>
            <div style="font-size:10px; color:#6b7280; font-weight:700;
            letter-spacing:2px; margin-top:4px;">LEVEL FATIGUE</div>
            <div style="font-size:24px; font-weight:900; color:{color};
            letter-spacing:3px;">{label}</div>
        </div>
        """, unsafe_allow_html=True)

        # Confidence bars
        st.sidebar.markdown("""<div style="font-size:10px; font-weight:700; color:#64748b;
        letter-spacing:2px; margin:14px 0 8px 0;">CONFIDENCE SCORE</div>""",
        unsafe_allow_html=True)

        for i, (lbl, clr) in enumerate(
                zip(['Rendah','Sedang','Tinggi'], ['#22c55e','#f59e0b','#ef4444'])):
            pct    = round(float(prob_np[i]) * 100, 1)
            active = "⬅" if i == pred else ""
            st.sidebar.markdown(f"""
            <div style="margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between;
                font-size:11px; color:#cbd5e1; margin-bottom:3px;">
                    <span>{lbl} {active}</span>
                    <span style="color:{clr}; font-weight:700;">{pct}%</span>
                </div>
                <div style="background:#1e293b; border-radius:99px; height:7px; overflow:hidden;">
                    <div style="width:{pct}%; background:{clr}; height:100%; border-radius:99px;"></div>
                </div>
            </div>
            """, unsafe_allow_html=True)

        # Rekomendasi
        rek_map = {
            0: ("✅ Kondisi Baik",
                "Pertahankan pola tidur 7–8 jam dan jaga stress di level rendah.",
                "#166534", "#dcfce7", "#86efac"),
            1: ("⚠️ Perlu Perhatian",
                "Tingkatkan kualitas tidur dan lakukan teknik relaksasi setiap hari.",
                "#92400e", "#fef9c3", "#fde047"),
            2: ("🚨 Risiko Tinggi",
                "Segera konsultasikan ke tim kesehatan kerja. Kurangi beban kerja.",
                "#991b1b", "#fee2e2", "#fca5a5"),
        }
        rek_title, rek_msg, rek_text, rek_bg, rek_border = rek_map[pred]
        st.sidebar.markdown(f"""
        <div style="background:{rek_bg}; border:1px solid {rek_border};
        border-radius:12px; padding:12px; margin-top:10px;">
            <div style="font-size:12px; font-weight:800; color:{rek_text};
            margin-bottom:4px;">{rek_title}</div>
            <div style="font-size:11px; color:{rek_text}; line-height:1.5; opacity:0.85;">
            {rek_msg}</div>
        </div>
        """, unsafe_allow_html=True)

        # Simpan riwayat
        st.session_state.prediction_history.append({
            'Waktu':   datetime.now().strftime("%H:%M:%S"),
            'Usia':    input_age,
            'Gender':  input_gender,
            'Tidur':   input_sleep,
            'Stress':  input_stress,
            'Hasil':   label,
        })
        if len(st.session_state.prediction_history) > 5:
            st.session_state.prediction_history.pop(0)

    # Riwayat prediksi
    if st.session_state.prediction_history:
        st.sidebar.markdown("""<div style="font-size:10px; font-weight:700; color:#64748b;
        letter-spacing:2px; margin:14px 0 8px 0;">📋 RIWAYAT PREDIKSI</div>""",
        unsafe_allow_html=True)
        hist_df = pd.DataFrame(st.session_state.prediction_history)
        st.sidebar.dataframe(hist_df, use_container_width=True, hide_index=True)
        if st.sidebar.button("🗑️ Hapus Riwayat", use_container_width=True):
            st.session_state.prediction_history = []
            st.rerun()
else:
    st.sidebar.info("⚠️ Model AI tidak tersedia. Fitur prediksi dinonaktifkan.")

# =====================================================
# FILTER DATA
# =====================================================

with st.spinner("Memuat data..."):
    filtered_df = df[
        (df['sex_label'].isin(selected_gender)) &
        (df['fatigue_label'].isin(selected_fatigue))
    ]

# Guard kosong
if len(filtered_df) == 0:
    st.warning("⚠️ Tidak ada data yang sesuai dengan filter aktif.")
    st.stop()

# =====================================================
# KPI CARDS
# =====================================================

st.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
letter-spacing:2px; margin-bottom:12px;">📊 RINGKASAN DATA</div>""",
unsafe_allow_html=True)

total_data  = len(filtered_df)
avg_sleep   = round(filtered_df['sleep'].mean(),  2)
avg_stress  = round(filtered_df['stress'].mean(), 2)
avg_age     = round(filtered_df['age'].mean(),    1)

fatigue_counts_kpi = filtered_df['fatigue_label'].value_counts()
most_fatigue_kpi   = fatigue_counts_kpi.idxmax()
most_pct_kpi       = round(fatigue_counts_kpi.max() / total_data * 100, 1)

sleep_pct    = min(round((avg_sleep  / 10.5) * 100), 100)
stress_pct   = min(round((avg_stress / 10.0) * 100), 100)
sleep_color  = '#22c55e' if avg_sleep >= 7 else ('#f59e0b' if avg_sleep >= 5 else '#ef4444')
stress_color = '#ef4444' if avg_stress >= 7 else ('#f59e0b' if avg_stress >= 5 else '#22c55e')

kpi1, kpi2, kpi3, kpi4 = st.columns(4)

with kpi1:
    st.markdown(f"""
    <div class="section-card" style="padding:20px;">
        <div style="font-size:11px; color:#64748b; font-weight:700;
        letter-spacing:1px; margin-bottom:6px;">👥 TOTAL KARYAWAN</div>
        <div style="font-size:36px; font-weight:900; color:#0f172a;
        line-height:1;">{total_data:,}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">data terekam</div>
    </div>
    """, unsafe_allow_html=True)

with kpi2:
    st.markdown(f"""
    <div class="section-card" style="padding:20px;">
        <div style="font-size:11px; color:#64748b; font-weight:700;
        letter-spacing:1px; margin-bottom:6px;">🌙 RATA-RATA TIDUR</div>
        <div style="font-size:36px; font-weight:900; color:#0f172a;
        line-height:1;">{avg_sleep}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">
        jam/malam (target: 7 jam)</div>
        <div style="background:#f1f5f9; border-radius:99px; height:6px;
        overflow:hidden; margin-top:8px;">
            <div style="width:{sleep_pct}%; background:{sleep_color};
            height:100%; border-radius:99px;"></div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with kpi3:
    st.markdown(f"""
    <div class="section-card" style="padding:20px;">
        <div style="font-size:11px; color:#64748b; font-weight:700;
        letter-spacing:1px; margin-bottom:6px;">😰 RATA-RATA STRESS</div>
        <div style="font-size:36px; font-weight:900; color:#0f172a;
        line-height:1;">{avg_stress}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">
        skala 1–10 (batas aman: ≤5)</div>
        <div style="background:#f1f5f9; border-radius:99px; height:6px;
        overflow:hidden; margin-top:8px;">
            <div style="width:{stress_pct}%; background:{stress_color};
            height:100%; border-radius:99px;"></div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with kpi4:
    st.markdown(f"""
    <div class="section-card" style="padding:20px;">
        <div style="font-size:11px; color:#64748b; font-weight:700;
        letter-spacing:1px; margin-bottom:6px;">⚡ FATIGUE DOMINAN</div>
        <div style="font-size:28px; font-weight:900; color:#0f172a;
        line-height:1; margin-top:4px;">{most_fatigue_kpi}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">
        {most_pct_kpi}% dari total data</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# =====================================================
# VISUALISASI
# =====================================================

COLOR_MAP = {
    'Rendah': '#22c55e',
    'Sedang': '#f59e0b',
    'Tinggi': '#ef4444'
}

col_left, col_right = st.columns(2)

with col_left:
    st.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
    letter-spacing:2px; margin-bottom:10px;">📌 DISTRIBUSI FATIGUE</div>""",
    unsafe_allow_html=True)
    fig_pie = px.pie(
        filtered_df, names='fatigue_label', hole=0.5,
        color='fatigue_label', color_discrete_map=COLOR_MAP
    )
    fig_pie.update_traces(
        textposition='outside',
        textinfo='percent+label',
        marker=dict(line=dict(color='white', width=3))
    )
    fig_pie.update_layout(
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
        showlegend=True, margin=dict(t=20, b=20, l=20, r=20), height=320
    )
    st.plotly_chart(fig_pie, use_container_width=True)

with col_right:
    st.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
    letter-spacing:2px; margin-bottom:10px;">📈 SLEEP VS STRESS</div>""",
    unsafe_allow_html=True)
    
    sample_size = min(3000, len(filtered_df))
    if len(filtered_df) > 3000:
        st.caption(f"📌 Menampilkan {sample_size:,} dari {len(filtered_df):,} data point pada scatter plot")
    
    fig_scatter = px.scatter(
        filtered_df.sample(sample_size, random_state=42),
        x='sleep', y='stress',
        color='fatigue_label', size_max=8,
        hover_data=['age', 'sex_label'],
        color_discrete_map=COLOR_MAP,
        labels={'sleep': 'Durasi Tidur (jam)', 'stress': 'Tingkat Stress'}
    )
    fig_scatter.update_layout(
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='#fafafa',
        margin=dict(t=20, b=20, l=20, r=20), height=320,
        xaxis=dict(gridcolor='#f1f5f9'),
        yaxis=dict(gridcolor='#f1f5f9'),
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

col_left2, col_right2 = st.columns(2)

with col_left2:
    st.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
    letter-spacing:2px; margin-bottom:10px;">👨‍💼 FATIGUE PER GENDER</div>""",
    unsafe_allow_html=True)
    
    gender_df = filtered_df[filtered_df['sex_label'].isin(['Female','Male'])]
    gender_analysis = (
        gender_df.groupby(['sex_label', 'fatigue_label'])
        .size().reset_index(name='count')
    )
    fig_gender = px.bar(
        gender_analysis, x='sex_label', y='count',
        color='fatigue_label', barmode='group',
        color_discrete_map=COLOR_MAP,
        labels={'sex_label': 'Gender', 'count': 'Jumlah'}
    )
    fig_gender.update_layout(
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='#fafafa',
        margin=dict(t=20, b=20, l=20, r=20), height=300,
        xaxis=dict(gridcolor='#f1f5f9'), yaxis=dict(gridcolor='#f1f5f9'),
    )
    st.plotly_chart(fig_gender, use_container_width=True)

with col_right2:
    st.markdown("""<div style="font-size:11px; font-weight:700; color:#64748b;
    letter-spacing:2px; margin-bottom:10px;">👥 FATIGUE PER KELOMPOK USIA</div>""",
    unsafe_allow_html=True)
    
    age_order = ['Muda (<30)', 'Dewasa (30-45)', 'Senior (>45)']
    age_analysis = (
        filtered_df.groupby(['age_group', 'fatigue_label'])
        .size().reset_index(name='count')
    )
    age_analysis['age_group'] = pd.Categorical(
        age_analysis['age_group'], categories=age_order, ordered=True
    )
    age_analysis = age_analysis.sort_values('age_group')
    fig_age = px.bar(
        age_analysis, x='age_group', y='count',
        color='fatigue_label', color_discrete_map=COLOR_MAP,
        labels={'age_group': 'Kelompok Usia', 'count': 'Jumlah'}
    )
    fig_age.update_layout(
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='#fafafa',
        margin=dict(t=20, b=20, l=20, r=20), height=300,
        xaxis=dict(gridcolor='#f1f5f9'), yaxis=dict(gridcolor='#f1f5f9'),
    )
    st.plotly_chart(fig_age, use_container_width=True)