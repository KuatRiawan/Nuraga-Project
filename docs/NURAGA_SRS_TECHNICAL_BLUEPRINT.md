# Nuraga — Software Requirements Specification & Technical Blueprint

**Versi Dokumen:** 1.0.0 (diekstrak dari codebase aktual)  
**Tanggal:** 31 Mei 2026  
**Sumber Kebenaran:** Inspeksi baris-demi-baris terhadap repositori `/Users/mac/fixed`

---

## Daftar Isi

1. [Pendahuluan & Ringkasan Eksekutif](#1-pendahuluan--ringkasan-eksekutif)
2. [Arsitektur Frontend & Real-Time Sync](#2-arsitektur-frontend--real-time-sync)
3. [Layanan AI & Pengolahan Data (Python/FastAPI)](#3-layanan-ai--pengolahan-data-pythonfastapi)
4. [Modul Operasional & Alur Kerja Kritis (Backend Node.js)](#4-modul-operasional--alur-kerja-kritis-backend-nodejs)
5. [Keamanan, RBAC, & Isolasi Data](#5-keamanan-rbac--isolasi-data)
6. [Skema Database, ORM, & Integritas (PostgreSQL/Sequelize)](#6-skema-database-orm--integritas-postgresqlsequelize)
7. [API Contracts & Integrasi Eksternal](#7-api-contracts--integrasi-eksternal)

---

## 1. Pendahuluan & Ringkasan Eksekutif

### 1.1 Tujuan Sistem

**Nuraga** (*Integrated Safety Intelligence System*) adalah platform HSE (Health, Safety, Environment) yang mengintegrasikan:

- Pelaporan bahaya dan insiden
- Izin kerja elektronik (e-PTW)
- Absensi dengan prediksi kelelahan (WellGuard)
- Emergency SOS real-time
- Manajemen sertifikasi K3, audit, CAPA, dan gamifikasi keselamatan

Filosofi produk (dari `README.md`): beralih dari pendekatan **reaktif** ke **prediktif** dalam mencegah kecelakaan kerja.

### 1.2 Pembagian Arsitektur Microservices

| Layer | Teknologi | Direktori / Entry Point | Port Default |
|:---|:---|:---|:---|
| **Frontend SPA** | React 18 + Vite 5 + TailwindCSS | `frontend/` → `frontend/src/main.jsx` | 5173 (dev) |
| **Backend API** | Node.js + Express 4 + Sequelize 6 | `backend/server.js` | 5000 (fallback ke 5001 jika port sibuk) |
| **AI Service** | Python + FastAPI + Uvicorn | `aiservice/main.py` | 8000 |
| **NLP Standalone** | FastAPI + joblib model | `ai/nlpnuraga/app.py` | 8000 (alternatif/legacy) |
| **Data Science Dashboard** | Streamlit + PyTorch | `datascience/dashboard/streamlit_app.py` | — |
| **Database** | PostgreSQL via `pg` driver | `backend/config/db.js` | 5432 |

### 1.3 Diagram Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                               │
│  AuthContext · React Query · socket.io-client · useSocket.js   │
└────────────┬───────────────────────────────┬────────────────────┘
             │ REST /api/*                    │ WebSocket
             ▼                                ▼
┌────────────────────────────┐    ┌───────────────────────────────┐
│  Express Backend           │    │  Socket.IO Server             │
│  server.js                 │◄──►│  (io.on connection, io.emit)  │
│  Controllers · Routes      │    └───────────────────────────────┘
│  Sequelize ORM             │
└──────┬──────────┬──────────┘
       │          │
       ▼          ▼
┌──────────┐  ┌──────────────────────────────────────────────────┐
│PostgreSQL│  │ Integrasi Eksternal                              │
│          │  │ · FastAPI AI (localhost:8000)                    │
│          │  │ · Open-Meteo Weather API                         │
│          │  │ · WhatsApp Baileys (@whiskeysockets/baileys)     │
│          │  │ · Multer local uploads (/uploads)                │
└──────────┘  └──────────────────────────────────────────────────┘
```

### 1.4 Modul Fungsional Utama (Terpetakan ke Kode)

| Modul | Halaman Frontend | Controller Backend | Model |
|:---|:---|:---|:---|
| Dashboard & Statistik | `DashboardPage.jsx` | `statsController.js` | HazardReport, IncidentReport, Audit, CorrectiveAction |
| Laporan Bahaya | `HazardPage.jsx` | `hazardController.js` | HazardReport |
| Laporan Insiden | `IncidentPage.jsx` | `incidentController.js` | IncidentReport |
| e-PTW | `WorkPermitPage.jsx`, `PermitForm.jsx` | `workPermitController.js` | WorkPermit |
| CAPA | `CorrectiveActionPage.jsx` | `correctiveActionController.js` | CorrectiveAction |
| Emergency SOS | `EmergencyPage.jsx`, `EmergencyControls.jsx` | `emergencyController.js` | EmergencyCall |
| Absensi & Fatigue | `AttendancePage.jsx` | `attendanceController.js`, `fatigueController.js` | Attendance, FatigueLog, LeaveRequest |
| Sertifikasi K3 | `CertificationPage.jsx` | `certificationController.js` | Certification |
| Safety Audit | `AuditPage.jsx` | `auditController.js` | Audit |
| Gamifikasi | `GamificationPage.jsx` | `authController.js` (redeem/leaderboard) | Voucher, User.points |
| Manajemen User | `UsersPage.jsx` | `userController.js` | User |
| Pengaturan Sistem | `SettingsPage.jsx` | `configController.js`, `whatsappController.js` | SystemConfig |

---

## 2. Arsitektur Frontend & Real-Time Sync

### 2.1 Stack & Bootstrap

| Aspek | Implementasi | File Referensi |
|:---|:---|:---|
| Build tool | Vite 5 | `frontend/vite.config.js` |
| Routing | React Router DOM v6 | `frontend/src/App.jsx` |
| HTTP Client | Axios dengan interceptor JWT | `frontend/src/api/axios.js` |
| Styling | TailwindCSS 3 + Lucide icons | `frontend/tailwind.config.js` |
| State auth global | React Context | `frontend/src/store/AuthContext.jsx` |
| Theme (dark/light) | React Context | `frontend/src/store/ThemeContext.jsx` |

**Proxy Development** (`vite.config.js`):
- `/api` → `http://localhost:5001`
- `/uploads` → backend static files
- `/socket.io` → WebSocket proxy dengan `ws: true`

### 2.2 State Management & Caching — React Query

Proyek menggunakan **`@tanstack/react-query` v5** (bukan SWR).

| Halaman/Komponen | Query Key | Operasi |
|:---|:---|:---|
| `DashboardPage.jsx` | `['dashboard-stats']`, `['monthly-analytics']` | `useQuery` fetch stats |
| `HazardPage.jsx` | `['hazards']` | `useQuery` + `useMutation` (create, verify, override) |
| `IncidentPage.jsx` | `['incidents']` | `useQuery` + `useMutation` (create, update investigation) |
| `WorkPermitPage.jsx` | `['permits']` | `useQuery` + `useMutation` (create, approve) |
| `CorrectiveActionPage.jsx` | `['actions']` | `useQuery` + `useMutation` (status update) |
| `SafetyCharts.jsx` | `['monthly-analytics']` | `useQuery` chart data |

**Konfigurasi QueryClient** (`App.jsx`):
```javascript
const queryClient = new QueryClient();
// Tidak ada custom staleTime/gcTime — menggunakan default library
```

**Invalidation pattern:** Setiap mutation sukses memanggil `queryClient.invalidateQueries(['key'])` untuk refresh data.

**Pengecualian:** `AttendancePage.jsx` menggunakan **state lokal + axios langsung** (bukan React Query) untuk absensi, history, dan leave request.

### 2.3 Autentikasi Klien

Alur di `AuthContext.jsx`:

1. Saat mount → baca `localStorage.token` → `GET /api/auth/me`
2. Login → `POST /api/auth/login` → simpan token → set user state
3. Axios interceptor otomatis menambahkan header `Authorization: Bearer <token>`

### 2.4 WebSocket — socket.io-client

#### Hook Global: `useSocket.js`

```javascript
// Singleton socket — tidak di-disconnect saat unmount komponen
const backendUrl = import.meta.env.VITE_SOCKET_URL ||
    (apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : window.location.origin);
socket = io(backendUrl);
```

Return: `{ socket, isConnected }`

#### Event yang Didengarkan di Frontend

| Event | Listener | File | Aksi UI |
|:---|:---|:---|:---|
| `EMERGENCY_SOS` | `EmergencyListener` | `App.jsx` | Full-screen modal merah, alarm audio 880Hz, tampilkan responders |
| `EMERGENCY_RESOLVED` | `EmergencyListener` | `App.jsx` | Modal hijau "KONDISI AMAN", auto-dismiss 5 detik |
| `PTW_REQUEST_CREATED` | `DashboardLayout` | `DashboardLayout.jsx` | Refresh notifikasi bell |
| `PTW_STATUS_UPDATE` | `DashboardLayout` | `DashboardLayout.jsx` | Refresh notifikasi bell |
| `NEW_LEAVE_REQUEST` | `DashboardLayout`, `AttendancePage` | — | Notifikasi admin + popup |
| `LEAVE_REQUEST_UPDATE` | `DashboardLayout`, `AttendancePage` | — | Notifikasi approval/rejection ke user |

#### Event yang Di-emit dari Backend

| Event | Emitter | Payload Utama |
|:---|:---|:---|
| `EMERGENCY_SOS` | `emergencyController.js` | `{ event, emergency, responders }` |
| `EMERGENCY_RESOLVED` | `emergencyController.js` | `{ id_emergency, resolver_name, waktu_selesai }` |
| `PTW_REQUEST_CREATED` | `workPermitController.js` | `{ id_permit, requesterName, jenis_permit, lokasi, ... }` |
| `PTW_STATUS_UPDATE` | `workPermitController.js` | `{ id_permit, status, approval_step, approverName, ... }` |
| `NEW_LEAVE_REQUEST` | `attendanceController.js` | `{ id_leave, userName, type, start_date, ... }` |
| `LEAVE_REQUEST_UPDATE` | `attendanceController.js` | `{ id_leave, id_user, status, message, ... }` |

### 2.5 RBAC di Sisi UI — Sidebar

Menu difilter per role di `Sidebar.jsx`:

| Menu | Roles yang Diizinkan |
|:---|:---|
| Dashboard, Absensi | Semua role |
| Laporan Bahaya | Semua role |
| Laporan Insiden | Admin, HSE, Supervisor, Manager, Staff, Operator |
| e-PTW | Semua role |
| Safety Audit | Admin, HSE, Supervisor |
| CAPA | Admin, HSE, Supervisor, Manager |
| Emergency Response | Admin, HSE, Supervisor, Manager |
| Safety Rewards | Admin, HSE, Supervisor, Manager, Staff, Operator |
| Manajemen User | Admin saja |
| Log Sistem | Admin saja |

> **Catatan:** Role `Vendor` tidak dapat mengakses Laporan Insiden dan Safety Rewards di UI, meskipun backend tidak selalu membatasi endpoint yang sama.

### 2.6 Fitur Kamera & GPS di Frontend

| Halaman | Input Media | Mekanisme |
|:---|:---|:---|
| `HazardPage.jsx` | Foto + koordinat GPS | `getUserMedia` (kamera belakang) + field `koordinat_gps` |
| `IncidentPage.jsx` | Foto insiden | `getUserMedia` (kamera belakang) |
| `AttendancePage.jsx` | Selfie wajib clock-in | `getUserMedia` (kamera depan, mirrored) |
| `DashboardPage.jsx` | Cuaca lokasi | `navigator.geolocation` → Open-Meteo API |

---

## 3. Layanan AI & Pengolahan Data (Python/FastAPI)

### 3.1 Arsitektur AI Service

**Entry point utama:** `aiservice/main.py`  
**Port:** 8000 (`uvicorn.run(app, host="0.0.0.0", port=8000)`)  
**Backend proxy:** Node.js memanggil via `AI_SERVICE_URL` env var (default `http://localhost:8000`)

| Endpoint FastAPI | Handler | Logic File |
|:---|:---|:---|
| `GET /` | Health check | `main.py` |
| `POST /predict-risk` | Klasifikasi risiko bahaya | `ai_logic.py` → `predict_risk()` |
| `POST /predict-fatigue` | Prediksi kelelahan | `ai_logic.py` → `predict_fatigue()` |
| `POST /predict-text` | NLP joblib model | `nlp_model.py` → `predict_text()` |

**Service alternatif/legacy:** `ai/nlpnuraga/app.py` — FastAPI standalone dengan endpoint `POST /predict` memuat `safety_model.joblib` langsung.

### 3.2 Fatigue AI & Absensi (WellGuard)

#### Alur Clock-In End-to-End

```
AttendancePage.jsx (selfie + sleep_hours + stress_level)
    │
    ▼ POST /api/attendance/clock-in (multipart/form-data)
attendanceController.js → clockIn()
    │
    ├─ Validasi: sudah clock-in hari ini? → 400
    ├─ Upload foto_bukti via Multer → uploads/<timestamp>.jpg
    │
    ▼ POST http://localhost:8000/predict-fatigue
aiservice/ai_logic.py → predict_fatigue()
    │
    ▼ Attendance.create({ fatigue_status, recommendation, ... })
PostgreSQL → Attendances table
```

#### Input yang Diterima

| Field | Sumber | Wajib | Keterangan |
|:---|:---|:---|:---|
| `sleep_hours` | Form body (float) | Tidak (opsional untuk AI) | Jam tidur malam sebelumnya |
| `stress_level` | Form body (float) | Tidak (opsional untuk AI) | Skala stres self-report |
| `foto_bukti` | Multipart file | **Wajib di frontend** | Selfie kehadiran; backend tidak hard-block jika kosong |
| GPS | — | **Tidak digunakan** | Clock-in tidak menerima koordinat |

> **Penting:** Tidak ada analisis gambar/video untuk fatigue. Foto hanya disimpan sebagai bukti kehadiran. AI hanya memproses angka `sleep_hours` dan `stress_level`.

#### Logika Prediksi Fatigue (`ai_logic.py`)

```python
# Rule-based heuristic (WellGuard EDA insights):
if sleep_hours < 5.0 and stress_level > 7.0:
    fatigue_status = "Tinggi"
elif sleep_hours < 6.0 or stress_level >= 6.0:
    fatigue_status = "Sedang"
elif sleep_hours >= 7.0 and stress_level <= 5.0:
    fatigue_status = "Rendah"
else:
    fatigue_status = "Sedang"  # default middle ground
```

#### Parameter Blokir vs Izin Bekerja

| Level | Kondisi AI | Blokir Hard di Backend? | Perilaku Aktual |
|:---|:---|:---|:---|
| **Tinggi** | sleep < 5 AND stress > 7 | ❌ **Tidak** | Clock-in tetap berhasil; UI menampilkan peringatan di `AttendancePage.jsx`: *"Sistem menyarankan Anda tidak mengambil tugas berisiko tinggi hari ini"* |
| **Sedang** | sleep < 6 OR stress >= 6 | ❌ Tidak | Rekomendasi perhatian |
| **Rendah** | sleep >= 7 AND stress <= 5 | — | Kondisi baik |
| AI unavailable | Error axios | ❌ Tidak | `fatigue_status: 'Tidak Diketahui'`, clock-in tetap disimpan |

Endpoint alternatif: `POST /api/fatigue/log` (`fatigueController.js`) — **gagal total (503)** jika AI service down, berbeda dengan clock-in yang graceful degrade.

### 3.3 NLP Risk Prediction — Laporan Bahaya

#### Alur Klasifikasi Risiko

```
HazardPage.jsx → analyzeWithAI()
    │
    ▼ POST /api/ai/analyze { deskripsi, lokasi }
aiController.js → analyzeRisk()
    │
    ▼ POST http://localhost:8000/predict-risk { description, location }
ai_logic.py → predict_risk()
    │
    ▼ Response { predicted_risk, confidence, recommendation }
Frontend auto-set formData.risiko = predicted_risk
```

#### Algoritma Rule-Based (`ai_logic.py`)

**Tingkat risiko:** `Low` → `Medium` → `High` → `Critical` (ordinal, ambil yang tertinggi)

**1. Keyword scoring dari deskripsi** (`KEYWORD_RISKS`):

| Keyword (contoh) | Level |
|:---|:---|
| kebakaran, ledakan, kimia, bocor gas | Critical |
| bocor, tumpahan, listrik, rusak | High |
| licin, kabel, tersandung | Medium |
| debu, bising, lelah, panas | Low |

**Heuristic tambahan:** Jika tidak ada keyword match dan deskripsi > 30 kata → minimum `Medium`.

**2. Location scoring** (`LOCATION_RISKS`):

| Lokasi (contoh) | Level |
|:---|:---|
| confined space, reactor | Critical |
| boiler, pipeline, tank, electrical | High |
| storage, gudang | Medium |

**3. Confidence calculation:**
```python
base = 0.65 + min(0.25, matches * 0.08)
if risk == "Critical": base += 0.08
confidence = round(min(base, 0.99), 2)
```

**4. Rekomendasi per level** (`RECOMMENDATIONS`):
- Critical: *"Hentikan aktivitas, evakuasi area, dan panggil tim HSE segera."*
- High: *"Lakukan inspeksi segera dan terapkan kontrol teknis sebelum lanjut."*
- Medium: *"Pantau area dan perkuat mitigasi sebelum bekerja lebih lanjut."*
- Low: *"Catat kondisi dan lakukan pemantauan rutin."*

#### NLP Model Joblib (Terpisah)

`nlp_model.py` memuat `models/safety_model.joblib` via joblib untuk endpoint `POST /predict-text`. Model ini **tidak terhubung langsung** ke flow laporan bahaya utama — flow hazard menggunakan rule-based `predict_risk()`, bukan ML classifier.

#### Override Manual

HSE/Admin dapat override risiko AI via `PATCH /api/hazards/:id/override` (`hazardController.js`), men-set `is_overridden: true`.

---

## 4. Modul Operasional & Alur Kerja Kritis (Backend Node.js)

### 4.1 Izin Kerja (e-PTW)

**File inti:** `workPermitController.js`, `WorkPermit.js`, `PermitForm.jsx`, `workPermitRoutes.js`

#### Jenis Permit (ENUM)

`Hot Work`, `Cold Work`, `Confined Space`, `Working at Height`, `Electrical Work`, `Excavation`

#### Rantai Persetujuan Berjenjang

```
Step 1 (approval_step=1) → Supervisor atau Admin
    │ supervisor_sig = true, supervisor_approved_at = now
    ▼
Step 2 (approval_step=2) → HSE atau Admin
    │ safety_officer_sig = true, safety_officer_approved_at = now
    ▼
Step 3 (approval_step=3) → Manager atau Admin
    │ approver_sig = true, manager_approved_at = now
    │ status = 'Approved', approved_by = req.user.id, approval_step = 4
    ▼
Fully Approved
```

**Validasi per step** (`approvePermit`):
```javascript
if (permit.approval_step === 1) {
    if (userRole !== 'Supervisor' && userRole !== 'Admin')
        return 403 'Only Supervisor can approve this step.'
}
// Step 2: HSE/Admin only
// Step 3: Manager/Admin only
```

**Rejection:** Langsung set `status = 'Rejected'` tanpa peduli step.

#### Status Lifecycle

| Status | Trigger |
|:---|:---|
| `Pending` | Saat `requestPermit()` create |
| `Approved` | Manager approve step 3 |
| `Rejected` | Approver kirim status Rejected |
| `Closed` | `closePermit()` dengan housekeeping verification |
| `Expired` | `autoExpirePermits()` scheduler setiap 60 detik jika `waktu_selesai < now` |

#### Close-Out Requirements

`closePermit()` set:
- `close_applicant_sig`, `close_supervisor_sig`, `housekeeping_verified` (dari body, default true)
- `closedAt = new Date()`, `status = 'Closed'`

#### Notifikasi Side Effects

- WebSocket: `PTW_REQUEST_CREATED`, `PTW_STATUS_UPDATE`
- WhatsApp via Baileys: notify Supervisor/Admin/HSE/Manager/Requester per step
- Audit log: `REQUEST_PTW`, `APPROVE_PTW_STEP1/2/FINAL`, `REJECT_PTW`, `CLOSE_PTW`

### 4.2 Investigasi Insiden & 5 Whys

**File inti:** `incidentController.js`, `IncidentReport.js`, `IncidentPage.jsx`

#### Struktur Data 5 Whys

Disimpan sebagai **JSON column** di tabel `IncidentReports`:

```javascript
five_whys: { why1, why2, why3, why4, why5 }  // IncidentReport.js
```

#### Alur Create vs Update

| Operasi | Endpoint | Siapa | Transaction |
|:---|:---|:---|:---|
| **Create** | `POST /api/incidents` | Semua user authenticated | ✅ `sequelize.transaction()` |
| **Update investigasi** | `PUT /api/incidents/:id` | HSE atau Admin saja | ✅ `sequelize.transaction()` |

**Create payload** (`createIncident`):
- `kategori`, `kronologi`, `korban`, `loss_cost`, `five_whys` (JSON string atau object)
- `foto` via Multer upload
- `id_user` dari JWT

**Update payload** (`updateIncident`):
- Hanya `loss_cost` dan `five_whys` yang dapat diubah
- Role check: `req.user.role !== 'HSE' && !== 'Admin'` → 403

> **Catatan:** Tidak ada tabel terpisah untuk 5 Whys — semuanya embedded JSON di satu row `IncidentReport`. Tidak ada foreign key ke tabel anak.

#### Side Effects Create

- WhatsApp broadcast ke users dengan role HSE, Admin, Manager
- `clearStatsCache()` invalidasi cache dashboard

### 4.3 CAPA (Corrective Action)

**File inti:** `correctiveActionController.js`, `CorrectiveAction.js`, `hazardController.js`

#### Penugasan Tugas Perbaikan

**Manual create** (`POST /api/actions`):
```javascript
CorrectiveAction.create({
    id_hazard,      // FK ke HazardReport
    assigned_to,    // User ID (integer)
    deadline,       // DATE
    description,
    status: 'Open'  // default
});
```
**Authorization:** HSE atau Supervisor (`correctiveActionRoutes.js`)

**Auto-create dari Hazard** (`hazardController.js`):
- Trigger: `risiko === 'High' || risiko === 'Critical'` saat create hazard
- Default assignee: `assigned_to: 1` (hardcoded User ID 1 = HSE Manager)
- Deadline: +24 jam dari sekarang
- Description: `"Immediate corrective action required for: ${deskripsi}"`

**Override risk logic:**
- High/Critical → create CAPA jika belum ada, atau reopen jika Closed
- Low/Medium → auto-close CAPA existing jika ada

#### Update Status

`PATCH /api/actions/:id/status` — semua authenticated user (tidak ada role restriction di route).

**Relasi model:**
- `CorrectiveAction.belongsTo(HazardReport)` via `id_hazard`
- `CorrectiveAction.belongsTo(User, { as: 'assignee' })` via `assigned_to`
- Field `id_incident` ada di model tapi **tidak digunakan** di controller saat ini

### 4.4 Emergency SOS

**File inti:** `emergencyController.js`, `EmergencyCall.js`, `App.jsx` (EmergencyListener)

#### Alur Trigger

```
POST /api/emergency { jenis_kejadian, lokasi }
    │
    ├─ 1. Zone detection dari WorkPermit aktif (Approved/Active, waktu valid)
    │      Cek apakah user adalah applicant atau ada di daftar_pekerja JSON
    │
    ├─ 2. EmergencyCall.create({ jenis_kejadian, lokasi: victimZone })
    │
    ├─ 3. Responder matching dari Certification (status Active)
    │      Filter by jenis_sertifikasi keywords:
    │        fire → ['k3','fire','damkar']
    │        medical → ['first aid','medis','k3','medical']
    │        spill → ['hazmat','chemical','k3','storage']
    │        default → ['k3']
    │      Match zone dengan active permits
    │      Fallback: allResponders jika zoneResponders kosong
    │
    ├─ 4. io.emit('EMERGENCY_SOS', { event, emergency, responders })
    │
    └─ 5. WhatsApp broadcast ke semua user dengan no_whatsapp
           + direct message ke responders
```

#### Broadcast WebSocket (Kode Kritis)

```javascript
// emergencyController.js — triggerEmergency()
const io = req.app.get('io');
if (io) {
    io.emit('EMERGENCY_SOS', {
        event: 'emergency-triggered',
        emergency: {
            id_emergency, jenis_kejadian, lokasi,
            waktu_kejadian, status, reporter_name
        },
        responders: finalResponders
    });
}
```

#### Resolve Emergency

`PATCH /api/emergency/:id/resolve` (Admin, HSE, Manager):
- Set `status = 'Closed'`, `handled_by = req.user.id`
- `io.emit('EMERGENCY_RESOLVED', { id_emergency, resolver_name, waktu_selesai })`
- WhatsApp broadcast status aman

---

## 5. Keamanan, RBAC, & Isolasi Data

### 5.1 Middleware Autentikasi

**File:** `backend/middlewares/authMiddleware.js`

#### `protect` — Verifikasi JWT

```javascript
// Token dari header Authorization: Bearer <token> ATAU query ?token=
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;  // { id, role, nama }
```

JWT payload saat login (`authController.js`):
```javascript
jwt.sign({ id: user.id_user, role: user.role, nama: user.nama }, JWT_SECRET, { expiresIn: '1d' })
```

#### `authorize(...roles)` — Role Gate

```javascript
if (!roles.includes(req.user.role)) return 403;
```

### 5.2 Mapping 6 Peran (Kode vs Nama Bisnis)

| Peran Bisnis | Enum di Database | File Definisi |
|:---|:---|:---|
| System Admin | `Admin` | `User.js` role ENUM |
| Area Manager | `Manager` | `User.js` |
| HSE Officer | `HSE` | `User.js` |
| Area Supervisor | `Supervisor` | `User.js` |
| Staff | `Staff` | Ditambahkan via migration di `server.js` |
| Vendor | `Vendor` | Ditambahkan via migration di `server.js` |

> Legacy: `Operator` dimigrasi ke `Staff` via SQL di `server.js`. UI masih referensi `Operator`/`Kontraktor` di `Sidebar.jsx`.

### 5.3 Matriks Akses Endpoint (Backend)

| Endpoint Pattern | Roles |
|:---|:---|
| `POST /api/users/*` | Admin |
| `GET /api/logs` | Admin |
| `GET/POST /api/config` | Admin |
| `PATCH /api/permits/:id/approve` | HSE, Supervisor, Manager, Admin |
| `PATCH /api/hazards/:id/status` | HSE, Supervisor |
| `PATCH /api/hazards/:id/override` | HSE, Admin |
| `PATCH /api/hazards/:id/verify` | HSE, Admin |
| `POST /api/actions` | HSE, Supervisor |
| `POST /api/audits` | HSE, Manager |
| `PATCH /api/emergency/:id/resolve` | Admin, HSE, Manager |
| `GET /api/emergency` | Admin, HSE, Supervisor, Manager |
| `GET /api/attendance/all` | Admin, HSE, Manager, Supervisor |
| `PUT /api/attendance/leave/:id` | Admin, Supervisor |
| `POST /api/certifications` | Admin |
| `GET /api/certifications/all` | Admin, HSE, Manager, Supervisor |
| `GET /api/vouchers/all`, `PATCH claim` | HSE, Admin |
| `GET/POST /api/wa/*` (kecuali stream) | Admin |

### 5.4 Isolasi Data per Role

| Resource | Isolasi | Implementasi |
|:---|:---|:---|
| **WorkPermit** | Staff/Vendor hanya lihat milik sendiri | `getPermits()` filter `where: { id_user: req.user.id }` |
| **Attendance history** | User biasa: `/my-history`; Admin/HSE/Manager/Supervisor: `/all` | `attendanceRoutes.js` |
| **Certification** | User: `/my`; Admin view all | `certificationController.js` |
| **Voucher** | User: `/my` only | `voucherController.js` |
| **Hazard/Incident list** | **Tidak ada filter** — semua user authenticated melihat semua data | `getHazards()`, `getIncidents()` |
| **Profile fields** | User hanya bisa edit email, no_whatsapp, foto, jenis_kelamin | `authController.updateProfile()` |
| **Operational fields** | nik, jabatan, area_kerja hanya Admin via `/api/users/:id` | `userController.js` |

> **Gap keamanan:** Vendor tidak diisolasi di level backend untuk hazards/incidents — isolasi hanya di UI Sidebar.

### 5.5 Password Security

- Hash bcrypt salt 10 via Sequelize hooks (`User.js` beforeCreate/beforeUpdate)
- Login compare via `bcrypt.compare()`

---

## 6. Skema Database, ORM, & Integritas (PostgreSQL/Sequelize)

### 6.1 Konfigurasi ORM

**File:** `backend/config/db.js`

```javascript
new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
});
```

**Sync strategy:** `sequelize.sync({ force: false })` di `server.js` — tidak drop tables, plus manual `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations.

### 6.2 Skema Tabel Utama

#### Users

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_user` | INTEGER PK AI | |
| `nama` | STRING NOT NULL | |
| `email` | STRING UNIQUE NOT NULL | |
| `password` | STRING NOT NULL | bcrypt hashed |
| `role` | ENUM(Admin,HSE,Supervisor,Manager,Staff,Vendor) | |
| `foto` | STRING | filename di /uploads |
| `no_whatsapp` | STRING | Format +62xxx |
| `nik` | STRING | Badge number, Admin-only edit |
| `jabatan` | STRING | Job title |
| `area_kerja` | STRING | SOS zone routing |
| `jenis_kelamin` | STRING default 'Laki-laki' | |
| `points` | INTEGER default 0 | Gamifikasi |
| timestamps | createdAt, updatedAt | |

#### Attendances

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_attendance` | INTEGER PK AI | |
| `id_user` | INTEGER FK → Users | |
| `type` | ENUM('Datang','Pulang') | |
| `sleep_hours` | FLOAT | Input WellGuard |
| `stress_level` | FLOAT | Input WellGuard |
| `fatigue_status` | STRING | Output AI: Rendah/Sedang/Tinggi |
| `recommendation` | STRING | Rekomendasi AI |
| `foto_bukti` | STRING | Selfie filename |

#### FatigueLogs

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_log` | INTEGER PK AI | |
| `id_user` | INTEGER FK → Users | |
| `sleep_hours` | FLOAT NOT NULL | |
| `stress_level` | FLOAT NOT NULL | |
| `fatigue_status` | STRING NOT NULL | |
| `recommendation` | STRING | |

#### WorkPermits

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_permit` | INTEGER PK AI | |
| `id_user` | INTEGER FK → Users | Applicant |
| `jenis_permit` | ENUM(6 jenis) | Hot Work, dll. |
| `perusahaan`, `lokasi` | STRING | |
| `waktu_mulai`, `waktu_selesai` | DATE | |
| `deskripsi_pekerjaan` | TEXT | |
| `supervisor_name` | STRING | |
| `daftar_pekerja` | JSON | Array nama pekerja |
| `bahaya`, `apd` | JSON | Arrays |
| `sistem_isolasi` | TEXT | |
| `gas_test` | JSON | { o2, h2s, co, lel } |
| `kondisi_cuaca` | STRING | |
| `jsa_content` | JSON | |
| `approval_step` | INTEGER default 1 | 1→2→3→4 |
| `status` | ENUM(Pending,Approved,Active,Closed,Rejected,Expired) | |
| `applicant_sig`, `supervisor_sig`, `safety_officer_sig`, `approver_sig` | BOOLEAN | |
| `supervisor_approved_at`, `safety_officer_approved_at`, `manager_approved_at` | DATE | |
| `approved_by` | INTEGER FK → Users | |
| `close_applicant_sig`, `close_supervisor_sig`, `housekeeping_verified` | BOOLEAN | Close-out |
| `closedAt` | DATE | |

#### HazardReports

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_hazard` | INTEGER PK AI | |
| `id_user` | INTEGER FK → Users | Reporter |
| `lokasi` | STRING NOT NULL | |
| `deskripsi` | TEXT NOT NULL | |
| `risiko` | ENUM(Low,Medium,High,Critical) default Low | |
| `original_risiko` | STRING | Sebelum override |
| `is_overridden` | BOOLEAN default false | |
| `is_verified` | BOOLEAN default false | HSE verification |
| `foto` | STRING | |
| `koordinat_gps` | STRING | |
| `status` | ENUM(Open,In Progress,Resolved,Closed) | |

#### IncidentReports

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_incident` | INTEGER PK AI | |
| `id_user` | INTEGER FK → Users | Reporter |
| `kategori` | STRING NOT NULL | Near Miss, dll. |
| `five_whys` | JSON | { why1..why5 } |
| `loss_cost` | FLOAT default 0 | |
| `koordinat_gps` | STRING | (field ada, tidak diisi controller) |
| `foto` | STRING | |
| `kronologi` | TEXT | |
| `korban` | STRING | |

#### CorrectiveActions

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_action` | INTEGER PK AI | |
| `id_hazard` | INTEGER FK nullable | |
| `id_incident` | INTEGER nullable | Tidak digunakan di controller |
| `description` | TEXT NOT NULL | |
| `assigned_to` | INTEGER FK → Users | |
| `deadline` | DATE NOT NULL | |
| `status` | ENUM(Open,In Progress,Closed) | |

#### EmergencyCalls

| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_emergency` | INTEGER PK AI | |
| `jenis_kejadian` | STRING NOT NULL | fire, medical, spill |
| `lokasi` | STRING NOT NULL | Auto-detected dari PTW |
| `waktu_kejadian` | DATE default NOW | |
| `status` | ENUM(Triggered,Responded,Closed) | |
| `handled_by` | INTEGER FK → Users | Resolver |

#### Tabel Tambahan

| Tabel | Model File | Status |
|:---|:---|:---|
| Certifications | `Certification.js` | Aktif, digunakan SOS responder matching |
| Audits | `Audit.js` | Safety audit records |
| AuditLogs | `AuditLog.js` | System audit trail |
| LeaveRequests | `LeaveRequest.js` | Izin/Cuti/Sakit |
| Vouchers | `Voucher.js` | Gamifikasi rewards |
| SystemConfigs | `SystemConfig.js` | Key-value config store |
| ContractorCSMS | `ContractorCSMS.js` | **Model defined, tidak di-wire ke routes** |

### 6.3 Relasi Sequelize (server.js)

```
User ──hasMany──> HazardReport, IncidentReport, WorkPermit, Certification, Voucher, AuditLog
HazardReport ──hasMany──> CorrectiveAction
CorrectiveAction ──belongsTo──> HazardReport, User (assignee)
WorkPermit ──belongsTo──> User (applicant), User (approver)
EmergencyCall ──belongsTo──> User (responder)
Audit ──belongsTo──> User (auditor)
Attendance/LeaveRequest/FatigueLog ──belongsTo──> User (defined in model files)
```

### 6.4 Penggunaan `sequelize.transaction()` — ACID

| File | Fungsi | Operasi dalam Transaction |
|:---|:---|:---|
| `incidentController.js` | `createIncident` | `IncidentReport.create()` |
| `incidentController.js` | `updateIncident` | find + save + re-fetch with include |

> **Temuan:** Hanya modul Incident yang menggunakan explicit transaction. Operasi multi-table lain (misalnya hazard create + auto CAPA create) **tidak** wrapped dalam transaction — potensi partial failure jika CAPA create gagal setelah hazard tersimpan.

### 6.5 Caching Backend

`statsController.js` — in-memory cache TTL 10 detik untuk dashboard stats, monthly analytics, report data. Invalidated via `clearStatsCache()` dari hazard/incident/CAPA/audit controllers.

---

## 7. API Contracts & Integrasi Eksternal

### 7.1 Daftar Endpoint REST API Utama

#### Auth — `/api/auth` (`authRoutes.js` → `authController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/register` | Public | `register` |
| POST | `/login` | Public | `login` |
| POST | `/forgot-password` | Public | `forgotPassword` (mock, no email) |
| POST | `/reset-password` | Public | `resetPassword` |
| GET | `/me` | JWT | `getMe` |
| PUT | `/profile` | JWT + upload | `updateProfile` |
| PUT | `/change-password` | JWT | `changePassword` |
| POST | `/redeem` | JWT | `redeemPoints` |
| GET | `/leaderboard` | JWT | `getLeaderboard` |
| GET | `/rewards` | JWT | `getRewards` |

#### Users — `/api/users` (`userRoutes.js` → `userController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/` | Admin | `getAllUsers` |
| POST | `/` | Admin | `createUser` |
| PUT | `/:id` | Admin | `updateUser` |
| DELETE | `/:id` | Admin | `deleteUser` |

#### Hazards — `/api/hazards` (`hazardRoutes.js` → `hazardController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | JWT + foto | `createHazard` |
| GET | `/` | JWT | `getHazards` |
| PATCH | `/:id/status` | HSE, Supervisor | `updateStatus` |
| PATCH | `/:id/override` | HSE, Admin | `overrideRisk` |
| PATCH | `/:id/verify` | HSE, Admin | `verifyHazard` |

#### Incidents — `/api/incidents` (`incidentRoutes.js` → `incidentController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | JWT + foto | `createIncident` |
| GET | `/` | JWT | `getIncidents` |
| PUT | `/:id` | JWT (HSE/Admin update) | `updateIncident` |

#### Work Permits — `/api/permits` (`workPermitRoutes.js` → `workPermitController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | JWT | `requestPermit` |
| GET | `/` | JWT | `getPermits` |
| PATCH | `/:id/approve` | HSE, Supervisor, Manager, Admin | `approvePermit` |
| PATCH | `/:id/close` | JWT | `closePermit` |

#### Corrective Actions — `/api/actions` (`correctiveActionRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | HSE, Supervisor | `createAction` |
| GET | `/` | JWT | `getActions` |
| PATCH | `/:id/status` | JWT | `updateActionStatus` |

#### Emergency — `/api/emergency` (`emergencyRoutes.js` → `emergencyController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | JWT | `triggerEmergency` |
| GET | `/` | Admin, HSE, Supervisor, Manager | `getEmergencies` |
| PATCH | `/:id/resolve` | Admin, HSE, Manager | `resolveEmergency` |

#### Attendance — `/api/attendance` (`attendanceRoutes.js` → `attendanceController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/clock-in` | JWT + foto_bukti | `clockIn` |
| POST | `/clock-out` | JWT | `clockOut` |
| GET | `/today` | JWT | `getTodayStatus` |
| GET | `/my-history` | JWT | `getMyHistory` |
| GET | `/all` | Admin, HSE, Manager, Supervisor | `getAllHistory` |
| POST | `/leave` | JWT + document | `submitLeave` |
| PUT | `/leave/:id_leave` | Admin, Supervisor | `approveLeave` |

#### Fatigue — `/api/fatigue` (`fatigueRoutes.js` → `fatigueController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/log` | JWT | `logFatigue` |
| GET | `/history` | JWT | `getFatigueHistory` |

#### AI Proxy — `/api/ai` (`aiRoutes.js` → `aiController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/analyze` | JWT | `analyzeRisk` |

#### Stats — `/api/stats` (`statsRoutes.js` → `statsController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/` | JWT | `getDashboardStats` |
| GET | `/monthly` | JWT | `getMonthlyAnalytics` |
| GET | `/report-data` | JWT | `getReportData` |

#### Certifications — `/api/certifications` (`certificationRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | Admin | `addCertification` |
| GET | `/my` | JWT | `getMyCertifications` |
| GET | `/all` | Admin, HSE, Manager, Supervisor | `getAllCertifications` |
| PUT | `/:id` | Admin | `updateCertification` |
| DELETE | `/:id` | Admin | `deleteCertification` |

#### Audits — `/api/audits` (`auditRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| POST | `/` | HSE, Manager | `createAudit` |
| GET | `/` | JWT | `getAudits` |

#### Vouchers — `/api/vouchers` (`voucherRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/my` | JWT | `getMyVouchers` |
| GET | `/all` | HSE, Admin | `getAllVouchers` |
| PATCH | `/:id/claim` | HSE, Admin | `claimVoucher` |

#### Config — `/api/config` (`configRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/` | Admin | `getConfig` |
| POST | `/` | Admin | `updateConfig` |

#### Logs — `/api/logs` (`logRoutes.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/` | Admin | `getLogs` |

#### WhatsApp — `/api/wa` (`whatsappRoutes.js` → `whatsappController.js`)

| Method | URL | Auth | Controller Function |
|:---|:---|:---|:---|
| GET | `/status` | Admin | `getStatus` |
| GET | `/stream` | JWT (SSE) | `stream` |
| POST | `/logout` | Admin | `logout` |
| POST | `/reconnect` | Admin | `manualReconnect` |
| POST | `/test` | Admin | `testMessage` |

### 7.2 FastAPI AI Service Endpoints

| Method | URL | Request Body | Response |
|:---|:---|:---|:---|
| GET | `/` | — | `{ message }` |
| POST | `/predict-risk` | `{ description, location? }` | `{ predicted_risk, confidence, recommendation }` |
| POST | `/predict-fatigue` | `{ sleep_hours, stress_level }` | `{ fatigue_status, recommendation }` |
| POST | `/predict-text` | `{ text }` | `{ success, prediction }` or `{ success: false, error }` |

### 7.3 Integrasi Eksternal

| Integrasi | Teknologi | File Referensi | Kegunaan |
|:---|:---|:---|:---|
| **File Upload** | Multer disk storage | `uploadMiddleware.js` | Foto hazard, insiden, absensi, profil, dokumen izin. Max 10MB, image/* only. Served via `/uploads` static |
| **AWS S3 / Cloudinary** | — | **Tidak digunakan** | Semua upload lokal ke folder `uploads/` |
| **WhatsApp Gateway** | Baileys (`@whiskeysockets/baileys`) | `whatsappService.js` | SOS broadcast, PTW notifications, leave approval, incident alerts. Session persisted di `backend/wa_session/` |
| **Open-Meteo Weather** | REST API (client-side) | `DashboardPage.jsx` | `api.open-meteo.com/v1/forecast` + air quality API via geolocation |
| **Open-Meteo Config** | SystemConfig key | `server.js` seed, `SettingsPage.jsx` | `open_meteo_endpoint` configurable by Admin |
| **Nodemailer / Email** | — | **Tidak digunakan** | `forgotPassword` hanya mock response |
| **FastAPI AI Service** | axios HTTP | `aiController.js`, `attendanceController.js`, `fatigueController.js` | Risk & fatigue prediction. Config key: `ai_fastapi_endpoint` |
| **QR Code** | html5-qrcode | `AuditPage.jsx` (implied) | Asset QR scanning for audits |
| **PDF Export** | jsPDF + autotable | `reportGenerator.js`, `IncidentPage.jsx` | Incident report PDF generation |

### 7.4 Environment Variables

| Variable | Default | Digunakan Di |
|:---|:---|:---|
| `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT` | — | `config/db.js` |
| `JWT_SECRET` | — | `authMiddleware.js`, `authController.js` |
| `PORT` | 5000 | `server.js` |
| `AI_SERVICE_URL` | `http://localhost:8000` | `aiController.js`, `attendanceController.js`, `fatigueController.js` |
| `VITE_API_BASE_URL` | `/api` | `axios.js` |
| `VITE_SOCKET_URL` | derived from API URL | `useSocket.js` |

### 7.5 SystemConfig Keys (Seeded Defaults)

| Key | Default Value | Purpose |
|:---|:---|:---|
| `whatsapp_gateway_number` | `+6281234567890` | WA gateway reference |
| `whatsapp_api_key` | `dummy-wa-api-key` | WA API key placeholder |
| `ai_fastapi_endpoint` | `http://localhost:8000` | AI service URL |
| `open_meteo_endpoint` | `https://api.open-meteo.com` | Weather API base |

---

## Lampiran: WebSocket Event Catalog

| Event | Direction | Trigger | Consumers |
|:---|:---|:---|:---|
| `EMERGENCY_SOS` | Server → All clients | SOS triggered | `App.jsx` EmergencyListener |
| `EMERGENCY_RESOLVED` | Server → All clients | SOS resolved | `App.jsx` EmergencyListener |
| `PTW_REQUEST_CREATED` | Server → All clients | New PTW submitted | `DashboardLayout.jsx` |
| `PTW_STATUS_UPDATE` | Server → All clients | PTW approved/rejected/closed | `DashboardLayout.jsx` |
| `NEW_LEAVE_REQUEST` | Server → All clients | Leave submitted | `DashboardLayout.jsx`, `AttendancePage.jsx` |
| `LEAVE_REQUEST_UPDATE` | Server → All clients | Leave approved/rejected | `DashboardLayout.jsx`, `AttendancePage.jsx` |
| `connection` / `disconnect` | Bidirectional | Socket lifecycle | `server.js`, `useSocket.js` |

---

## Lampiran: Known Gaps & Technical Debt

1. **Fatigue blocking:** Tidak ada hard block clock-in untuk status `Tinggi` — hanya advisory UI.
2. **No image AI:** Foto absensi/hazard tidak dianalisis ML — hanya disimpan.
3. **CAPA assignee hardcoded:** Auto-CAPA assigns to User ID `1`.
4. **Partial transactions:** Hanya incident controller menggunakan `sequelize.transaction()`.
5. **ContractorCSMS model:** Defined but no API exposure.
6. **Email auth recovery:** Mock only, no Nodemailer integration.
7. **Vendor data isolation:** Backend tidak filter data per vendor — hanya UI restriction.
8. **Dual NLP services:** `aiservice/` dan `ai/nlpnuraga/` coexist — potential confusion.

---

*Dokumen ini dihasilkan dari inspeksi langsung terhadap codebase Nuraga v1.0.0. Semua referensi file merujuk ke struktur direktori proyek aktual.*
