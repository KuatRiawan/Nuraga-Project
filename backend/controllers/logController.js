const AuditLog = require('../models/AuditLog');

const recordLog = async (req, action, details) => {
    try {
        const id_user = req.user ? (req.user.id || req.user.id_user) : null;
        const nama_user = req.user ? req.user.nama : 'SYSTEM';
        const role_user = req.user ? req.user.role : 'SYSTEM';
        
        // Handle direct IP address extraction
        let ip_address = '127.0.0.1';
        if (req && req.ip) {
            ip_address = req.ip;
        } else if (req && req.headers) {
            ip_address = req.headers['x-forwarded-for'] || (req.socket ? req.socket.remoteAddress : '127.0.0.1');
        }

        await AuditLog.create({
            id_user,
            nama_user,
            role_user,
            action,
            details,
            ip_address
        });
    } catch (err) {
        console.error('[AuditLog] Error recording log:', err.message);
    }
};

const getLogs = async (req, res) => {
    try {
        // Only Admin role is allowed (checked in routes middleware, but good defense here)
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Akses ditolak. Hanya Admin yang dapat melihat log sistem.' });
        }

        const logs = await AuditLog.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { recordLog, getLogs };
