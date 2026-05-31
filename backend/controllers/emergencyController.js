const { Op } = require('sequelize');
const EmergencyCall = require('../models/EmergencyCall');
const User = require('../models/User');
const Certification = require('../models/Certification');
const WorkPermit = require('../models/WorkPermit');
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
                } catch (e) { }
                return Array.isArray(workers) && workers.some(w => w.toLowerCase() === responder.nama.toLowerCase());
            });

            if (responderPermit) {
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
        }

        const notifyEmergencyContacts = async () => {
            const responderNames = finalResponders.map(r => `• ${r.nama} (${r.role})`).join('\n') || '• Belum ada responder ditemukan';
            const broadcastMessage =
                `🚨 *[NURAGA SAFETY — DARURAT SOS!]*\n\n` +
                `⚠️ Jenis Kejadian: *${jenis_kejadian}*\n` +
                `📍 Lokasi: *${victimZone}*\n` +
                `👤 Pelapor: *${victimName || 'Tidak diketahui'}*\n` +
                `🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
                `👷 Responder yang Diarahkan:\n${responderNames}\n\n` +
                `Tetap waspada, ikuti instruksi HSE, dan beri akses untuk tim responder.`;

            const allUsers = await User.findAll({
                attributes: ['id_user', 'nama', 'role', 'no_whatsapp'],
                where: {
                    no_whatsapp: {
                        [Op.ne]: null
                    }
                }
            });

            console.log('[Emergency] WhatsApp broadcast candidates:', allUsers.map(u => ({ id: u.id_user, nama: u.nama, role: u.role, no_whatsapp: !!u.no_whatsapp })));
            for (const u of allUsers) {
                if (u.no_whatsapp) {
                    try {
                        await wa.sendMessage(u.no_whatsapp, broadcastMessage);
                    } catch (err) {
                        console.error(`[WhatsApp] Failed to notify ${u.nama}:`, err.message);
                    }
                } else {
                    console.warn(`[WhatsApp] Skipping ${u.nama} — no_whatsapp not set`);
                }
            }

            // Also notify responders directly - batch query to avoid N+1
            const responderIds = finalResponders
                .filter(r => r && r.id_user)
                .map(r => r.id_user);
            
            const responderUsersMap = new Map();
            if (responderIds.length > 0) {
                const responderUsers = await User.findAll({
                    attributes: ['id_user', 'nama', 'role', 'no_whatsapp'],
                    where: {
                        id_user: { [Op.in]: responderIds }
                    }
                });
                responderUsers.forEach(u => responderUsersMap.set(u.id_user, u));
            }

            for (const responder of finalResponders) {
                try {
                    const responderUser = responder && responder.id_user ? responderUsersMap.get(responder.id_user) : null;
                    const phone = (responderUser && responderUser.no_whatsapp) || (responder && responder.no_whatsapp);
                    if (phone) {
                        await wa.sendMessage(phone,
                            `🚨 *[NURAGA SAFETY — ANDA DITUGASKAN SEBAGAI RESPONDER]*\n\n` +
                            `Jenis Kejadian: *${jenis_kejadian}*\n` +
                            `Lokasi: *${victimZone}*\n` +
                            `Pelapor: ${victimName || 'Tidak diketahui'}\n\n` +
                            `Segera bergerak ke lokasi kejadian!`
                        );
                    } else {
                        console.warn(`[WhatsApp] Responder ${responder.nama || responderUser?.nama || responder.id_user} has no_whatsapp, skipping.`);
                    }
                } catch (err) {
                    console.error('[WhatsApp] Error notifying responder:', err.message);
                }
            }
        };

        res.status(201).json({
            message: 'Darurat dipicu dan notifikasi personil sedang dikirim',
            emergency: {
                ...emergency.toJSON(),
                reporter_name: victimName
            },
            responders: finalResponders
        });

        setImmediate(() => {
            notifyEmergencyContacts().catch((waErr) => {
                console.error('[WhatsApp] Emergency notification failed:', waErr.message);
            });
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

        const notifyResolvedContacts = async () => {
            const waMessage = 
                `✅ *[NURAGA SAFETY — STATUS AMAN]*\n\n` +
                `Peringatan Darurat untuk kejadian *${emergency.jenis_kejadian}* di *${emergency.lokasi}* telah dicabut.\n\n` +
                `Kondisi dinyatakan *Kondusif/Aman* oleh: ${resolverName} (${req.user.role}).\n` +
                `Waktu Selesai: ${new Date().toLocaleString('id-ID')}\n\n` +
                `Seluruh staf dapat kembali beraktivitas normal.`;

            const allUsers = await User.findAll({
                attributes: ['id_user', 'nama', 'role', 'no_whatsapp'],
                where: {
                    no_whatsapp: {
                        [Op.ne]: null
                    }
                }
            });

            console.log('[Emergency][Resolve] WhatsApp broadcast candidates:', allUsers.map(u => ({ id: u.id_user, nama: u.nama, role: u.role, no_whatsapp: !!u.no_whatsapp })));
            for (const u of allUsers) {
                if (u.no_whatsapp) {
                    try {
                        await wa.sendMessage(u.no_whatsapp, waMessage);
                    } catch (err) {
                        console.error(`[WhatsApp] Failed to notify ${u.nama} on resolve:`, err.message);
                    }
                } else {
                    console.warn(`[WhatsApp] Skipping ${u.nama} on resolve — no_whatsapp not set`);
                }
            }
        };

        res.json({ message: 'Status darurat berhasil dicabut (kondusif).', emergency });

        setImmediate(() => {
            notifyResolvedContacts().catch((waErr) => {
                console.error('[WhatsApp] Resolve notification failed:', waErr.message);
            });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { triggerEmergency, getEmergencies, resolveEmergency };
