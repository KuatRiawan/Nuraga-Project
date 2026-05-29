const HazardReport = require('../models/HazardReport');
const User = require('../models/User');
const CorrectiveAction = require('../models/CorrectiveAction');
const { clearStatsCache } = require('./statsController');
const { recordLog } = require('./logController');

const createHazard = async (req, res) => {
    try {
        const { lokasi, deskripsi, risiko, koordinat_gps } = req.body;
        const hazard = await HazardReport.create({
            id_user: req.user.id,
            lokasi,
            deskripsi,
            risiko,
            original_risiko: risiko,
            koordinat_gps,
            foto: req.file ? req.file.filename : null,
        });

        // Auto-create CAPA for High/Critical risks
        if (risiko === 'High' || risiko === 'Critical') {
            await CorrectiveAction.create({
                id_hazard: hazard.id_hazard,
                description: `Immediate corrective action required for: ${deskripsi}`,
                assigned_to: 1, // Default to HSE Manager (User 1)
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour deadline
                status: 'Open'
            });
        }

        clearStatsCache();
        await recordLog(req, 'CREATE_HAZARD', `User ${req.user.nama} (${req.user.role}) melaporkan temuan bahaya baru di ${lokasi} (Tingkat Risiko: ${risiko}).`);
        res.status(201).json(hazard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getHazards = async (req, res) => {
    try {
        const hazards = await HazardReport.findAll({
            include: [{ model: User, attributes: ['nama', 'role'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(hazards);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
};

const overrideRisk = async (req, res) => {
    try {
        const { risiko } = req.body; // 'Low', 'Medium', 'High', 'Critical'
        const hazard = await HazardReport.findByPk(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found' });

        hazard.risiko = risiko;
        hazard.is_overridden = true;
        await hazard.save();

        // Manage CAPA based on new risk rating
        if (risiko === 'High' || risiko === 'Critical') {
            const existingCapa = await CorrectiveAction.findOne({ where: { id_hazard: hazard.id_hazard } });
            if (!existingCapa) {
                await CorrectiveAction.create({
                    id_hazard: hazard.id_hazard,
                    description: `Immediate corrective action required (Overridden) for: ${hazard.deskripsi}`,
                    assigned_to: 1, // Default to HSE Manager
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
        res.status(500).json({ message: error.message });
    }
};

const verifyHazard = async (req, res) => {
    try {
        const hazard = await HazardReport.findByPk(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Laporan bahaya tidak ditemukan' });

        if (hazard.is_verified) {
            return res.status(400).json({ message: 'Laporan bahaya ini sudah divalidasi sebelumnya' });
        }

        hazard.is_verified = true;
        await hazard.save();

        // Award points to the reporter (hazard.id_user)
        const reporter = await User.findByPk(hazard.id_user);
        if (reporter) {
            reporter.points = (reporter.points || 0) + 100;
            await reporter.save();
        }

        clearStatsCache();
        await recordLog(req, 'VERIFY_HAZARD', `${req.user.nama} (${req.user.role}) memvalidasi Laporan Bahaya #${hazard.id_hazard} (+100 Poin diberikan kepada pelapor).`);
        res.json({ message: 'Laporan bahaya berhasil diverifikasi dan 100 poin dikirim ke pelapor', hazard });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createHazard, getHazards, updateStatus, overrideRisk, verifyHazard };

