// JANGAN LUPA RUN: npm install @faker-js/faker

const { faker } = require('@faker-js/faker');
const sequelize = require('../config/db');
const User = require('../models/User');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const WorkPermit = require('../models/WorkPermit');
const HazardReport = require('../models/HazardReport');
const IncidentReport = require('../models/IncidentReport');
const Voucher = require('../models/Voucher');
const EmergencyCall = require('../models/EmergencyCall');
const Audit = require('../models/Audit');
const CorrectiveAction = require('../models/CorrectiveAction');

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomPastDate = (days) => new Date(Date.now() - Math.floor(Math.random() * days) * 24 * 60 * 60 * 1000);

// Dummy data arrays
const certifications = ['Ahli K3 Umum', 'P3K', 'Fire Safety', 'Working at Height', 'Confined Space', 'Electrical Safety', 'Crane Operator', 'Forklift Operator'];
const permitTypes = ['Hot Work', 'Cold Work', 'Confined Space', 'Working at Height', 'Electrical Work'];
const locations = ['Workshop A', 'Warehouse B', 'Loading Dock', 'Production Line 1', 'Office Building', 'Parking Area', 'Factory Floor', 'Storage Area', 'Maintenance Bay', 'Quality Control'];
const hazards = ['Slippery floor', 'Exposed electrical wiring', 'Missing guardrail', 'Chemical spill', 'Poor lighting', 'Noise hazard', 'Dust accumulation', 'Falling objects', 'Blocked emergency exit', 'Improper storage', 'Leaking pipes', 'Overloaded shelves'];
const apdItems = ['Helm Safety', 'Sepatu Safety', 'Sarung Tangan', 'Kacamata Safety', 'Ear Plug', 'Masker Respirator', 'Rompi Safety', 'Harness', 'Face Shield', 'Safety Belt'];
const incidentTypes = ['Near Miss', 'First Aid', 'Medical Case', 'Lost Time Injury'];
const emergencyTypes = ['Medical Emergency', 'Fire', 'Chemical Spill', 'Gas Leak'];
const hazardStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

