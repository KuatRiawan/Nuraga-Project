const { Op } = require('sequelize');
const EmergencyCall = require('../models/EmergencyCall');
const User = require('../models/User');
const Certification = require('../models/Certification');
const WorkPermit = require('../models/WorkPermit');

// SSE client pool
let sseClients = [];

const registerSseClient = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send a heartbeat comment every 20 seconds to keep the connection alive
    const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 20000);

    sseClients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);

    req.on('close', () => {
        clearInterval(keepAlive);
        sseClients = sseClients.filter(c => c !== res);
        console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
    });
};

const broadcastEmergency = (data) => {
    console.log(`[SSE] Broadcasting emergency to ${sseClients.length} clients`);
    sseClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            console.error('[SSE] Write error:', err.message);
        }
    });
};

const triggerEmergency = async (req, res) => {
    try {
        const { jenis_kejadian, lokasi } = req.body;
        const now = new Date();
        let victimZone = lokasi || 'Main Production Zone (Auto-detected)';

        // 1. Static location routing: retrieve the user's active work permit zone today
        const activePermits = await WorkPermit.findAll({
            where: {
                status: { [Op.in]: ['Approved', 'Active'] },
                waktu_mulai: { [Op.lte]: now },
                waktu_selesai: { [Op.gte]: now }
            }
        });

        const victimUser = await User.findByPk(req.user.id);
        const victimName = victimUser ? victimUser.nama : '';

        // Find if victim (req.user) is the applicant or listed as a worker
        const victimPermit = activePermits.find(permit => {
            if (permit.id_user === req.user.id) return true;
            let workers = [];
            try {
                workers = typeof permit.daftar_pekerja === 'string'
                    ? JSON.parse(permit.daftar_pekerja)
                    : permit.daftar_pekerja;
            } catch (e) {}
            return Array.isArray(workers) && workers.some(w => w.toLowerCase() === victimName.toLowerCase());
        });

        if (victimPermit) {
            victimZone = victimPermit.lokasi;
        }

        // Create emergency log in the database
        const emergency = await EmergencyCall.create({
            jenis_kejadian,
            lokasi: victimZone,
        });

        // 2. Find certified responders in the system
        const activeCertifications = await Certification.findAll({
            where: { status: 'Active' },
            include: [{
                model: User,
                attributes: ['id_user', 'nama', 'email', 'role']
            }]
        });

        const keywordsMap = {
            'fire': ['k3', 'fire', 'damkar'],
            'medical': ['first aid', 'medis', 'k3', 'medical'],
            'spill': ['hazmat', 'chemical', 'k3', 'storage'],
            'default': ['k3']
        };

        const eventType = (jenis_kejadian || '').toLowerCase();
        const keywords = keywordsMap[eventType] || keywordsMap['default'];

        const allResponders = activeCertifications
            .filter(cert => {
                const certName = (cert.jenis_sertifikasi || '').toLowerCase();
                return keywords.some(kw => certName.includes(kw));
            })
            .map(cert => cert.User)
            .filter((u, index, self) => u && self.findIndex(x => x.id_user === u.id_user) === index);

        // 3. Match responders to the victim's current active permit zone
        const zoneResponders = [];
        for (const responder of allResponders) {
            const responderPermit = activePermits.find(permit => {
                const zoneMatch = permit.lokasi.toLowerCase().includes(victimZone.toLowerCase()) ||
                                  victimZone.toLowerCase().includes(permit.lokasi.toLowerCase());
                if (!zoneMatch) return false;
                if (permit.id_user === responder.id_user) return true;

                let workers = [];
                try {
                    workers = typeof permit.daftar_pekerja === 'string'
                        ? JSON.parse(permit.daftar_pekerja)
                        : permit.daftar_pekerja;
                } catch (e) {}
                return Array.isArray(workers) && workers.some(w => w.toLowerCase() === responder.nama.toLowerCase());
            });

            if (responderPermit) {
                zoneResponders.push(responder);
            }
        }

        // Fallback to all responders if no responder is currently assigned to this zone
        const finalResponders = zoneResponders.length > 0 ? zoneResponders : allResponders;

        // Broadcast to all active clients (Safety Officers, HSE, etc.)
        broadcastEmergency({
            event: 'emergency-triggered',
            emergency: {
                id_emergency: emergency.id_emergency,
                jenis_kejadian: emergency.jenis_kejadian,
                lokasi: emergency.lokasi,
                waktu_kejadian: emergency.waktu_kejadian,
                status: emergency.status,
                reporter_name: victimName,
            },
            responders: finalResponders
        });

        res.status(201).json({
            message: 'Darurat dipicu dan personil bersertifikat telah diberitahu',
            emergency: {
                ...emergency.toJSON(),
                reporter_name: victimName
            },
            responders: finalResponders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEmergencies = async (req, res) => {
    try {
        const emergencies = await EmergencyCall.findAll({
            include: [{ model: User, as: 'responder', attributes: ['nama'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(emergencies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerSseClient, triggerEmergency, getEmergencies };
