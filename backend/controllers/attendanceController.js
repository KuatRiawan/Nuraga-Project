const axios = require('axios');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { Op } = require('sequelize');
const wa = require('../services/whatsappService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.clockIn = async (req, res) => {
    try {
        const { sleep_hours, stress_level } = req.body;
        const id_user = req.user.id;
        const foto_bukti = req.file ? req.file.filename : null;

        // Check if already clocked in today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const existing = await Attendance.findOne({
            where: {
                id_user,
                type: 'Datang',
                createdAt: { [Op.gte]: startOfDay }
            }
        });

        if (existing) {
            return res.status(400).json({ message: "Anda sudah melakukan Absen Datang hari ini." });
        }

        // Call AI Service for Fatigue Prediction
        let aiPrediction = { fatigue_status: 'Tidak Diketahui', recommendation: '' };
        if (sleep_hours && stress_level) {
            try {
                const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict-fatigue`, {
                    sleep_hours: parseFloat(sleep_hours),
                    stress_level: parseFloat(stress_level)
                }, { timeout: 5000 });
                aiPrediction = aiResponse.data;
            } catch (error) {
                if (error.code === 'ECONNABORTED') {
                    console.error("AI Service Timeout:", error.message);
                    // We don't fail the clock-in, just record it as unknown
                } else {
                    console.error("AI Service Error:", error.message);
                    // We don't fail the clock-in, just record it as unknown
                }
            }
        }

        if (aiPrediction.fatigue_status === 'Tinggi') {
            return res.status(403).json({
                message: 'Akses ditolak: Tingkat kelelahan Anda sangat tinggi. Silakan lapor ke HSE.',
                fatigue_status: aiPrediction.fatigue_status,
                recommendation: aiPrediction.recommendation,
            });
        }

        const attendance = await Attendance.create({
            id_user,
            type: 'Datang',
            sleep_hours: sleep_hours || null,
            stress_level: stress_level || null,
            fatigue_status: aiPrediction.fatigue_status,
            recommendation: aiPrediction.recommendation,
            foto_bukti
        });

        res.status(201).json({
            message: "Absen Datang berhasil disimpan",
            data: attendance
        });
    } catch (error) {
        console.error("Error in clockIn:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.clockOut = async (req, res) => {
    try {
        const id_user = req.user.id;
        
        // Check if already clocked out today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const existingOut = await Attendance.findOne({
            where: {
                id_user,
                type: 'Pulang',
                createdAt: { [Op.gte]: startOfDay }
            }
        });

        if (existingOut) {
            return res.status(400).json({ message: "Anda sudah melakukan Absen Pulang hari ini." });
        }

        const attendance = await Attendance.create({
            id_user,
            type: 'Pulang'
        });

        res.status(201).json({
            message: "Absen Pulang berhasil disimpan",
            data: attendance
        });
    } catch (error) {
        console.error("Error in clockOut:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getTodayStatus = async (req, res) => {
    try {
        const id_user = req.user.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const clockIn = await Attendance.findOne({
            where: { id_user, type: 'Datang', createdAt: { [Op.gte]: startOfDay } }
        });
        const clockOut = await Attendance.findOne({
            where: { id_user, type: 'Pulang', createdAt: { [Op.gte]: startOfDay } }
        });

        res.status(200).json({
            clockedIn: !!clockIn,
            clockedOut: !!clockOut,
            fatigue_status: clockIn ? clockIn.fatigue_status : null
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const id_user = req.user.id;
        const history = await Attendance.findAll({
            where: { id_user },
            order: [['createdAt', 'DESC']],
            limit: 60
        });
        
        const leaves = await LeaveRequest.findAll({
            where: { id_user },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ attendance: history, leaves });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getAllHistory = async (req, res) => {
    try {
        const history = await Attendance.findAll({
            include: [{ model: User, attributes: ['nama', 'nik', 'role'] }],
            order: [['createdAt', 'DESC']],
            limit: 500
        });
        
        const leaves = await LeaveRequest.findAll({
            include: [{ model: User, attributes: ['nama', 'nik', 'role'] }],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ attendance: history, leaves });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.submitLeave = async (req, res) => {
    try {
        const { type, start_date, end_date, reason } = req.body;
        const id_user = req.user.id;
        const document_proof = req.file ? req.file.filename : null;
        const io = req.app.get('io');

        // Fetch user data
        const user = await User.findByPk(id_user, {
            attributes: ['id_user', 'nama', 'no_whatsapp', 'role']
        });

        const leave = await LeaveRequest.create({
            id_user,
            type,
            start_date,
            end_date,
            reason,
            document_proof,
            status: 'Pending'
        });

        // ━━━ Notifikasi ke Admin/Supervisor/Manager ━━━
        try {
            const approvers = await User.findAll({
                where: {
                    role: 'Admin'
                },
                attributes: ['id_user', 'nama', 'no_whatsapp', 'role']
            });

            if (approvers && approvers.length > 0) {
                // Send WhatsApp to each admin
                const typeLabel = type === 'Izin' ? 'Izin' : (type === 'Cuti' ? 'Cuti' : 'Sakit');
                const waMessage = `*[Nuraga] Pengajuan ${typeLabel} Baru*\n\n` +
                    `Pekerja: *${user.nama}*\n` +
                    `Tipe: ${typeLabel}\n` +
                    `Periode: ${start_date} s/d ${end_date}\n` +
                    `Alasan: ${reason}\n\n` +
                    `Silakan buka aplikasi untuk menyetujui/menolak.`;

                setImmediate(() => {
                    approvers.forEach(async (approver) => {
                        if (!approver.no_whatsapp) return;
                        try {
                            await wa.sendMessage(approver.no_whatsapp, waMessage);
                            console.log(`[WhatsApp] Notifikasi pengajuan ${typeLabel} dikirim ke approver: ${approver.nama}`);
                        } catch (waErr) {
                            console.error(`[WhatsApp] Gagal ke ${approver.nama}:`, waErr.message);
                        }
                    });
                });

                // Emit WebSocket to all connected admins
                if (io) {
                    io.emit('NEW_LEAVE_REQUEST', {
                        id_leave: leave.id_leave,
                        id_user: leave.id_user,
                        userName: user.nama,
                        type: leave.type,
                        start_date: leave.start_date,
                        end_date: leave.end_date,
                        reason: leave.reason,
                        status: 'Pending',
                        createdAt: leave.createdAt,
                        message: `Pengajuan ${typeLabel} baru dari ${user.nama}`
                    });
                    console.log(`[WebSocket] Event NEW_LEAVE_REQUEST dipancarkan`);
                }
            }
        } catch (notifErr) {
            console.error('[Notifikasi] Gagal mengirim notifikasi:', notifErr.message);
            // Jangan fail jika notifikasi gagal, request tetap berhasil dibuat
        }

        res.status(201).json({ message: "Pengajuan berhasil dikirim", data: leave });
    } catch (error) {
        console.error("Error submitLeave:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.approveLeave = async (req, res) => {
    try {
        const { id_leave } = req.params;
        const { status } = req.body; // Approved or Rejected
        const io = req.app.get('io');
        
        // Fetch leave with user data
        const leave = await LeaveRequest.findByPk(id_leave, {
            include: [{ model: User, attributes: ['id_user', 'nama', 'no_whatsapp', 'email'] }]
        });
        if (!leave) {
            return res.status(404).json({ message: "Data tidak ditemukan" });
        }

        const oldStatus = leave.status;
        leave.status = status;
        await leave.save();

        // ━━━ Notifikasi ke User via WhatsApp ━━━
        const statusLabel = status === 'Approved' ? 'Disetujui ✅' : 'Ditolak ❌';
        const typeLabel = leave.type === 'Izin' ? 'Izin' : (leave.type === 'Cuti' ? 'Cuti' : 'Sakit');
        const waMessage = `*[Nuraga] Notifikasi ${typeLabel}*\n\n` +
            `Status: *${statusLabel}*\n` +
            `Tipe: ${typeLabel}\n` +
            `Periode: ${leave.start_date} s/d ${leave.end_date}\n` +
            `Alasan: ${leave.reason}\n\n` +
            `Silakan buka aplikasi untuk melihat detail lebih lanjut.`;

        if (leave.User && leave.User.no_whatsapp) {
            setImmediate(async () => {
                try {
                    await wa.sendMessage(leave.User.no_whatsapp, waMessage);
                    console.log(`[WhatsApp] Notifikasi ${typeLabel} ${status} dikirim ke ${leave.User.nama}`);
                } catch (waErr) {
                    console.error('[WhatsApp] Gagal mengirim notifikasi:', waErr.message);
                }
            });
        }

        // ━━━ Emit WebSocket notification ke User ━━━
        if (io) {
            io.emit('LEAVE_REQUEST_UPDATE', {
                id_leave: leave.id_leave,
                id_user: leave.id_user,
                status: status,
                type: leave.type,
                userName: leave.User ? leave.User.nama : 'Pekerja',
                start_date: leave.start_date,
                end_date: leave.end_date,
                updatedAt: leave.updatedAt,
                message: `Pengajuan ${leave.type} Anda telah ${status === 'Approved' ? 'Disetujui ✅' : 'Ditolak ❌'}`
            });
            console.log(`[WebSocket] Event LEAVE_REQUEST_UPDATE dipancarkan untuk user ${leave.id_user}`);
        }

        res.status(200).json({ 
            message: `Pengajuan berhasil di-${status}`, 
            data: leave 
        });
    } catch (error) {
        console.error('Error in approveLeave:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
