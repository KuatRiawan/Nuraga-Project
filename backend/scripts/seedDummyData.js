const sequelize = require('../config/db');

// Import all models
const Attendance = require('../models/Attendance');
const Audit = require('../models/Audit');
const AuditLog = require('../models/AuditLog');
const Certification = require('../models/Certification');
const CorrectiveAction = require('../models/CorrectiveAction');
const EmergencyCall = require('../models/EmergencyCall');
const FatigueLog = require('../models/FatigueLog');
const HazardReport = require('../models/HazardReport');
const IncidentReport = require('../models/IncidentReport');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const WorkPermit = require('../models/WorkPermit');

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (daysBack) => {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysBack));
    return date;
};
const randomDateRange = (minDaysBack, maxDaysBack) => {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(minDaysBack, maxDaysBack));
    return date;
};

// Indonesian K3 Certifications
const certifications = [
    "Ahli K3 Umum (Kemnaker)",
    "Petugas P3K di Tempat Kerja",
    "Teknisi K3 Listrik",
    "Petugas K3 Ruang Terbatas (Confined Space)",
    "TKBT / Bekerja di Ketinggian",
    "Petugas Peran Kebakaran (Kelas D)",
    "Auditor SMK3",
    "Ahli K3 Konstruksi"
];

const issuers = ["Kemnaker RI", "BNSP"];

// Hazard descriptions
const hazardDescriptions = [
    "Kabel terkelupas di area genset",
    "Tumpahan oli di jalur forklift",
    "APAR expired di gudang B",
    "Pagar pengaman area bawah tanah rusak",
    "Ventilasi ruang server tidak berfungsi",
    "Lantai licin di area produksi karena rembesan minyak",
    "Lampu darurat tidak menyala saat tes",
    "Peralatan lifting tidak memiliki sertifikat kalibrasi",
    "Area bahan kimia tanpa tanda peringatan bahaya",
    "Pintu darurat terblokir oleh tumpukan barang",
    "Sistem deteksi asap tidak berfungsi di lantai 2",
    "Karyawan tidak menggunakan APD saat bekerja di ketinggian",
    "Box junction tidak tersedia di persimpangan forklift",
    "Tangga darurat tidak memiliki pegangan tangan",
    "Kabel listrik menjuntai tanpa proteksi",
    "Area kerja panas tanpa ventilasi memadai",
    "Peralatan listrik tidak grounding",
    "Sistem pemadam kebakaran hydrant kering",
    "Jalur evakuasi tertutup oleh material",
    "Lubang lantai tanpa penutup dan tanda peringatan"
];

const hazardLocations = [
    "Area Produksi A",
    "Gudang B",
    "Area Genset",
    "Ruang Server",
    "Area Bawah Tanah",
    "Lantai 2",
    "Area Parkir",
    "Workshop",
    "Area Bahan Kimia",
    "Kantin"
];

const riskLevels = ["Low", "Medium", "High", "Critical"];

// Incident descriptions
const incidentDescriptions = [
    "Karyawan terkilir saat mengangkat beban berat",
    "Tumpahan bahan kimia menyebabkan iritasi kulit",
    "Kecelakaan forklift menabrak rak barang",
    "Terkena percikan api saat pengelasan",
    "Pingsan akibat kelelahan di area kerja panas"
];

// Work permit types
const workPermitTypes = [
    "Hot Work Permit",
    "Confined Space Entry Permit",
    "Working at Height Permit",
    "Electrical Work Permit",
    "Excavation Permit"
];

