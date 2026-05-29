const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const sequelize = require('../config/db');
const { clearStatsCache } = require('./statsController');

const createIncident = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { kategori, kronologi, korban, loss_cost, five_whys } = req.body;
        const incident = await IncidentReport.create({
            id_user: req.user.id,
            kategori,
            kronologi,
            korban,
            loss_cost: loss_cost ? parseFloat(loss_cost) : 0,
            five_whys: five_whys ? (typeof five_whys === 'string' ? JSON.parse(five_whys) : five_whys) : null,
            foto: req.file ? req.file.filename : null,
        }, { transaction: t });
        
        await t.commit();
        clearStatsCache();
        res.status(201).json(incident);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

const getIncidents = async (req, res) => {
    try {
        const incidents = await IncidentReport.findAll({
            include: [{ model: User, attributes: ['nama', 'role'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateIncident = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { loss_cost, five_whys } = req.body;

        // Check if user is HSE or Admin
        if (req.user.role !== 'HSE' && req.user.role !== 'Admin') {
            await t.rollback();
            return res.status(403).json({ message: 'Only HSE Officers or Admins can update incident investigation details.' });
        }

        const incident = await IncidentReport.findByPk(id, { transaction: t });
        if (!incident) {
            await t.rollback();
            return res.status(404).json({ message: 'Incident report not found' });
        }

        if (loss_cost !== undefined) {
            incident.loss_cost = parseFloat(loss_cost) || 0;
        }
        if (five_whys !== undefined) {
            incident.five_whys = typeof five_whys === 'string' ? JSON.parse(five_whys) : five_whys;
        }

        await incident.save({ transaction: t });

        const updated = await IncidentReport.findByPk(id, {
            include: [{ model: User, attributes: ['nama', 'role'] }],
            transaction: t
        });

        await t.commit();
        clearStatsCache();
        res.json(updated);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createIncident, getIncidents, updateIncident };

