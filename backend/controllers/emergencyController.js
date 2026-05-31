const { Op } = require('sequelize');
const EmergencyCall = require('../models/EmergencyCall');
const User = require('../models/User');
const Certification = require('../models/Certification');
const WorkPermit = require('../models/WorkPermit');
const wa = require('../services/whatsappService');



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

        // WA: blast to all HSE / Admin / Manager
        try {
            const responderNames = finalResponders.map(r => `• ${r.nama} (${r.role})`).join('\n') || '• Belum ada responder ditemukan';
            const waMessage =
                `🚨 *[NURAGA SAFETY — DARURAT SOS!]*\n\n` +
                `⚠️ Jenis Kejadian: *${jenis_kejadian}*\n` +
                `📍 Lokasi: *${victimZone}*\n` +
                `👤 Pelapor: *${victimName || 'Tidak diketahui'}*\n` +
                `🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
                `👷 Responder yang Diarahkan:\n${responderNames}\n\n` +
                `Segera lakukan koordinasi respons darurat!`;

            const hsePics = await User.findAll({ where: { role: { [Op.in]: ['HSE', 'Admin', 'Manager'] } } });
            console.log('[Emergency] HSE/Admin/Manager candidates:', hsePics.map(u => ({ id: u.id_user, nama: u.nama, no_whatsapp: !!u.no_whatsapp })));
            for (const u of hsePics) {
                if (u.no_whatsapp) {
                    try {
                        await wa.sendMessage(u.no_whatsapp, waMessage);
                    } catch (err) {
                        console.error(`[WhatsApp] Failed to notify ${u.nama}:`, err.message);
                    }
                } else {
                    console.warn(`[WhatsApp] Skipping ${u.nama} — no_whatsapp not set`);
                }
            }

            // Also notify responders directly
            for (const responder of finalResponders) {
                try {
                    // responder may already be a User instance or partial object
                    const responderUser = responder && responder.id_user ? await User.findByPk(responder.id_user) : null;
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
        } catch (waErr) {
            console.error('[WhatsApp] Emergency notification failed:', waErr.message);
        }

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

        // Send WhatsApp broadcast
        try {
            const waMessage = 
                `✅ *[NURAGA SAFETY — STATUS AMAN]*\n\n` +
                `Peringatan Darurat untuk kejadian *${emergency.jenis_kejadian}* di *${emergency.lokasi}* telah dicabut.\n\n` +
                `Kondisi dinyatakan *Kondusif/Aman* oleh: ${resolverName} (${req.user.role}).\n` +
                `Waktu Selesai: ${new Date().toLocaleString('id-ID')}\n\n` +
                `Seluruh staf dapat kembali beraktivitas normal.`;

            const hsePics = await User.findAll({ where: { role: { [Op.in]: ['HSE', 'Admin', 'Manager'] } } });
            console.log('[Emergency][Resolve] HSE/Admin/Manager candidates:', hsePics.map(u => ({ id: u.id_user, nama: u.nama, no_whatsapp: !!u.no_whatsapp })));
            for (const u of hsePics) {
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
        } catch (waErr) {
            console.error('[WhatsApp] Resolve notification failed:', waErr.message);
        }

        res.json({ message: 'Status darurat berhasil dicabut (kondusif).', emergency });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { triggerEmergency, getEmergencies, resolveEmergency };