const seedDummyData = async () => {
    try {
        console.log('🌱 Starting dummy data seeding...\n');

        // Step 1: Connect to database
        await sequelize.authenticate();
        console.log('✅ Step 1: Database connected successfully\n');

        // Step 2: Fetch existing users
        console.log('👥 Step 2: Fetching existing users...');
        const users = await User.findAll({ limit: 6 });
        if (users.length === 0) {
            console.error('❌ No users found in database. Please create users first.');
            await sequelize.close();
            process.exit(1);
        }
        console.log(`   ✅ Found ${users.length} users\n`);

        // Step 3: Seed Certifications (3-5 per user)
        console.log('📜 Step 3: Seeding Certifications...');
        let certCount = 0;
        for (const user of users) {
            const numCerts = randomInt(3, 5);
            for (let i = 0; i < numCerts; i++) {
                const issueDate = randomDateRange(365, 730); // 1-2 years back
                const expiryDate = new Date(issueDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + randomInt(2, 5));
                
                // Make 1-2 certifications expired per user
                if (randomInt(1, 10) <= 2) {
                    expiryDate.setFullYear(expiryDate.getFullYear() - randomInt(1, 2));
                }

                await Certification.create({
                    id_user: user.id_user,
                    nama_sertifikat: randomChoice(certifications),
                    penerbit: randomChoice(issuers),
                    tanggal_terbit: issueDate,
                    tanggal_kadaluarsa: expiryDate,
                    nomor_sertifikat: `CERT-${randomInt(100000, 999999)}`
                });
                certCount++;
            }
        }
        console.log(`   ✅ Created ${certCount} certifications\n`);

        // Step 4: Seed Hazard Reports (15-20)
        console.log('⚠️  Step 4: Seeding Hazard Reports...');
        const hazardStatuses = ["Open", "In Progress", "Resolved", "Closed"];
        const hazardCount = randomInt(15, 20);
        for (let i = 0; i < hazardCount; i++) {
            const user = randomChoice(users);
            await HazardReport.create({
                id_user: user.id_user,
                lokasi: randomChoice(hazardLocations),
                deskripsi: randomChoice(hazardDescriptions),
                risiko: randomChoice(riskLevels),
                original_risiko: randomChoice(riskLevels),
                is_overridden: Math.random() > 0.8,
                is_verified: Math.random() > 0.5,
                status: randomChoice(hazardStatuses),
                foto: null,
                koordinat_gps: `${randomInt(-6, -5)}.${randomInt(100000, 999999)},${randomInt(106, 107)}.${randomInt(100000, 999999)}`,
                createdAt: randomDate(30)
            });
        }
        console.log(`   ✅ Created ${hazardCount} hazard reports\n`);

        // Step 5: Seed Incident Reports (3-5)
        console.log('🚨 Step 5: Seeding Incident Reports...');
        const incidentCount = randomInt(3, 5);
        for (let i = 0; i < incidentCount; i++) {
            const user = randomChoice(users);
            const fiveWhys = {
                why1: "Mengapa insiden terjadi?",
                why2: "Mengapa kondisi tersebut ada?",
                why3: "Menganya prosedur tidak diikuti?",
                why4: "Menganya pelatihan tidak memadai?",
                why5: "Menganya sistem manajemen tidak efektif?"
            };
            
            await IncidentReport.create({
                id_user: user.id_user,
                kategori: randomChoice(["Minor", "Major", "Near Miss"]),
                kronologi: randomChoice(incidentDescriptions),
                korban: user.nama,
                loss_cost: randomInt(0, 5000000),
                five_whys: JSON.stringify(fiveWhys),
                status: randomChoice(["Open", "In Progress", "Closed"]),
                createdAt: randomDate(30)
            });
        }
        console.log(`   ✅ Created ${incidentCount} incident reports\n`);

        // Step 6: Seed Work Permits (5-8)
        console.log('📋 Step 6: Seeding Work Permits...');
        const permitStatuses = ["Pending", "Approved", "Rejected", "Completed"];
        const permitCount = randomInt(5, 8);
        for (let i = 0; i < permitCount; i++) {
            const user = randomChoice(users);
            const approvalStep = randomInt(0, 3);
            
            await WorkPermit.create({
                id_user: user.id_user,
                jenis_permit: randomChoice(workPermitTypes),
                lokasi: randomChoice(hazardLocations),
                deskripsi_pekerjaan: `Pekerjaan ${randomChoice(workPermitTypes).toLowerCase()} untuk maintenance rutin`,
                tanggal_mulai: randomDate(7),
                tanggal_selesai: new Date(randomDate(7).getTime() + 8 * 60 * 60 * 1000),
                status: randomChoice(permitStatuses),
                approval_step: approvalStep,
                approved_by: approvalStep > 0 ? randomChoice(users).id_user : null,
                approved_at: approvalStep > 0 ? randomDate(7) : null
            });
        }
        console.log(`   ✅ Created ${permitCount} work permits\n`);

        // Step 7: Seed Attendance (7-14 days per user)
        console.log('⏰ Step 7: Seeding Attendance data...');
        let attendanceCount = 0;
        for (const user of users) {
            const days = randomInt(7, 14);
            for (let i = 0; i < days; i++) {
                const date = randomDate(14);
                const clockIn = new Date(date);
                clockIn.setHours(randomInt(7, 9), randomInt(0, 59));
                
                const clockOut = new Date(clockIn);
                clockOut.setHours(clockIn.getHours() + randomInt(8, 10));
                
                const sleepHours = randomInt(4, 9);
                const stressLevel = randomInt(1, 10);
                
                await Attendance.create({
                    id_user: user.id_user,
                    tanggal: date,
                    jam_masuk: clockIn,
                    jam_keluar: clockOut,
                    foto_bukti: null,
                    sleep_hours: sleepHours,
                    stress_level: stressLevel,
                    fatigue_status: sleepHours < 6 || stressLevel > 7 ? 'Tinggi' : 'Normal'
                });
                attendanceCount++;
            }
        }
        console.log(`   ✅ Created ${attendanceCount} attendance records\n`);

        // Step 8: Seed Voucher History and update User Points
        console.log('🎁 Step 8: Seeding Voucher history and updating user points...');
        const voucherCount = randomInt(5, 10);
        for (let i = 0; i < voucherCount; i++) {
            const user = randomChoice(users);
            const pointsSpent = randomInt(200, 1000);
            
            await Voucher.create({
                id_user: user.id_user,
                reward_id: randomInt(1, 4),
                reward_title: randomChoice(["Voucer Makan Siang", "Voucer Belanja Rp50K", "Hari Libur Tambahan", "Merchandise K3 Premium"]),
                points_spent: pointsSpent,
                code: `VCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                status: randomChoice(["Pending", "Claimed"]),
                claimedAt: Math.random() > 0.5 ? randomDate(30) : null
            });
        }
        console.log(`   ✅ Created ${voucherCount} vouchers\n`);

        // Step 9: Update user points
        console.log('🎯 Step 9: Updating user points...');
        for (const user of users) {
            const userVouchers = await Voucher.findAll({ where: { id_user: user.id_user } });
            const totalPointsSpent = userVouchers.reduce((sum, v) => sum + v.points_spent, 0);
            
            // Give some users points from hazard reports
            const userHazards = await HazardReport.findAll({ where: { id_user: user.id_user, is_verified: true } });
            const earnedPoints = userHazards.length * randomInt(50, 100);
            
            const finalPoints = Math.max(0, earnedPoints - totalPointsSpent + randomInt(0, 500));
            await user.update({ points: finalPoints });
        }
        console.log(`   ✅ Updated points for ${users.length} users\n`);

        console.log('✨ Dummy data seeding completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Certifications: ${certCount}`);
        console.log(`   - Hazard Reports: ${hazardCount}`);
        console.log(`   - Incident Reports: ${incidentCount}`);
        console.log(`   - Work Permits: ${permitCount}`);
        console.log(`   - Attendance Records: ${attendanceCount}`);
        console.log(`   - Vouchers: ${voucherCount}`);
        console.log(`   - Users Updated: ${users.length}\n`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during data seeding:', error);
        await sequelize.close();
        process.exit(1);
    }
};

seedDummyData();
