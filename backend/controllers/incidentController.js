const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const sequelize = require('../config/db');
const { clearStatsCache } = require('./statsController');
const wa = require('../services/whatsappService');

const createIncident = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { kategori, kronologi, korban, loss_cost, five_whys } = req.body;
        
        // Guard JSON parsing for five_whys
        let parsedFiveWhys = null;
        if (five_whys) {
            try {
                parsedFiveWhys = typeof five_whys === 'string' ? JSON.parse(five_whys) : five_whys;
            } catch (parseError) {
                await t.rollback();
                return res.status(400).json({ message: 'Format JSON five_whys tidak valid' });
            }
        }
        
        const incident = await IncidentReport.create({
            id_user: req.user.id,
            kategori,
            kronologi,
            korban,
            loss_cost: loss_cost ? parseFloat(loss_cost) : 0,
            five_whys: parsedFiveWhys,
            foto: req.file ? req.file.filename : null,
        }, { transaction: t });
        
        await t.commit();
        clearStatsCache();

        // WA: notify HSE/Admin about new incident
        try {
            const hsePics = await User.findAll({ where: { role: ['HSE', 'Admin', 'Manager'] } });
            const msg =
                `⚠️ *[NURAGA SAFETY — Laporan Insiden Baru]*\n\n` +
                `Kategori: *${kategori}*\n` +
                `Pelapor: *${req.user.nama}* (${req.user.role})\n` +
                `Korban: ${korban || '-'}\n` +
                `Kronologi: ${(kronologi || '').slice(0, 150)}...\n\n` +
                `Segera investigasi di sistem Nuraga Safety.`;
            for (const u of hsePics) {
                if (u.no_whatsapp) await wa.sendMessage(u.no_whatsapp, msg);
            }
        } catch (waErr) {
            console.error('[WhatsApp] Incident notification failed:', waErr.message);
        }

        res.status(201).json(incident);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};


const getIncidents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const queryOptions = {
            include: [{ model: User, attributes: ['nama', 'role'] }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        };

        // Vendors may only view their own incident reports.
        if (req.user.role === 'Vendor') {
            queryOptions.where = { id_user: req.user.id };
        }

        const results = await IncidentReport.findAndCountAll(queryOptions);
        const totalPages = Math.ceil(results.count / limit);

        res.json({
            data: results.rows,
            totalItems: results.count,
            totalPages,
            currentPage: page
        });
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
            // Guard JSON parsing for five_whys
            try {
                incident.five_whys = typeof five_whys === 'string' ? JSON.parse(five_whys) : five_whys;
            } catch (parseError) {
                await t.rollback();
                return res.status(400).json({ message: 'Format JSON five_whys tidak valid' });
            }
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

