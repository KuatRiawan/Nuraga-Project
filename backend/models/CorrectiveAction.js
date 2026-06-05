const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CorrectiveAction = sequelize.define('CorrectiveAction', {
    id_action: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_hazard: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    id_incident: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    assigned_to: {
        type: DataTypes.INTEGER, // ID Pengguna
        allowNull: false,
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Open', 'In Progress', 'Closed'),
        defaultValue: 'Open',
    },
}, {
    timestamps: true,
});

module.exports = CorrectiveAction;
