const { fakerID_ID: faker } = require('@faker-js/faker');
const sequelize = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const IncidentReport = require('../models/IncidentReport');
const HazardReport = require('../models/HazardReport');
const CorrectiveAction = require('../models/CorrectiveAction');
const LeaveRequest = require('../models/LeaveRequest');
const Certification = require('../models/Certification');
const EmergencyCall = require('../models/EmergencyCall');
const WorkPermit = require('../models/WorkPermit');
const Audit = require('../models/Audit');
const Voucher = require('../models/Voucher');
const bcrypt = require('bcryptjs');

const K3_CERTIFICATE_LIST = [
    "Ahli K3 Umum (AK3U)", "Ahli K3 Spesialis Listrik", "Ahli K3 Spesialis Penanggulangan Kebakaran",
    "Ahli K3 Pesawat Angkat dan Angkut (PAA)", "Ahli K3 Pesawat Uap dan Bejana Tekan (PUBT)",
    "Ahli K3 Kimia", "Ahli K3 Lingkungan Kerja", "Ahli K3 Spesialis Konstruksi Muda",
    "Ahli K3 Spesialis Konstruksi Madya", "Ahli K3 Spesialis Konstruksi Utama",
    "Petugas Peran Kebakaran (Tingkat D)", "Regu Penanggulangan Kebakaran (Tingkat C)",
    "Koordinator Unit Penanggulangan Kebakaran (Tingkat B)", "Ahli K3 Spesialis Penanggulangan Kebakaran (Tingkat A)",
    "Tenaga Kerja Bangunan Tinggi (TKBT) Tingkat 1", "Tenaga Kerja Bangunan Tinggi (TKBT) Tingkat 2",
    "Tenaga Kerja Pada Ketinggian (TKPK) Tingkat 1", "Tenaga Kerja Pada Ketinggian (TKPK) Tingkat 2",
    "Tenaga Kerja Pada Ketinggian (TKPK) Tingkat 3", "Petugas Gas Tester", "Teknisi Ruang Terbatas",
    "Rescuer Ruang Terbatas", "Operator Forklift Kelas I", "Operator Forklift Kelas II",
    "Operator Mobile Crane Kelas I", "Operator Mobile Crane Kelas II", "Operator Mobile Crane Kelas III",
    "Operator Overhead Crane Kelas I", "Operator Overhead Crane Kelas II", "Operator Overhead Crane Kelas III",
    "Operator Tower Crane Kelas I", "Operator Tower Crane Kelas II", "Operator Tower Crane Kelas III",
    "Operator Loader / Excavator / Bulldozer", "Rigger (Juru Ikat Beban)", "Teknisi Pesawat Angkat dan Angkut",
    "Operator Genset", "Operator Mesin Produksi dan Perkakas", "Operator Tanur (Furnace)", "Teknisi PTP",
    "Operator Ketel Uap (Boiler) Kelas I", "Operator Ketel Uap (Boiler) Kelas II", "Teknisi Pesawat Uap dan Bejana Tekan",
    "Juru Las (Welder) Kelas I", "Juru Las (Welder) Kelas II", "Juru Las (Welder) Kelas III",
    "Teknisi K3 Listrik", "Teknisi Perancah (Scaffolder)", "Supervisi Perancah (Inspector Scaffolding)",
    "Petugas K3 Konstruksi", "Petugas P3K (First Aider)", "Petugas K3 Kimia", "Paramedis K3",
    "Dokter Pemeriksa Kesehatan Tenaga Kerja (Dokter Hiperkes)", "Auditor Internal SMK3", "Auditor Eksternal SMK3"
];

// Helper to generate clustered dates heavily focused on the last 30 days
function getClusteredDate(today, sixMonthsAgo) {
    // 4 clusters in the last 30 days to create many spikes on the graph!
    const cluster1 = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const cluster2 = new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000); // 12 days ago
    const cluster3 = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
    const cluster4 = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000); // 28 days ago
    
    const r = Math.random();
    let baseDate;
    if (r < 0.2) baseDate = cluster1;
    else if (r < 0.4) baseDate = cluster2;
    else if (r < 0.6) baseDate = cluster3;
    else if (r < 0.8) baseDate = cluster4;
    else {
        // Uniform random over the last 30 days for the remaining 20%
        return new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    }
    
    // Spread around baseDate by +/- 3 days
    const variance = (Math.random() - 0.5) * 6 * 24 * 60 * 60 * 1000;
    return new Date(baseDate.getTime() + variance);
}

