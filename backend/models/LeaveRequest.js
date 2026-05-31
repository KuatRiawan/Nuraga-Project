const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const LeaveRequest = sequelize.define('LeaveRequest', {
    id_leave: {
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
        type: DataTypes.ENUM('Izin', 'Cuti', 'Sakit'),
        allowNull: false,
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending',
    },
    document_proof: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'LeaveRequests'
});

module.exports = LeaveRequest;
