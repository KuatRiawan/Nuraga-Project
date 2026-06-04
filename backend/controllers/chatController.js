const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

const getGlobalHistory = async (req, res) => {
    try {
        const messages = await ChatMessage.findAll({
            where: { tipe: 'global' },
            include: [{
                model: User,
                attributes: ['id_user', 'nama', 'role']
            }],
            order: [['createdAt', 'DESC']],
            limit: 100 // Load last 100 messages for MVP
        });

        // Reverse to chronological order for UI
        res.json(messages.reverse());
    } catch (error) {
        console.error('[Chat] Fetch error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getGlobalHistory
};
