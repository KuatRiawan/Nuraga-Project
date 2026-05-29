const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const HazardReport = sequelize.define('HazardReport', {
    id_hazard: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    lokasi: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    deskripsi: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    risiko: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Low',
    },
    original_risiko: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_overridden: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    foto: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    koordinat_gps: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
        defaultValue: 'Open',
    },
}, {
    timestamps: true,
});

module.exports = HazardReport;