const seedMassiveDummyData = async () => {
    try {
        console.log('🚀 Starting MASSIVE Dummy Data Seeding for Stress Testing...\n');

        // Step 1: Database connection
        await sequelize.authenticate();
        console.log('✅ Step 1: Database connected successfully\n');

        // Step 2: Clean operational data (NOT Users)
        console.log('🧹 Step 2: Cleaning operational data...');
        await Certification.destroy({ where: {} });
        await Attendance.destroy({ where: {} });
        await WorkPermit.destroy({ where: {} });
        await HazardReport.destroy({ where: {} });
        await IncidentReport.destroy({ where: {} });
        await Voucher.destroy({ where: {} });
        await EmergencyCall.destroy({ where: {} });
        await Audit.destroy({ where: {} });
        await CorrectiveAction.destroy({ where: {} });
        console.log('   ✅ Operational data cleaned\n');

        // Step 3: Fetch existing users and create 100 new users
        console.log('👥 Step 3: Creating 100 new users...');
        const existingUsers = await User.findAll();
        console.log(`   ℹ️  Found ${existingUsers.length} existing users`);

        // Create 100 new users with role distribution: 80 Staff, 15 SPV, 5 HSE
        const newUsers = [];
        for (let i = 0; i < 100; i++) {
            let role;
            if (i < 80) role = 'Staff';
            else if (i < 95) role = 'Supervisor';
            else role = 'HSE';

            newUsers.push({
                nama: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password: 'password123', // Default password for testing
                role: role,
                perusahaan: 'PT Nuraga Safety',
                points: 0
            });
        }

        const createdUsers = await User.bulkCreate(newUsers);
        const allUsers = [...existingUsers, ...createdUsers];
        console.log(`   ✅ Created ${createdUsers.length} new users (Total: ${allUsers.length})\n`);

        // Step 4: Seed Certifications
        console.log('📜 Step 4: Seeding Certifications...');
        let certCount = 0;
        const certData = [];
        
        for (const user of allUsers) {
            const numCerts = randomInt(2, 4);
            for (let i = 0; i < numCerts; i++) {
                const issueDate = getRandomPastDate(730);
                const expiryDate = new Date(issueDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + randomInt(2, 5));
                
                if (randomInt(1, 10) <= 2) {
                    expiryDate.setFullYear(expiryDate.getFullYear() - randomInt(1, 2));
                }

                certData.push({
                    id_user: user.id_user,
                    nama_personil: user.nama,
                    jenis_sertifikasi: randomChoice(certifications),
                    nomor_sertifikat: `CERT-${randomInt(100000, 999999)}`,
                    tanggal_terbit: issueDate,
                    tanggal_expired: expiryDate,
                    status: expiryDate < new Date() ? 'Expired' : 'Active'
                });
                certCount++;
            }
        }
        
        await Certification.bulkCreate(certData);
        console.log(`   ✅ Created ${certCount} certifications\n`);

        // Step 5: Seed Attendance with Chunking (180 days, all users)
        console.log('📅 Step 5: Seeding Attendance (180 days, chunked)...');
        let attendanceCount = 0;
        const attendanceData = [];
        const CHUNK_SIZE = 5000;
        
        // Generate attendance data for 180 days back
        for (const user of allUsers) {
            for (let day = 180; day >= 1; day--) {
                const date = new Date();
                date.setDate(date.getDate() - day);
                
                // Clock-in record
                const clockIn = new Date(date);
                clockIn.setHours(randomInt(7, 9), randomInt(0, 59));
                
                attendanceData.push({
                    id_user: user.id_user,
                    type: 'Datang',
                    sleep_hours: randomInt(6, 9),
                    stress_level: randomInt(1, 10),
                    fatigue_status: randomChoice(['Normal', 'Ringan', 'Sedang']),
                    recommendation: randomChoice(['Istirahat cukup', 'Hidrasi', 'Stretching']),
                    foto_bukti: null,
                    createdAt: clockIn,
                    updatedAt: clockIn
                });
                attendanceCount++;

                // Clock-out record
                const clockOut = new Date(date);
                clockOut.setHours(randomInt(16, 18), randomInt(0, 59));
                
                attendanceData.push({
                    id_user: user.id_user,
                    type: 'Pulang',
                    sleep_hours: null,
                    stress_level: randomInt(1, 10),
                    fatigue_status: randomChoice(['Normal', 'Ringan', 'Sedang']),
                    recommendation: randomChoice(['Istirahat cukup', 'Hidrasi', 'Stretching']),
                    foto_bukti: null,
                    createdAt: clockOut,
                    updatedAt: clockOut
                });
                attendanceCount++;
            }
        }

        // Chunk and bulk insert attendance data
        const totalChunks = Math.ceil(attendanceData.length / CHUNK_SIZE);
        for (let i = 0; i < attendanceData.length; i += CHUNK_SIZE) {
            const chunk = attendanceData.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            console.log(`   📦 Inserting Attendance Chunk ${chunkNumber}/${totalChunks} (${chunk.length} records)...`);
            await Attendance.bulkCreate(chunk);
        }
        console.log(`   ✅ Created ${attendanceCount} attendance records\n`);

        // Step 6: Seed Work Permits (150 permits)
        console.log('📋 Step 6: Seeding Work Permits...');
        let permitCount = 0;
        const permitData = [];
        
        for (let i = 0; i < 150; i++) {
            const user = randomChoice(allUsers);
            const permitDate = getRandomPastDate(180);
            const workers = [faker.person.fullName(), faker.person.fullName(), faker.person.fullName()];
            const hazardList = [randomChoice(hazards), randomChoice(hazards)];
            const apdList = [randomChoice(apdItems), randomChoice(apdItems), randomChoice(apdItems)];

            permitData.push({
                id_user: user.id_user,
                jenis_permit: randomChoice(permitTypes),
                perusahaan: 'PT Nuraga Safety',
                lokasi: randomChoice(locations),
                deskripsi_pekerjaan: faker.lorem.sentence(),
                supervisor_name: faker.person.fullName(),
                daftar_pekerja: workers,
                bahaya: hazardList,
                apd: apdList,
                sistem_isolasi: 'LOTO applied',
                gas_test: { o2: '20.8%', h2s: '0 ppm', co: '0 ppm', lel: '0%' },
                kondisi_cuaca: randomChoice(['Cerah', 'Berawan', 'Hujan Ringan']),
                applicant_sig: true,
                supervisor_sig: true,
                safety_officer_sig: true,
                approver_sig: true,
                supervisor_approved_at: permitDate,
                safety_officer_approved_at: new Date(permitDate.getTime() + 3600000),
                manager_approved_at: new Date(permitDate.getTime() + 7200000),
                foto_lokasi: null,
                waktu_mulai: permitDate,
                waktu_selesai: new Date(permitDate.getTime() + 28800000),
                approval_step: 4,
                status: 'Approved',
                approved_by: allUsers.find(u => u.role === 'HSE')?.id_user || user.id_user,
                createdAt: permitDate,
                updatedAt: permitDate
            });
            permitCount++;
        }
        
        await WorkPermit.bulkCreate(permitData);
        console.log(`   ✅ Created ${permitCount} work permits\n`);

        // Step 7: Seed Hazard Reports (200 reports)
        console.log('⚠️  Step 7: Seeding Hazard Reports...');
        let hazardCount = 0;
        const hazardData = [];
        
        for (let i = 0; i < 200; i++) {
            const user = randomChoice(allUsers);
            const createdAt = getRandomPastDate(180);
            const tanggalSelesai = new Date(createdAt.getTime() + 86400000 * randomInt(1, 14));
            
            hazardData.push({
                id_user: user.id_user,
                lokasi: randomChoice(locations),
                deskripsi: `Bahaya terdeteksi: ${randomChoice(hazards)} di ${randomChoice(locations)}. ${faker.lorem.sentence()}`,
                risiko: randomChoice(['Low', 'Medium', 'High', 'Critical']),
                status: randomChoice(['Open', 'In Progress', 'Resolved', 'Closed']),
                createdAt: createdAt,
                updatedAt: tanggalSelesai
            });
            hazardCount++;
        }
        
        await HazardReport.bulkCreate(hazardData);
        console.log(`   ✅ Created ${hazardCount} hazard reports\n`);

        // Step 8: Seed Incident Reports (2 incidents for normalized TRIR)
        console.log('🚨 Step 8: Seeding Incident Reports (Normalized TRIR)...');
        let incidentCount = 0;
        const incidentData = [];
        
        for (let i = 0; i < 2; i++) {
            const user = randomChoice(allUsers);
            const createdAt = getRandomPastDate(180);
            const lossCost = randomInt(0, 50000000);

            incidentData.push({
                id_user: user.id_user,
                kategori: randomChoice(incidentTypes),
                kronologi: `Insiden terjadi saat ${randomChoice(['maintenance', 'operasional', 'loading'])} di ${randomChoice(locations)}. ${faker.lorem.paragraph()}`,
                korban: faker.person.fullName(),
                loss_cost: lossCost,
                five_whys: {
                    why1: 'Pekerja tergelincir',
                    why2: 'Lantai licin karena tumpahan minyak',
                    why3: 'Tumpahan tidak segera dibersihkan',
                    why4: 'Tidak ada prosedur pembersihan yang jelas',
                    why5: 'Kurangnya pelatihan housekeeping'
                },
                createdAt: createdAt,
                updatedAt: createdAt
            });
            incidentCount++;
        }
        
        await IncidentReport.bulkCreate(incidentData);
        console.log(`   ✅ Created ${incidentCount} incident reports\n`);

        // Step 9: Seed Gamification Data
        console.log('🎮 Step 9: Seeding Gamification Data...');
        
        // Add random points to users
        for (const user of allUsers) {
            const points = randomInt(100, 2000);
            await user.update({ points: user.points + points });
        }

        // Create claimed vouchers
        const voucherCount = randomInt(30, 50);
        const voucherData = [];
        for (let i = 0; i < voucherCount; i++) {
            const user = randomChoice(allUsers);
            const claimDate = getRandomPastDate(180);
            
            voucherData.push({
                id_user: user.id_user,
                reward_id: randomInt(1, 10),
                reward_title: randomChoice(['Voucer Makan Siang', 'Voucer Belanja Rp50K', 'Merchandise K3', 'Voucer Bensin', 'Voucer Pulsa']),
                points_spent: randomInt(200, 1000),
                code: `VOUCHER-${randomInt(100000, 999999)}`,
                status: 'Claimed',
                claimedAt: claimDate,
                createdAt: claimDate,
                updatedAt: claimDate
            });
        }
        
        await Voucher.bulkCreate(voucherData);
        console.log(`   ✅ Added points to users and created ${voucherCount} vouchers\n`);

        // Step 10: Seed Emergency Calls (30 calls)
        console.log('🆘 Step 10: Seeding Emergency Calls...');
        let emergencyCount = 0;
        const emergencyData = [];
        
        for (let i = 0; i < 30; i++) {
            const user = randomChoice(allUsers);
            const emergencyDate = getRandomPastDate(180);
            
            emergencyData.push({
                jenis_kejadian: randomChoice(emergencyTypes),
                lokasi: randomChoice(locations),
                waktu_kejadian: emergencyDate,
                status: randomChoice(['Triggered', 'Responded', 'Closed']),
                handled_by: user.id_user,
                createdAt: emergencyDate,
                updatedAt: emergencyDate
            });
            emergencyCount++;
        }
        
        await EmergencyCall.bulkCreate(emergencyData);
        console.log(`   ✅ Created ${emergencyCount} emergency calls\n`);

        // Step 11: Seed Safety Audits (40 audits)
        console.log('🔍 Step 11: Seeding Safety Audits...');
        let auditCount = 0;
        const auditData = [];
        
        for (let i = 0; i < 40; i++) {
            const auditor = randomChoice(allUsers);
            const auditDate = getRandomPastDate(180);
            
            auditData.push({
                auditor_id: auditor.id_user,
                area: randomChoice(locations),
                tanggal: auditDate,
                hasil: `Inspeksi K3 rutin di ${randomChoice(locations)}. ${faker.lorem.paragraph()}`,
                qr_code_asset: `ASSET-${randomInt(1000, 9999)}`,
                checklist_items: JSON.stringify([
                    { item: 'APD Availability', status: randomChoice(['Pass', 'Fail']) },
                    { item: 'Fire Extinguisher', status: randomChoice(['Pass', 'Fail']) },
                    { item: 'Emergency Exit', status: randomChoice(['Pass', 'Fail']) },
                    { item: 'Safety Signs', status: randomChoice(['Pass', 'Fail']) }
                ]),
                createdAt: auditDate,
                updatedAt: auditDate
            });
            auditCount++;
        }
        
        await Audit.bulkCreate(auditData);
        console.log(`   ✅ Created ${auditCount} safety audits\n`);

        // Step 12: Seed Corrective Actions (50 actions)
        console.log('🔧 Step 12: Seeding Corrective Actions...');
        let actionCount = 0;
        const actionData = [];
        
        // Fetch created hazards for proper foreign key references
        const hazardRecords = await HazardReport.findAll({ attributes: ['id_hazard'] });
        const incidentRecords = await IncidentReport.findAll({ attributes: ['id_incident'] });

        // Create corrective actions for hazards
        for (let i = 0; i < 35; i++) {
            const assignedTo = randomChoice(allUsers);
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + randomInt(7, 30));
            const hazard = hazardRecords.length > 0 ? randomChoice(hazardRecords) : null;
            
            actionData.push({
                id_hazard: hazard ? hazard.id_hazard : null,
                description: `Perbaikan bahaya terdeteksi: ${randomChoice(hazards)} di ${randomChoice(locations)}. ${faker.lorem.sentence()}`,
                assigned_to: assignedTo.id_user,
                deadline: deadline,
                status: randomChoice(['Open', 'In Progress', 'Closed']),
                createdAt: getRandomPastDate(180),
                updatedAt: new Date()
            });
            actionCount++;
        }

        // Create corrective actions for incidents
        for (let i = 0; i < 15; i++) {
            const assignedTo = randomChoice(allUsers);
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + randomInt(7, 30));
            const incident = incidentRecords.length > 0 ? randomChoice(incidentRecords) : null;
            
            actionData.push({
                id_incident: incident ? incident.id_incident : null,
                description: `Tindakan perbaikan pasca-insiden: ${randomChoice(['Training ulang', 'Perbaikan prosedur', 'Perbaikan fasilitas'])} untuk mencegah kejadian berulang. ${faker.lorem.sentence()}`,
                assigned_to: assignedTo.id_user,
                deadline: deadline,
                status: randomChoice(['Open', 'In Progress', 'Closed']),
                createdAt: getRandomPastDate(180),
                updatedAt: new Date()
            });
            actionCount++;
        }
        
        await CorrectiveAction.bulkCreate(actionData);
        console.log(`   ✅ Created ${actionCount} corrective actions\n`);

        // Summary
        console.log('✨ MASSIVE Dummy Data Seeding Completed Successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - Total Users: ${allUsers.length} (${createdUsers.length} new)`);
        console.log(`   - Certifications: ${certCount}`);
        console.log(`   - Attendance Records: ${attendanceCount}`);
        console.log(`   - Work Permits: ${permitCount}`);
        console.log(`   - Hazard Reports: ${hazardCount}`);
        console.log(`   - Incident Reports: ${incidentCount} (TRIR Normalized)`);
        console.log(`   - Vouchers: ${voucherCount}`);
        console.log(`   - Emergency Calls: ${emergencyCount}`);
        console.log(`   - Safety Audits: ${auditCount}`);
        console.log(`   - Corrective Actions: ${actionCount}\n`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during massive data seeding:', error);
        await sequelize.close();
        process.exit(1);
    }
};

seedMassiveDummyData();
