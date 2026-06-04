const { Op } = require('sequelize');
const EmergencyCall = require('../models/EmergencyCall');
const User = require('../models/User');
const Certification = require('../models/Certification');
const WorkPermit = require('../models/WorkPermit');
const ChatMessage = require('../models/ChatMessage');
const wa = require('../services/whatsappService');

// Simple in-memory cooldown cache for SOS spam prevention
const sosCooldownCache = new Map();
const COOLDOWN_SECONDS = 60;
const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;



const triggerEmergency = async (req, res) => {
    try {
        const { jenis_kejadian, lokasi } = req.body;
        const now = new Date();
        let victimZone = lokasi || 'Main Production Zone (Auto-detected)';

        // Check cooldown for SOS spam prevention
        const userId = req.user.id;
        const lastTriggerTime = sosCooldownCache.get(userId);
        if (lastTriggerTime) {
            const timeSinceLastTrigger = (now - lastTriggerTime) / 1000; // Convert to seconds
            if (timeSinceLastTrigger < COOLDOWN_SECONDS) {
                return res.status(429).json({ message: "Terlalu banyak permintaan darurat. Harap tunggu 60 detik." });
            }
        }
        // Update the cooldown cache with auto-cleanup to prevent memory leak
        sosCooldownCache.set(userId, now);
        // Schedule automatic cleanup after cooldown period expires
        setTimeout(() => {
            sosCooldownCache.delete(userId);
            console.log(`[EmergencyController] Cooldown expired for user ${userId}`);
        }, COOLDOWN_MS);

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
            } catch (e) { }
            return Array.isArray(workers) && workers.some(w => w.toLowerCase() === victimName.toLowerCase());
        });

        if (victimPermit) {
            victimZone = victimPermit.lokasi;
        } else if (victimUser && victimUser.area_kerja) {
            victimZone = victimUser.area_kerja;
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
                attributes: ['id_user', 'nama', 'email', 'role', 'area_kerja']
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
            let zoneMatch = false;
            if (responder.area_kerja && responder.area_kerja.toLowerCase().includes(victimZone.toLowerCase())) {
                zoneMatch = true;
            } else {
                const responderPermit = activePermits.find(permit => {
                    const permitMatch = permit.lokasi.toLowerCase().includes(victimZone.toLowerCase()) ||
                        victimZone.toLowerCase().includes(permit.lokasi.toLowerCase());
                    if (!permitMatch) return false;
                    if (permit.id_user === responder.id_user) return true;

                    let workers = [];
                    try {
                        workers = typeof permit.daftar_pekerja === 'string'
                            ? JSON.parse(permit.daftar_pekerja)
                            : permit.daftar_pekerja;
                    } catch (e) { }
                    return Array.isArray(workers) && workers.some(w => w.toLowerCase() === responder.nama.toLowerCase());
                });
                if (responderPermit) zoneMatch = true;
            }

            if (zoneMatch) {
                zoneResponders.push(responder);
            }
        }

        // Fallback to all responders if no responder is currently assigned to this zone
        const finalResponders = zoneResponders.length > 0 ? zoneResponders : allResponders;

        // Broadcast to all active clients via WebSockets
        const io = req.app.get('io');
        if (io) {
            io.emit('EMERGENCY_SOS', {
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

            // AUTO SEND MESSAGE TO GLOBAL CHAT
            try {
                const systemMessageContent = `🚨 LAPORAN DARURAT SOS! 🚨\n\nPELAPOR: ${victimName.toUpperCase()}\nKEJADIAN: ${(jenis_kejadian || 'Tidak Diketahui').toUpperCase()}\nLOKASI: ${victimZone.toUpperCase()}\n\nMohon segera merespons ke lokasi atau berikan koordinasi di grup ini!`;

                const chatMsg = await ChatMessage.create({
                    id_user: req.user.id,
                    pesan: systemMessageContent
                });

                io.to('global_chat').emit('receive_global_message', {
                    ...chatMsg.toJSON(),
                    User: {
                        nama: victimName,
                        role: victimUser ? victimUser.role : 'System'
                    }
                });
            } catch (chatErr) {
                console.error('[Emergency] Failed to send auto-chat message', chatErr);
            }
        }

        res.status(201).json({
            message: 'Darurat dipicu dan sirine sedang dibunyikan di web/aplikasi.',
            emergency: {
                ...emergency.toJSON(),
                reporter_name: victimName
            },
            responders: finalResponders
        });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const resolveEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const emergency = await EmergencyCall.findByPk(id);

        if (!emergency) {
            return res.status(404).json({ message: 'Log darurat tidak ditemukan.' });
        }

        if (emergency.status === 'Closed') {
            return res.status(400).json({ message: 'Darurat ini sudah ditandai aman sebelumnya.' });
        }

        emergency.status = 'Closed';
        emergency.handled_by = req.user.id;
        await emergency.save();

        const resolverName = req.user.nama;

        // Broadcast WebSockets to ALL clients
        const io = req.app.get('io');
        if (io) {
            io.emit('EMERGENCY_RESOLVED', {
                id_emergency: emergency.id_emergency,
                resolver_name: resolverName,
                waktu_selesai: new Date()
            });
        }

        // AUTO SEND RESOLVE MESSAGE TO GLOBAL CHAT
        try {
            const systemMessageContent = `✅ STATUS AMAN ✅\n\nPeringatan Darurat untuk kejadian ${(emergency.jenis_kejadian || 'Tidak Diketahui').toUpperCase()} di ${emergency.lokasi.toUpperCase()} telah dicabut.\n\nKondisi dinyatakan Kondusif oleh: ${resolverName.toUpperCase()}\nWaktu Selesai: ${new Date().toLocaleString('id-ID')}`;

            const chatMsg = await ChatMessage.create({
                id_user: req.user.id,
                pesan: systemMessageContent
            });

            if (io) {
                io.to('global_chat').emit('receive_global_message', {
                    ...chatMsg.toJSON(),
                    User: {
                        nama: resolverName,
                        role: req.user.role
                    }
                });
            }
        } catch (chatErr) {
            console.error('[Emergency] Failed to send auto-chat resolve message', chatErr);
        }

        res.json({ message: 'Status darurat berhasil dicabut (kondusif).', emergency });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { triggerEmergency, getEmergencies, resolveEmergency };
