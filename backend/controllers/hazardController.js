const HazardReport = require('../models/HazardReport');
const User = require('../models/User');
const CorrectiveAction = require('../models/CorrectiveAction');
const sequelize = require('../config/db');
const { clearStatsCache } = require('./statsController');
const { recordLog } = require('./logController');

const resolveCapaAssignee = async (transaction) => {
    const queryOptions = {
        where: { role: 'HSE' },
        order: [['id_user', 'ASC']],
    };
    if (transaction) {
        queryOptions.transaction = transaction;
    }

    const hseUser = await User.findOne(queryOptions);
    return hseUser ? hseUser.id_user : 1;
};

const createHazard = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { lokasi, deskripsi, risiko, koordinat_gps } = req.body;

        // Data length validation
        if (deskripsi && deskripsi.length > 5000) {
            await t.rollback();
            return res.status(400).json({ message: 'Deskripsi terlalu panjang. Maksimal 5000 karakter.' });
        }

        // Manual enum validation for risiko
        const validRisks = ['Low', 'Medium', 'High', 'Critical'];
        if (risiko && !validRisks.includes(risiko)) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid risk level. Valid values: Low, Medium, High, Critical' });
        }

        const hazard = await HazardReport.create({
            id_user: req.user.id,
            lokasi,
            deskripsi,
            risiko,
            original_risiko: risiko,
            koordinat_gps,
            foto: req.file ? req.file.filename : null,
        }, { transaction: t });

        // Auto-create CAPA for High/Critical risks
        if (risiko === 'High' || risiko === 'Critical') {
            const assignedTo = await resolveCapaAssignee(t);
            await CorrectiveAction.create({
                id_hazard: hazard.id_hazard,
                description: `Immediate corrective action required for: ${deskripsi}`,
                assigned_to: assignedTo,
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour deadline
                status: 'Open'
            }, { transaction: t });
        }

        await t.commit();
        clearStatsCache();
        await recordLog(req, 'CREATE_HAZARD', `User ${req.user.nama} (${req.user.role}) melaporkan temuan bahaya baru di ${lokasi} (Tingkat Risiko: ${risiko}).`);
        res.status(201).json(hazard);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

const getHazards = async (req, res) => {
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

        // Vendors may only view their own hazard reports.
        if (req.user.role === 'Vendor') {
            queryOptions.where = { id_user: req.user.id };
        }

        const results = await HazardReport.findAndCountAll(queryOptions);
        const totalPages = Math.ceil(results.count / limit);

        res.json({
            data: results.rows,
            totalItems: results.count,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const hazard = await HazardReport.findByPk(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found' });

        hazard.status = status;
        await hazard.save();
        clearStatsCache();
        await recordLog(req, 'UPDATE_HAZARD_STATUS', `${req.user.nama} (${req.user.role}) memperbarui status Laporan Bahaya #${hazard.id_hazard} menjadi: ${status}.`);
        res.json(hazard);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const overrideRisk = async (req, res) => {
    try {
        const { risiko } = req.body; // 'Low', 'Medium', 'High', 'Critical'
        
        // Manual enum validation for risiko
        const validRisks = ['Low', 'Medium', 'High', 'Critical'];
        if (risiko && !validRisks.includes(risiko)) {
            return res.status(400).json({ message: 'Invalid risk level. Valid values: Low, Medium, High, Critical' });
        }
        
        const hazard = await HazardReport.findByPk(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found' });

        hazard.risiko = risiko;
        hazard.is_overridden = true;
        await hazard.save();

        // Manage CAPA based on new risk rating
        if (risiko === 'High' || risiko === 'Critical') {
            const existingCapa = await CorrectiveAction.findOne({ where: { id_hazard: hazard.id_hazard } });
            if (!existingCapa) {
                const assignedTo = await resolveCapaAssignee();
                await CorrectiveAction.create({
                    id_hazard: hazard.id_hazard,
                    description: `Immediate corrective action required (Overridden) for: ${hazard.deskripsi}`,
                    assigned_to: assignedTo,
                    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour deadline
                    status: 'Open'
                });
            } else if (existingCapa.status === 'Closed' || existingCapa.status === 'Resolved') {
                existingCapa.status = 'Open';
                await existingCapa.save();
            }
        } else {
            const existingCapa = await CorrectiveAction.findOne({ where: { id_hazard: hazard.id_hazard } });
            if (existingCapa) {
                existingCapa.status = 'Closed';
                await existingCapa.save();
            }
        }

        clearStatsCache();
        await recordLog(req, 'OVERRIDE_HAZARD_RISK', `${req.user.nama} (${req.user.role}) mengubah paksa tingkat risiko Laporan Bahaya #${hazard.id_hazard} menjadi ${risiko}.`);
        res.json(hazard);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const verifyHazard = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const hazard = await HazardReport.findByPk(req.params.id, { transaction: t });
        if (!hazard) {
            await t.rollback();
            return res.status(404).json({ message: 'Laporan bahaya tidak ditemukan' });
        }

        if (hazard.is_verified) {
            await t.rollback();
            return res.status(400).json({ message: 'Laporan bahaya ini sudah divalidasi sebelumnya' });
        }

        hazard.is_verified = true;
        await hazard.save({ transaction: t });

        // Award points to the reporter (hazard.id_user)
        const reporter = await User.findByPk(hazard.id_user, { transaction: t });
        if (reporter) {
            reporter.points = (reporter.points || 0) + 100;
            await reporter.save({ transaction: t });
        }

        await t.commit();
        clearStatsCache();
        await recordLog(req, 'VERIFY_HAZARD', `${req.user.nama} (${req.user.role}) memvalidasi Laporan Bahaya #${hazard.id_hazard} (+100 Poin diberikan kepada pelapor).`);
        res.json({ message: 'Laporan bahaya berhasil diverifikasi dan 100 poin dikirim ke pelapor', hazard });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createHazard, getHazards, updateStatus, overrideRisk, verifyHazard };

