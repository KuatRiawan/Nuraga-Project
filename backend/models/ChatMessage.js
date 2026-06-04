const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
    id_message: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pesan: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipe: {
        type: DataTypes.STRING,
        defaultValue: 'global' // 'global', 'hse', 'private', etc.
    }
}, {
    tableName: 'chat_messages',
    timestamps: true
});

module.exports = ChatMessage;
