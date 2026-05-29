const sequelize = require('./config/db');
const User = require('./models/User');
const HazardReport = require('./models/HazardReport');
const IncidentReport = require('./models/IncidentReport');
const Audit = require('./models/Audit');
const CorrectiveAction = require('./models/CorrectiveAction');
const Certification = require('./models/Certification');
const WorkPermit = require('./models/WorkPermit');
const EmergencyCall = require('./models/EmergencyCall');

const CHECKLIST_TEMPLATES = {
    'APAR': ['Tabung tidak berkarat', 'Segel dalam kondisi baik', 'Penunjuk tekanan pada posisi hijau', 'Label inspeksi terbaru', 'Akses tidak terhalang'],
    'Perancah': ['Kaki perancah terkunci', 'Papan lantai tidak patah', 'Pagar pengaman terpasang', 'Beban tidak melebihi kapasitas'],
    'Forklift': ['Rem berfungsi normal', 'Lampu peringatan hidup', 'Klakson berfungsi', 'Fork tidak bengkok', 'Sabuk pengaman ada'],
    'Panel Listrik': ['Tutup panel tertutup', 'Label bahaya terpasang', 'Grounding terhubung', 'Tidak ada kabel terkelupas'],
};

const hazardLocations = [
    'Warehouse Zone A', 'Power Room B', 'Lantai Produksi 1', 'Main Factory Yard',
    'Loading Dock C', 'Lantai Produksi 2', 'Mechanical Workshop', 'Chemical Storage Room'
];

const hazardDescriptions = [
    'Lantai licin karena ceceran oli di dekat stasiun forklift.',
    'Kabel tegangan tinggi terbuka tanpa pelindung di panel B-12.',
    'Tekanan tabung APAR berada di zona merah (kurang tekanan).',
    'Pintu keluar darurat terhalang oleh tumpukan palet kayu.',
    'Pekerja mengoperasikan overhead crane tanpa menggunakan helm keselamatan.',
    'Scaffolding di area konstruksi B2 tidak memiliki mid-rail pengaman.',
    'Drum bahan kimia disimpan tanpa label identifikasi di zona A.',
    'Alarm mundur forklift tidak berfungsi saat beroperasi.',
    'Kabel listrik liar melintang di jalur penyeberangan pejalan kaki.',
    'Penutup pelindung mesin gerinda pecah dan terlepas.',
    'Akumulasi debu tebal di dekat ventilasi pembuangan berpotensi memicu percikan api.'
];

const risks = ['Low', 'Medium', 'High', 'Critical'];
const incidentCategories = ['Medical', 'Near Miss', 'Property Damage', 'First Aid'];
const incidentChronologies = [
    'Pekerja tersandung kabel melintang dan mengalami cedera memar pada lutut kanan.',
    'Forklift berjalan mundur di jalur pejalan kaki tanpa alarm berbunyi, nyaris menabrak operator.',
    'Percikan api las mengenai kain lap basah berbahan bakar minyak, sempat menyala namun langsung dipadamkan.',
    'Cairan pembersih kimia tepercik ke tangan pekerja saat penuangan manual, langsung dibilas di wastafel.',
    'Pekerja terpeleset di tangga besi basah saat hujan, mengalami terkilir ringan pada pergelangan tangan.'
];
const victims = [
    'Main Operator', 'PT Petro Kimia Contractor', 'CV Bangun Jaya Worker', 'Workshop Technician'
];
const templates = ['APAR', 'Perancah', 'Forklift', 'Panel Listrik'];
const checklistScore = ['5/5', '4/5', '4/4', '3/4'];

