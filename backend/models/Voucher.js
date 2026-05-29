const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Voucher = sequelize.define('Voucher', {
    id_voucher: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    reward_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    reward_title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    points_spent: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Claimed'),
        defaultValue: 'Pending',
    },
    claimedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = Voucher;
