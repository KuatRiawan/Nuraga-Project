const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WorkPermit = sequelize.define('WorkPermit', {
    id_permit: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    jenis_permit: {
        type: DataTypes.ENUM('Hot Work', 'Cold Work', 'Confined Space', 'Working at Height', 'Electrical Work', 'Excavation'),
        allowNull: false,
    },
    perusahaan: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lokasi: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    waktu_mulai: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    waktu_selesai: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    deskripsi_pekerjaan: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    supervisor_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    daftar_pekerja: {
        type: DataTypes.JSON, // Array of names
        defaultValue: [],
    },
    bahaya: {
        type: DataTypes.JSON, // Array of hazards
        defaultValue: [],
    },
    apd: {
        type: DataTypes.JSON, // Array of PPE
        defaultValue: [],
    },
    sistem_isolasi: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    gas_test: {
        type: DataTypes.JSON, // { o2, h2s, co, lel }
        allowNull: true,
    },
    kondisi_cuaca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    jsa_content: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    approval_step: {
        type: DataTypes.INTEGER, // 1: Applicant, 2: HSE, 3: Manager
        defaultValue: 1,
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Active', 'Closed', 'Rejected', 'Expired'),
        defaultValue: 'Pending',
    },
    applicant_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    supervisor_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    supervisor_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    safety_officer_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    safety_officer_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    approver_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    manager_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    close_applicant_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    close_supervisor_sig: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    housekeeping_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
});


module.exports = WorkPermit;
