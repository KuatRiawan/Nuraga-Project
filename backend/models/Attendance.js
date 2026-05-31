const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Attendance = sequelize.define('Attendance', {
    id_attendance: {
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
    type: {
        type: DataTypes.ENUM('Datang', 'Pulang'),
        allowNull: false,
    },
    sleep_hours: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    stress_level: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    fatigue_status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    recommendation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    foto_bukti: {
        type: DataTypes.STRING,
        allowNull: true, // required for clock-in but we'll enforce in controller
    }
}, {
    timestamps: true,
    tableName: 'Attendances'
});

module.exports = Attendance;
