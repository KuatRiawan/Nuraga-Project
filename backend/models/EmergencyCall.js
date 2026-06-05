const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EmergencyCall = sequelize.define('EmergencyCall', {
    id_emergency: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    jenis_kejadian: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lokasi: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    waktu_kejadian: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.ENUM('Triggered', 'Responded', 'Closed'),
        defaultValue: 'Triggered',
    },
    handled_by: {
        type: DataTypes.INTEGER, // ID Pengguna responden
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = EmergencyCall;
