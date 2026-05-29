const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemConfig = sequelize.define('SystemConfig', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    timestamps: true,
});

module.exports = SystemConfig;
