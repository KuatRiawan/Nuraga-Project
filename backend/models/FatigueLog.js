const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const FatigueLog = sequelize.define('FatigueLog', {
    id_log: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id_user',
            onDelete: 'CASCADE',
        },
    },
    sleep_hours: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stress_level: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    fatigue_status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    recommendation: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
});

module.exports = FatigueLog;