async function runSeed() {
    try {
        console.log('🌱 Starting Comprehensive Database Seeding...');

        // 1. CLEAR TRANSACTION DATA
        console.log('🧹 Clearing transaction tables...');
        await Attendance.destroy({ truncate: true, cascade: true });
        await CorrectiveAction.destroy({ truncate: true, cascade: true });
        await IncidentReport.destroy({ truncate: true, cascade: true });
        await HazardReport.destroy({ truncate: true, cascade: true });
        await LeaveRequest.destroy({ truncate: true, cascade: true });
        await Certification.destroy({ truncate: true, cascade: true });
        await EmergencyCall.destroy({ truncate: true, cascade: true });
        await WorkPermit.destroy({ truncate: true, cascade: true });
        await Audit.destroy({ truncate: true, cascade: true });
        await Voucher.destroy({ truncate: true, cascade: true });
        
        // Remove dummy users if any were generated previously
        await User.destroy({ where: { email: { [sequelize.Sequelize.Op.like]: '%@faker.local' } } });
        console.log('✅ Cleaned transaction data.');

        // 2. GENERATE 500 USERS
        console.log('👥 Generating 500 Users (80% Staff, 15% HSE/Supervisor, 5% Manager)...');
        
        const passwordHash = await bcrypt.hash('123456', 10);
        const newUsers = [];
        const roles = [];
        
        for (let i = 0; i < 400; i++) roles.push('Staff');
        for (let i = 0; i < 75; i++) roles.push(Math.random() > 0.5 ? 'Supervisor' : 'HSE');
        for (let i = 0; i < 25; i++) roles.push('Manager');
        
        // Shuffle roles
        roles.sort(() => Math.random() - 0.5);

        for (let i = 0; i < 500; i++) {
            const gender = Math.random() > 0.5 ? 'Laki-laki' : 'Perempuan';
            const firstName = faker.person.firstName(gender === 'Laki-laki' ? 'male' : 'female');
            const lastName = faker.person.lastName(gender === 'Laki-laki' ? 'male' : 'female');
            const fullName = `${firstName} ${lastName}`;
            const email = `dummy${i+1}@faker.local`;
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

            newUsers.push({
                nama: fullName,
                email: email,
                password: passwordHash,
                role: roles[i],
                foto: avatarUrl,
                no_whatsapp: null, // Dihapus demi mencegah blokir bot WA
                nik: `EMP${Math.floor(100000 + Math.random() * 900000)}`,
                jabatan: roles[i],
                area_kerja: faker.helpers.arrayElement(['Tambang A', 'Pabrik B', 'Konstruksi C', 'Kantor Pusat']),
                jenis_kelamin: gender,
                points: faker.helpers.arrayElement([0, 100, 250, 500, 1200]),
            });
        }

        // Bulk insert users
        await User.bulkCreate(newUsers);
        console.log('✅ 500 Users generated.');

        // Get ALL users (including original ones)
        const allUsers = await User.findAll();
        
        // 3. GENERATE ATTENDANCE (Last 6 Months)
        console.log('📅 Generating Attendances for the last 6 months...');
        const attendances = [];
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        // Approx 60 records per user
        for (const user of allUsers) {
            for (let i = 0; i < 60; i++) {
                const recordDate = new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()));
                // Skip weekends roughly
                if (recordDate.getDay() === 0 || recordDate.getDay() === 6) continue;
                
                const sleepHours = Math.floor(Math.random() * 5) + 4; // 4 to 8 hours
                const stressLevel = Math.floor(Math.random() * 10) + 1; // 1 to 10
                
                let status = 'Aman';
                if (sleepHours < 6 || stressLevel > 7) status = 'Waspada';
                if (sleepHours < 4 && stressLevel > 8) status = 'Bahaya';

                // Clock IN
                attendances.push({
                    id_user: user.id_user,
                    type: 'Datang',
                    foto_bukti: null,
                    lokasi: '-6.200000, 106.816666',
                    sleep_hours: sleepHours,
                    stress_level: stressLevel,
                    fatigue_status: status,
                    createdAt: recordDate,
                    updatedAt: recordDate
                });
                
                // Clock OUT
                const outDate = new Date(recordDate.getTime() + 9 * 60 * 60 * 1000);
                attendances.push({
                    id_user: user.id_user,
                    type: 'Pulang',
                    foto_bukti: null,
                    lokasi: '-6.200000, 106.816666',
                    sleep_hours: null,
                    stress_level: null,
                    fatigue_status: null,
                    createdAt: outDate,
                    updatedAt: outDate
                });
            }
        }
        
        const chunkSize = 5000;
        for (let i = 0; i < attendances.length; i += chunkSize) {
            await Attendance.bulkCreate(attendances.slice(i, i + chunkSize));
        }
        console.log(`✅ ${attendances.length} Attendances generated.`);

        // 4. GENERATE OTHER DATA
        console.log('⚠️ Generating Hazards, Incidents, Permits, and more...');
        const incidents = [];
        const hazards = [];
        const leaveRequests = [];
        const certs = [];
        const emergencyCalls = [];
        const vouchers = [];
        const workPermits = [];
        const audits = [];
        
        for (const user of allUsers) {
            // Certifications (Only ~20% of users get certified)
            if (Math.random() <= 0.20) {
                const certCount = Math.floor(Math.random() * 2) + 1;
                for (let c = 0; c < certCount; c++) {
                    certs.push({
                        id_user: user.id_user,
                        nama_personil: user.nama,
                        jenis_sertifikasi: faker.helpers.arrayElement(K3_CERTIFICATE_LIST),
                        nomor_sertifikat: `CERT-${Math.floor(Math.random() * 100000)}`,
                        tanggal_terbit: sixMonthsAgo,
                        tanggal_expired: new Date(today.getTime() + (Math.random() * 365 + 10) * 24 * 60 * 60 * 1000), // Random expiry in the future
                        status: 'Active'
                    });
                }
            }

            // Vouchers
            if (user.points > 100 && Math.random() > 0.5) {
                vouchers.push({
                    id_user: user.id_user,
                    reward_id: Math.floor(Math.random() * 5) + 1,
                    reward_title: faker.helpers.arrayElement(['Voucher Makan Rp50.000', 'Merchandise Jaket K3', 'Voucher Minimarket']),
                    points_spent: faker.helpers.arrayElement([100, 250]),
                    code: `REW-${Math.floor(Math.random() * 1000000)}`,
                    status: 'Claimed',
                    claimedAt: new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()))
                });
            }
            
            // Leave Requests
            if (Math.random() > 0.8) {
                const reportDate = new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()));
                leaveRequests.push({
                    id_user: user.id_user,
                    type: faker.helpers.arrayElement(['Izin', 'Cuti', 'Sakit']),
                    start_date: reportDate,
                    end_date: new Date(reportDate.getTime() + 2 * 24 * 60 * 60 * 1000),
                    reason: faker.helpers.arrayElement(['Acara Keluarga', 'Istirahat', 'Keperluan Mendadak', 'Menjenguk Orang Tua Sakit', 'Pernikahan Saudara']),
                    status: faker.helpers.arrayElement(['Approved', 'Pending', 'Rejected']),
                    createdAt: reportDate,
                    updatedAt: reportDate
                });
            }

            // Work Permits (WITH FULL RICH DATA: Pekerja, Bahaya, APD)
            if (user.role === 'Supervisor' || user.role === 'Staff') {
                if (Math.random() > 0.8) {
                    const reportDate = new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()));
                    
                    // Assign 2 to 5 random workers
                    const randomWorkers = [];
                    for(let w = 0; w < (Math.floor(Math.random() * 4) + 2); w++) {
                        randomWorkers.push(faker.helpers.arrayElement(allUsers).nama);
                    }
                    
                    workPermits.push({
                        id_user: user.id_user,
                        jenis_permit: faker.helpers.arrayElement(['Hot Work', 'Cold Work', 'Confined Space', 'Working at Height', 'Electrical Work', 'Excavation']),
                        perusahaan: 'PT Nuraga Internal',
                        lokasi: user.area_kerja || 'Site',
                        waktu_mulai: reportDate,
                        waktu_selesai: new Date(reportDate.getTime() + 8 * 60 * 60 * 1000),
                        deskripsi_pekerjaan: faker.lorem.sentence(),
                        supervisor_name: 'Supervisor',
                        status: faker.helpers.arrayElement(['Approved', 'Active', 'Closed']),
                        
                        // RICH DATA INJECTIONS
                        daftar_pekerja: randomWorkers,
                        bahaya: faker.helpers.arrayElements(['Ledakan', 'Gas Beracun', 'Ketinggian Ekstrim', 'Listrik Tegangan Tinggi', 'Kebakaran', 'Tertimpa Material', 'Alat Berat', 'Bising'], 3),
                        apd: faker.helpers.arrayElements(['Helm Safety', 'Sepatu Safety', 'Kacamata Safety', 'Sarung Tangan Kulit', 'Masker Gas', 'Full Body Harness', 'Earplug', 'Face Shield'], 4),
                        sistem_isolasi: 'LOTO (Lock Out Tag Out) telah dipasang di panel listrik utama sebelum aktivitas dimulai.',
                        gas_test: { o2: '20.9', h2s: '0', co: '0', lel: '0' },
                        kondisi_cuaca: faker.helpers.arrayElement(['Cerah', 'Berawan', 'Gerimis']),
                        
                        applicant_sig: true,
                        supervisor_sig: true,
                        safety_officer_sig: true,
                        approver_sig: true,
                        close_applicant_sig: true,
                        close_supervisor_sig: true,
                        createdAt: reportDate,
                        updatedAt: reportDate
                    });
                }
            }

            // Audits
            if (user.role === 'HSE') {
                for(let i=0; i<3; i++) {
                    const reportDate = new Date(sixMonthsAgo.getTime() + Math.random() * (today.getTime() - sixMonthsAgo.getTime()));
                    audits.push({
                        auditor_id: user.id_user,
                        area: faker.helpers.arrayElement(['Tambang A', 'Pabrik B', 'Konstruksi C', 'Kantor Pusat']),
                        tanggal: reportDate,
                        hasil: faker.helpers.arrayElement(['Aman', 'Ada Temuan Minor', 'Perlu Perbaikan Segera']),
                        checklist_items: JSON.stringify([
                            { item: 'APAR tersedia dan valid', checked: Math.random() > 0.1 }, 
                            { item: 'Jalur evakuasi bebas hambatan', checked: Math.random() > 0.2 },
                            { item: 'Pekerja menggunakan APD lengkap', checked: Math.random() > 0.15 },
                            { item: 'Tidak ada kabel terkelupas', checked: Math.random() > 0.3 }
                        ]),
                        createdAt: reportDate,
                        updatedAt: reportDate
                    });
                }
            }
        }

        // Generate exactly 80 Hazards and 80 Incidents overall with clustered dates in the last 30 days for nice graph spikes!
        for (let i = 0; i < 80; i++) {
            const randomUser = faker.helpers.arrayElement(allUsers);
            const reportDateHazard = getClusteredDate(today, sixMonthsAgo);
            const reportDateIncident = getClusteredDate(today, sixMonthsAgo);
            
            // Hazard
            hazards.push({
                id_user: randomUser.id_user,
                lokasi: randomUser.area_kerja || 'Site',
                deskripsi: faker.helpers.arrayElement([
                    'Genangan oli di area walkway', 'Kabel mesin terkelupas', 'Pagar pembatas tangga rusak', 
                    'Penerangan sangat redup di lorong B', 'Forklift diparkir sembarangan menghalangi akses', 
                    'Debu tebal di area ventilasi', 'Ada percikan api dekat area bahan kimia',
                    'Rak penyimpanan miring hampir roboh', 'Tumpahan bahan kimia di lab', 'Pegangan tangga licin'
                ]),
                risiko: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']),
                is_verified: Math.random() > 0.3, // 70% verified
                koordinat_gps: '-6.200000, 106.816666',
                status: faker.helpers.arrayElement(['Open', 'In Progress', 'Resolved', 'Closed']),
                createdAt: reportDateHazard,
                updatedAt: reportDateHazard
            });

            // Incident
            incidents.push({
                id_user: randomUser.id_user,
                kategori: faker.helpers.arrayElement(['Terjatuh/Terpeleset', 'Luka Bakar', 'Tersetrum', 'Tertimpa Barang', 'Tabrakan Unit', 'Terjepit Mesin']),
                five_whys: { 
                    why1: 'Pekerja kurang konsentrasi.', 
                    why2: 'Karena shift malam terlalu panjang dan lelah.', 
                    why3: 'Kekurangan personel di shift malam.', 
                    why4: 'Proses rekrutmen tertunda bulan lalu.', 
                    why5: 'Anggaran HR belum disetujui manajemen.' 
                },
                loss_cost: faker.number.float({ min: 50, max: 25000 }),
                koordinat_gps: '-6.200000, 106.816666',
                kronologi: faker.lorem.paragraph(),
                korban: faker.helpers.arrayElement([randomUser.nama, faker.person.fullName()]),
                createdAt: reportDateIncident,
                updatedAt: reportDateIncident
            });
        }

        // Emergency Calls (approx 20)
        for(let i=0; i<20; i++) {
            const reportDate = getClusteredDate(today, sixMonthsAgo);
            emergencyCalls.push({
                jenis_kejadian: faker.helpers.arrayElement(['Kebakaran', 'Kecelakaan Medis', 'Evakuasi Darurat', 'Tumpahan Kimia B3', 'Bencana Alam']),
                lokasi: faker.helpers.arrayElement(['Tambang A', 'Pabrik B', 'Konstruksi C', 'Kantor Pusat']),
                waktu_kejadian: reportDate,
                status: 'Closed',
                handled_by: faker.helpers.arrayElement(allUsers).id_user,
                createdAt: reportDate,
                updatedAt: reportDate
            });
        }

        await Certification.bulkCreate(certs);
        await IncidentReport.bulkCreate(incidents);
        const createdHazards = await HazardReport.bulkCreate(hazards, { returning: true });
        await LeaveRequest.bulkCreate(leaveRequests);
        await WorkPermit.bulkCreate(workPermits);
        await Audit.bulkCreate(audits);
        await EmergencyCall.bulkCreate(emergencyCalls);
        await Voucher.bulkCreate(vouchers);
        
        // 5. GENERATE CORRECTIVE ACTIONS (CAPA) linked to Hazards
        console.log('🔧 Generating CAPA...');
        const capas = [];
        const hseUsers = allUsers.filter(u => u.role === 'HSE' || u.role === 'Supervisor');
        
        for (let i = 0; i < 40; i++) { 
            const hazard = createdHazards[i];
            const assignee = faker.helpers.arrayElement(hseUsers);
            if (assignee && hazard) {
                capas.push({
                    id_hazard: hazard.id_hazard,
                    id_incident: null,
                    description: `Tindakan perbaikan dan pencegahan wajib untuk temuan bahaya: ${hazard.deskripsi}. Pastikan mengikuti standar operasional prosedur K3LH perusahaan.`,
                    assigned_to: assignee.id_user,
                    deadline: new Date(hazard.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
                    status: faker.helpers.arrayElement(['Open', 'In Progress', 'Closed', 'Closed'])
                });
            }
        }
        await CorrectiveAction.bulkCreate(capas);

        console.log(`✅ ${certs.length} Certs, ${incidents.length} Incidents, ${hazards.length} Hazards, ${leaveRequests.length} Leaves generated.`);
        console.log(`✅ ${workPermits.length} Permits, ${audits.length} Audits, ${emergencyCalls.length} Emergencies, ${vouchers.length} Vouchers, ${capas.length} CAPAs generated.`);
        console.log('🎉 Seeding Complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

runSeed();
