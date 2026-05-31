const Audit = require('../models/Audit');
const User = require('../models/User');
const { clearStatsCache } = require('./statsController');

const createAudit = async (req, res) => {
    try {
        const { area, tanggal, hasil, qr_code_asset, checklist_items } = req.body;
        const audit = await Audit.create({
            auditor_id: req.user.id,
            area,
            tanggal,
            hasil,
            qr_code_asset,
            checklist_items,
        });
        clearStatsCache();
        res.status(201).json(audit);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAudits = async (req, res) => {
    try {
        const audits = await Audit.findAll({
            include: [{ model: User, as: 'auditor', attributes: ['nama'] }],
            order: [['tanggal', 'DESC']],
        });
        res.json(audits);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { createAudit, getAudits };

