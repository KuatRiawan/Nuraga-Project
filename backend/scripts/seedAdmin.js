/**
 * seedAdmin.js
 * One-time script to create initial Admin user in the database.
 * Run this script after database reset to create the first admin account.
 *
 * NOTE: User model has beforeCreate/beforeUpdate hooks that automatically hash passwords.
 * Do NOT manually hash the password in this script - pass plaintext and let the model handle it.
 */

const sequelize = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
    try {
        console.log('[SeedAdmin] Connecting to database...');
        await sequelize.authenticate();
        console.log('[SeedAdmin] Database connection established.');

        await User.destroy({ where: { email: 'admin@nuraga.com' } });
        console.log('[SeedAdmin] Old admin user deleted (if existed).');

        const admin = await User.create({
            nama: 'Kuat Riawan (Admin)',
            email: 'admin@nuraga.com',
            password: 'password123', // PLAINTEXT - akan di-hash oleh model
            role: 'Admin',
            jenis_kelamin: 'Laki-laki',
            points: 0,
            no_whatsapp: '+6281234567890',
            nik: 'ADMIN001',
            jabatan: 'System Administrator',
            area_kerja: 'Headquarters'
        });

        console.log('[SeedAdmin] Akun Admin berhasil dibuat!');
        console.log('[SeedAdmin] Email: admin@nuraga.com');
        console.log('[SeedAdmin] Password: password123');
        console.log('[SeedAdmin] Role: Admin');

        process.exit(0);
    } catch (error) {
        console.error('[SeedAdmin] Error creating admin user:', error.message);
        process.exit(1);
    }
};

seedAdmin();
