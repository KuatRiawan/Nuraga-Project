const sequelize = require('./config/db');
const User = require('./models/User');

// Require other models to ensure they are synced
require('./models/HazardReport');
require('./models/IncidentReport');
require('./models/Audit');
require('./models/CorrectiveAction');
require('./models/Certification');
require('./models/WorkPermit');
require('./models/EmergencyCall');
require('./models/AuditLog');

const reset = async () => {
    try {
        // Drop and recreate all tables
        await sequelize.sync({ force: true });
        console.log('Semua tabel database berhasil di-reset (dikososngkan)...');

        // Create initial Admin User
        const password = 'password123'; // Can be changed later by user
        await User.create({
            nama: 'Kuat',
            email: 'admin@nuraga.com',
            password,
            role: 'Admin',
            points: 0,
            nik: 'ADM-001',
            jabatan: 'System Administrator',
            area_kerja: 'Head Office',
            no_whatsapp: '+6281200000001',
            jenis_kelamin: 'Laki-laki',
        });

        console.log('');
        console.log('Database sekarang BERSIH dan siap untuk DATA ASLI.');
        console.log('Akun Admin Default:');
        console.log('Email    : admin@nuraga.com');
        console.log('Password : password123');
        console.log('');
        process.exit(0);
    } catch (err) {
        console.error('Reset failed:', err);
        process.exit(1);
    }
};

reset();