const permitJobDescriptions = {
    'Hot Work': 'Pengelasan dan pemotongan pipa steam di area boiler sesuai prosedur LOTO dan izin api terbuka.',
    'Cold Work': 'Penggantian bearing pompa sentrifugal di pump station tanpa risiko penyalaan api.',
    'Confined Space': 'Inspeksi dan pembersihan bagian dalam tangki penyimpan bahan bakar HSD.',
    'Working at Height': 'Pemasangan scaffolding dan pengecatan struktur baja di ketinggian 12 meter.',
    'Electrical Work': 'Penggantian panel distribusi listrik MDP dan pengkabelan ulang di ruang kontrol.',
    'Excavation': 'Penggalian tanah untuk pemasangan pipa utilitas di area parkir barat.',
};
const permitCompanies = ['PT Petro Kimia', 'CV Bangun Jaya', 'PT Logistik Abadi', 'PT Mitra Teknik Utama'];
const supervisorNames = ['Andi Pratama', 'Budi Santoso', 'Rudi Hartono', 'Wahyu Nugroho'];
const workerLists = [
    ['Ahmad Fauzi', 'Bima Sakti', 'Candra Putra'],
    ['Dodi Kurniawan', 'Eko Wijaya', 'Fajar Hidayat', 'Gunawan'],
    ['Hendra Susilo', 'Irwan Maulana', 'Joko Purnomo'],
    ['Kukuh Setiawan', 'Luthfi Arif', 'Muhamad Rizki'],
];
const apdLists = [
    ['Helm Keselamatan', 'Sepatu Safety', 'Sarung Tangan Katun', 'Kacamata Las'],
    ['Full Body Harness', 'Helm Keselamatan', 'Sepatu Safety', 'Safety Lanyard'],
    ['SCBA Breathing Apparatus', 'Helm Keselamatan', 'Sarung Tangan Kimia', 'Coverall Anti-Static'],
    ['Sarung Tangan Isolasi Listrik', 'Kacamata Pelindung', 'Helm Keselamatan', 'Sepatu Safety'],
];

// Data PTW tetap - mencakup semua status lifecycle
const fixedPermits = [
    { daysAgo: 0, type: 'Hot Work', status: 'Pending', approvalStep: 1, company: 'PT Petro Kimia', supervisor: 'Andi Pratama', workers: 0, apd: 0, useKontraktor: false },
    { daysAgo: 1, type: 'Working at Height', status: 'Pending', approvalStep: 1, company: 'CV Bangun Jaya', supervisor: 'Budi Santoso', workers: 1, apd: 1, useKontraktor: true },
    { daysAgo: 2, type: 'Electrical Work', status: 'Approved', approvalStep: 3, company: 'PT Mitra Teknik Utama', supervisor: 'Rudi Hartono', workers: 2, apd: 3, useKontraktor: false },
    { daysAgo: 2, type: 'Cold Work', status: 'Approved', approvalStep: 3, company: 'PT Petro Kimia', supervisor: 'Wahyu Nugroho', workers: 3, apd: 0, useKontraktor: true },
    { daysAgo: 3, type: 'Confined Space', status: 'Active', approvalStep: 3, company: 'PT Logistik Abadi', supervisor: 'Andi Pratama', workers: 0, apd: 2, useKontraktor: false },
    { daysAgo: 4, type: 'Hot Work', status: 'Active', approvalStep: 3, company: 'CV Bangun Jaya', supervisor: 'Budi Santoso', workers: 1, apd: 0, useKontraktor: true },
    { daysAgo: 5, type: 'Excavation', status: 'Active', approvalStep: 3, company: 'PT Mitra Teknik Utama', supervisor: 'Rudi Hartono', workers: 2, apd: 1, useKontraktor: false },
    { daysAgo: 7, type: 'Electrical Work', status: 'Rejected', approvalStep: 2, company: 'PT Logistik Abadi', supervisor: 'Wahyu Nugroho', workers: 3, apd: 3, useKontraktor: true },
    { daysAgo: 8, type: 'Working at Height', status: 'Closed', approvalStep: 4, company: 'PT Petro Kimia', supervisor: 'Andi Pratama', workers: 0, apd: 1, useKontraktor: false },
    { daysAgo: 9, type: 'Hot Work', status: 'Closed', approvalStep: 4, company: 'CV Bangun Jaya', supervisor: 'Budi Santoso', workers: 1, apd: 0, useKontraktor: true },
    { daysAgo: 10, type: 'Confined Space', status: 'Closed', approvalStep: 4, company: 'PT Logistik Abadi', supervisor: 'Rudi Hartono', workers: 2, apd: 2, useKontraktor: false },
    { daysAgo: 12, type: 'Cold Work', status: 'Expired', approvalStep: 3, company: 'PT Petro Kimia', supervisor: 'Wahyu Nugroho', workers: 3, apd: 3, useKontraktor: true },
    { daysAgo: 14, type: 'Excavation', status: 'Closed', approvalStep: 4, company: 'CV Bangun Jaya', supervisor: 'Andi Pratama', workers: 0, apd: 0, useKontraktor: false },
    { daysAgo: 16, type: 'Hot Work', status: 'Closed', approvalStep: 4, company: 'PT Mitra Teknik Utama', supervisor: 'Budi Santoso', workers: 1, apd: 1, useKontraktor: true },
    { daysAgo: 18, type: 'Electrical Work', status: 'Closed', approvalStep: 4, company: 'PT Petro Kimia', supervisor: 'Rudi Hartono', workers: 2, apd: 3, useKontraktor: false },
    { daysAgo: 20, type: 'Working at Height', status: 'Expired', approvalStep: 3, company: 'PT Logistik Abadi', supervisor: 'Wahyu Nugroho', workers: 3, apd: 2, useKontraktor: true },
    { daysAgo: 22, type: 'Confined Space', status: 'Closed', approvalStep: 4, company: 'CV Bangun Jaya', supervisor: 'Andi Pratama', workers: 0, apd: 0, useKontraktor: false },
    { daysAgo: 25, type: 'Excavation', status: 'Closed', approvalStep: 4, company: 'PT Mitra Teknik Utama', supervisor: 'Budi Santoso', workers: 1, apd: 1, useKontraktor: true },
];

