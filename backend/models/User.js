const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id_user: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nama: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('Admin', 'HSE', 'Supervisor', 'Manager', 'Staff', 'Vendor'),
        allowNull: false,
    },
    foto: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    no_whatsapp: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Format: +62xxxx — untuk push notifikasi SOS & status pekerjaan',
    },
    nik: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'NIK / Badge Number — ID Pekerja Unik (Hanya Admin yang bisa ubah)',
    },
    jabatan: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Job Title / Jabatan — validasi kewenangan PTW (Hanya Admin)',
    },
    area_kerja: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Area Kerja / Departemen — digunakan untuk SOS zone routing (Hanya Admin)',
    },
    jenis_kelamin: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Laki-laki',
        comment: 'Jenis Kelamin: Laki-laki / Perempuan',
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
});

module.exports = User;