const seed = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synced for seeding...');

        // 1. Create Core Users
        const password = 'password123';
        const admin = await User.create({
            nama: 'Nuraga Admin',
            email: 'admin@nuraga.com',
            password,
            role: 'Admin',
            points: 500,
            nik: 'ADM-001',
            jabatan: 'System Administrator',
            area_kerja: 'Head Office',
            no_whatsapp: '+6281200000001',
        });
        const hse = await User.create({
            nama: 'HSE Officer',
            email: 'hse@nuraga.com',
            password,
            role: 'HSE',
            points: 800,
            nik: 'HSE-002',
            jabatan: 'Safety Officer',
            area_kerja: 'Main Factory',
            no_whatsapp: '+6281200000002',
        });
        const operator = await User.create({
            nama: 'Main Operator',
            email: 'operator@nuraga.com',
            password,
            role: 'Operator',
            points: 1200,
            nik: 'OPR-003',
            jabatan: 'Senior Operator Mesin',
            area_kerja: 'Lantai Produksi 1',
            no_whatsapp: '+6281200000003',
        });
        const supervisor = await User.create({
            nama: 'Supervisor Lapangan',
            email: 'supervisor@nuraga.com',
            password,
            role: 'Supervisor',
            points: 950,
            nik: 'SPV-004',
            jabatan: 'Field Supervisor',
            area_kerja: 'Mechanical Workshop',
            no_whatsapp: '+6281200000004',
        });
        const manager = await User.create({
            nama: 'Safety Manager',
            email: 'manager@nuraga.com',
            password,
            role: 'Manager',
            points: 1100,
            nik: 'MGR-005',
            jabatan: 'HSE Manager',
            area_kerja: 'Main Office',
            no_whatsapp: '+6281200000005',
        });
        const kontraktor = await User.create({
            nama: 'Kontraktor CV Bangun',
            email: 'kontraktor@cvbangun.com',
            password,
            role: 'Kontraktor',
            points: 400,
            nik: 'KTR-006',
            jabatan: 'Project Coordinator',
            area_kerja: 'Loading Dock C',
            no_whatsapp: '+6281200000006',
        });

        const today = new Date();

        // 2. Loop through the past 30 days to generate Hazards, Incidents, Audits
        for (let i = 30; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            currentDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

            // Generate Hazards (65% chance daily)
            if (Math.random() < 0.65) {
                const numHazards = Math.floor(Math.random() * 2) + 1;
                for (let h = 0; h < numHazards; h++) {
                    const loc = hazardLocations[Math.floor(Math.random() * hazardLocations.length)];
                    const desc = hazardDescriptions[Math.floor(Math.random() * hazardDescriptions.length)];
                    const risk = risks[Math.floor(Math.random() * risks.length)];
                    const status = i > 7 ? (Math.random() < 0.85 ? 'Closed' : 'Open') : (Math.random() < 0.4 ? 'Closed' : 'Open');

                    const hazard = await HazardReport.create({
                        id_user: operator.id_user,
                        lokasi: loc,
                        deskripsi: desc,
                        risiko: risk,
                        status: status,
                        is_verified: true,
                        createdAt: currentDate,
                        updatedAt: currentDate
                    });

                    if (risk === 'High' || risk === 'Critical') {
                        const capaStatus = status === 'Closed' ? 'Closed' : (Math.random() < 0.5 ? 'In Progress' : 'Open');

                        // Distribute assignments across HSE, Operator, and Supervisor
                        let assignedUserId = hse.id_user;
                        const rand = Math.random();
                        if (rand < 0.4) {
                            assignedUserId = operator.id_user;
                        } else if (rand < 0.6) {
                            assignedUserId = supervisor.id_user;
                        }

                        await CorrectiveAction.create({
                            id_hazard: hazard.id_hazard,
                            assigned_to: assignedUserId,
                            description: `Tindak lanjut bahaya: ${desc} di ${loc}`,
                            deadline: new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000)),
                            status: capaStatus,
                            createdAt: currentDate,
                            updatedAt: currentDate
                        });
                    }
                }
            }

            // Generate Incidents (12% chance daily)
            if (Math.random() < 0.12) {
                const cat = incidentCategories[Math.floor(Math.random() * incidentCategories.length)];
                const chron = incidentChronologies[Math.floor(Math.random() * incidentChronologies.length)];
                const vic = victims[Math.floor(Math.random() * victims.length)];
                await IncidentReport.create({
                    id_user: operator.id_user,
                    kategori: cat,
                    kronologi: chron,
                    korban: vic,
                    createdAt: currentDate,
                    updatedAt: currentDate
                });
            }

            // Generate Audits (35% chance daily)
            if (Math.random() < 0.35) {
                const tpl = templates[Math.floor(Math.random() * templates.length)];
                const score = checklistScore[Math.floor(Math.random() * checklistScore.length)];
                const items = {};
                CHECKLIST_TEMPLATES[tpl].forEach(item => {
                    items[item] = Math.random() < 0.85;
                });
                await Audit.create({
                    auditor_id: hse.id_user,
                    area: hazardLocations[Math.floor(Math.random() * hazardLocations.length)],
                    tanggal: currentDate,
                    hasil: `Inspeksi berkala ${tpl} telah diselesaikan. Beberapa catatan perbaikan telah dicantumkan di lampiran checklist.`,
                    qr_code_asset: `${tpl.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                    checklist_items: JSON.stringify({ template: tpl, items, score }),
                    createdAt: currentDate,
                    updatedAt: currentDate
                });
            }
        }

        // 3. Create Fixed PTW Dummy Data — semua status lifecycle terwakili
        for (const p of fixedPermits) {
            const permitDate = new Date(today);
            permitDate.setDate(today.getDate() - p.daysAgo);
            permitDate.setHours(7, 30, 0, 0);

            const endDate = new Date(permitDate.getTime() + 8 * 60 * 60 * 1000);
            const isApprovedOrHigher = ['Approved', 'Active', 'Closed', 'Expired'].includes(p.status);
            const isClosed = p.status === 'Closed';
            const isExpired = p.status === 'Expired';

            const userId = p.useKontraktor ? kontraktor.id_user : operator.id_user;

            await WorkPermit.create({
                id_user: userId,
                jenis_permit: p.type,
                perusahaan: p.company,
                lokasi: hazardLocations[Math.floor(Math.random() * hazardLocations.length)],
                waktu_mulai: permitDate,
                waktu_selesai: endDate,
                deskripsi_pekerjaan: permitJobDescriptions[p.type],
                supervisor_name: p.supervisor,
                daftar_pekerja: workerLists[p.workers],
                bahaya: ['Tergelincir/Terjatuh', 'Peralatan Jatuh', 'Paparan Bahan Kimia'],
                apd: apdLists[p.apd],
                sistem_isolasi: isApprovedOrHigher
                    ? 'LOTO (Lock Out Tag Out) sudah diterapkan pada semua titik isolasi energi.'
                    : null,
                gas_test: (p.type === 'Confined Space' || p.type === 'Hot Work')
                    ? { o2: '20.9%', h2s: '0 ppm', co: '0 ppm', lel: '0%' }
                    : null,
                applicant_sig: true,
                supervisor_sig: isApprovedOrHigher,
                supervisor_approved_at: isApprovedOrHigher ? permitDate : null,
                safety_officer_sig: isApprovedOrHigher,
                safety_officer_approved_at: isApprovedOrHigher ? permitDate : null,
                approver_sig: isApprovedOrHigher,
                manager_approved_at: isApprovedOrHigher ? permitDate : null,
                approval_step: p.approvalStep,
                status: p.status,
                close_applicant_sig: isClosed || isExpired,
                close_supervisor_sig: isClosed,
                housekeeping_verified: isClosed,
                closedAt: isClosed ? endDate : null,
                createdAt: permitDate,
                updatedAt: (isClosed || isExpired) ? endDate : permitDate,
            });
        }

        // 4. Create Certifications
        await Certification.create({
            id_user: operator.id_user,
            nama_personil: 'Main Operator',
            jenis_sertifikasi: 'General K3 Specialist',
            nomor_sertifikat: 'K3-2026-089A',
            tanggal_terbit: new Date('2026-01-10'),
            tanggal_expired: new Date('2029-01-10'),
            status: 'Active'
        });
        await Certification.create({
            id_user: operator.id_user,
            nama_personil: 'Main Operator',
            jenis_sertifikasi: 'Scaffolding Inspector',
            nomor_sertifikat: 'SCAF-2026-112B',
            tanggal_terbit: new Date('2026-03-05'),
            tanggal_expired: new Date('2028-03-05'),
            status: 'Active'
        });
        await Certification.create({
            id_user: kontraktor.id_user,
            nama_personil: 'Kontraktor CV Bangun',
            jenis_sertifikasi: 'Confined Space Entry',
            nomor_sertifikat: 'CSE-2025-034C',
            tanggal_terbit: new Date('2025-06-01'),
            tanggal_expired: new Date('2026-06-10'),
            status: 'Active'
        });
        await Certification.create({
            id_user: hse.id_user,
            nama_personil: 'HSE Officer',
            jenis_sertifikasi: 'Ahli K3 Umum',
            nomor_sertifikat: 'K3U-2023-055H',
            tanggal_terbit: new Date('2023-05-15'),
            tanggal_expired: new Date('2026-05-15'),
            status: 'Expired'
        });
        await Certification.create({
            id_user: hse.id_user,
            nama_personil: 'HSE Officer',
            jenis_sertifikasi: 'Fire Safety Specialist',
            nomor_sertifikat: 'FIRE-2026-902A',
            tanggal_terbit: new Date('2026-02-12'),
            tanggal_expired: new Date('2029-02-12'),
            status: 'Active'
        });
        await Certification.create({
            id_user: supervisor.id_user,
            nama_personil: 'Supervisor Lapangan',
            jenis_sertifikasi: 'Working at Height Supervisor',
            nomor_sertifikat: 'WAH-SPV-2025-001',
            tanggal_terbit: new Date('2025-05-01'),
            tanggal_expired: new Date('2028-05-01'),
            status: 'Active'
        });
        await Certification.create({
            id_user: supervisor.id_user,
            nama_personil: 'Supervisor Lapangan',
            jenis_sertifikasi: 'First Aid (P3K) Specialist',
            nomor_sertifikat: 'P3K-2026-788B',
            tanggal_terbit: new Date('2026-04-15'),
            tanggal_expired: new Date('2029-04-15'),
            status: 'Active'
        });
        await Certification.create({
            id_user: manager.id_user,
            nama_personil: 'Safety Manager',
            jenis_sertifikasi: 'ISO 45001 Lead Auditor',
            nomor_sertifikat: 'ISO-LA-2024-556',
            tanggal_terbit: new Date('2024-11-20'),
            tanggal_expired: new Date('2027-11-20'),
            status: 'Active'
        });

        // 5. Create Emergency Call sample
        await EmergencyCall.create({
            jenis_kejadian: 'Kebocoran Gas Kimia',
            lokasi: 'Chemical Storage Room',
            status: 'Triggered'
        });

        console.log('');
        console.log('Seeding completed successfully!');
        console.log('');
        console.log('--- Akun Login yang Tersedia ---');
        console.log('Admin      : admin@nuraga.com       / password123');
        console.log('HSE        : hse@nuraga.com         / password123');
        console.log('Supervisor : supervisor@nuraga.com  / password123');
        console.log('Manager    : manager@nuraga.com     / password123');
        console.log('Operator   : operator@nuraga.com    / password123');
        console.log('Kontraktor : kontraktor@cvbangun.com / password123');
        console.log('');
        console.log('--- Ringkasan Data PTW ---');
        console.log('Pending  : 2 permit (Hot Work, Working at Height)');
        console.log('Approved : 2 permit (Electrical Work, Cold Work)');
        console.log('Active   : 3 permit (Confined Space, Hot Work, Excavation)');
        console.log('Closed   : 8 permit');
        console.log('Rejected : 1 permit');
        console.log('Expired  : 2 permit');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seed();
