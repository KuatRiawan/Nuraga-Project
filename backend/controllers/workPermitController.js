const { Op } = require('sequelize');
const WorkPermit = require('../models/WorkPermit');
const User = require('../models/User');
const { recordLog } = require('./logController');
const wa = require('../services/whatsappService');

// Helper: send WA if user has a phone number stored
const notifyUser = async (user, message) => {
    if (user && user.no_whatsapp) {
        await wa.sendMessage(user.no_whatsapp, message);
    }
};

// Helper: notify all users of given roles
const notifyRoles = async (roles, message) => {
    try {
        const users = await User.findAll({ where: { role: roles } });
        for (const u of users) {
            if (u.no_whatsapp) await wa.sendMessage(u.no_whatsapp, message);
        }
    } catch (err) {
        console.error('[WA Notify] Failed to notify roles:', err.message);
    }
};

const requestPermit = async (req, res) => {
    try {
        const io = req.app.get('io');
        const permit = await WorkPermit.create({
            ...req.body,
            id_user: req.user.id,
            status: 'Pending'
        });

        const requester = await User.findByPk(req.user.id);
        const requesterNama = req.user.nama || (requester ? requester.nama : 'Pekerja');

        await recordLog(req, 'REQUEST_PTW', `User ${requesterNama} (${req.user.role}) mengajukan Izin Kerja (PTW) baru: ${permit.jenis_permit} di ${permit.lokasi}.`);

        if (io) {
            io.emit('PTW_REQUEST_CREATED', {
                id_permit: permit.id_permit,
                id_user: permit.id_user,
                requesterName: requesterNama,
                jenis_permit: permit.jenis_permit,
                lokasi: permit.lokasi,
                status: permit.status,
                approval_step: permit.approval_step,
                createdAt: permit.createdAt,
                message: `Pengajuan e-PTW baru dari ${requesterNama}`
            });
        }

        // WA: notify supervisors about new PTW request
        setImmediate(() => {
            notifyRoles(['Supervisor', 'Admin'],
                `📋 *[NURAGA SAFETY — Pengajuan PTW Baru]*\n\n` +
                `Pemohon: *${requesterNama}* (${req.user.role})\n` +
                `Jenis Pekerjaan: ${permit.jenis_permit}\n` +
                `Lokasi: ${permit.lokasi}\n` +
                `Status: Menunggu persetujuan Supervisor\n\n` +
                `Silakan review di sistem Nuraga Safety.`
            );
        });

        res.status(201).json(permit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPermits = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const queryOptions = {
            include: [
                { model: User, attributes: ['nama'], as: 'User' },
                { model: User, attributes: ['nama'], as: 'approver' }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        };

        // Staff and Vendors can only see their own permits.
        // Admins, HSE, Supervisors, and Managers can see all permits.
        if (req.user.role === 'Staff' || req.user.role === 'Vendor') {
            queryOptions.where = { id_user: req.user.id };
        }

        const results = await WorkPermit.findAndCountAll(queryOptions);
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


const approvePermit = async (req, res) => {
    try {
        const io = req.app.get('io');
        const { status } = req.body; // 'Approved' or 'Rejected'
        const permit = await WorkPermit.findByPk(req.params.id);
        if (!permit) return res.status(404).json({ message: 'Permit not found' });

        const approver = await User.findByPk(req.user.id);
        const approverNama = req.user.nama || (approver ? approver.nama : 'Pekerja');
        const emitPermitUpdate = (message, nextApproverRoles = []) => {
            if (!io) return;
            io.emit('PTW_STATUS_UPDATE', {
                id_permit: permit.id_permit,
                id_user: permit.id_user,
                jenis_permit: permit.jenis_permit,
                lokasi: permit.lokasi,
                status: permit.status,
                approval_step: permit.approval_step,
                approverName: approverNama,
                approverRole: req.user.role,
                nextApproverRoles,
                updatedAt: permit.updatedAt,
                message
            });
        };

        if (status === 'Rejected') {
            permit.status = 'Rejected';
            await permit.save();
            await recordLog(req, 'REJECT_PTW', `${approverNama} (${req.user.role}) menolak Izin Kerja (PTW) #${permit.id_permit}.`);
            emitPermitUpdate(`e-PTW #${permit.id_permit} ditolak oleh ${approverNama}`);

            // WA: notify the requester about rejection
            const requester = await User.findByPk(permit.id_user);
            setImmediate(() => {
                notifyUser(requester,
                    `❌ *[NURAGA SAFETY — PTW Ditolak]*\n\n` +
                    `PTW #${permit.id_permit} Anda ditolak oleh *${approverNama}* (${req.user.role}).\n` +
                    `Jenis Pekerjaan: ${permit.jenis_permit}\n` +
                    `Lokasi: ${permit.lokasi}\n\n` +
                    `Silakan hubungi atasan Anda untuk informasi lebih lanjut.`
                ).catch((err) => console.error('[WA Notify] Failed to notify PTW requester:', err.message));
            });

            return res.json(permit);
        }

        const userRole = req.user.role;

        // Step 1: Wait for Supervisor (SPV)
        if (permit.approval_step === 1) {
            if (userRole !== 'Supervisor' && userRole !== 'Admin') {
                return res.status(403).json({ message: 'Only Supervisor can approve this step.' });
            }
            permit.supervisor_sig = true;
            permit.supervisor_approved_at = new Date();
            permit.approval_step = 2;
            await permit.save();
            await recordLog(req, 'APPROVE_PTW_STEP1', `${approverNama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 1 (Supervisor).`);
            emitPermitUpdate(`e-PTW #${permit.id_permit} disetujui Supervisor dan menunggu HSE`, ['HSE', 'Admin']);

            // WA: notify HSE about step 1 completion
            setImmediate(() => {
                notifyRoles(['HSE', 'Admin'],
                    `✅ *[NURAGA SAFETY — PTW Disetujui Supervisor]*\n\n` +
                    `PTW #${permit.id_permit} telah disetujui oleh *${approverNama}* (Supervisor).\n` +
                    `Jenis Pekerjaan: ${permit.jenis_permit}\n` +
                    `Lokasi: ${permit.lokasi}\n` +
                    `Status: Menunggu persetujuan HSE Officer.`
                );
            });
            // Notify requester
            const req1 = await User.findByPk(permit.id_user);
            setImmediate(() => {
                notifyUser(req1,
                    `✅ *[NURAGA SAFETY — PTW Tahap 1 Disetujui]*\n\n` +
                    `PTW #${permit.id_permit} Anda telah disetujui oleh Supervisor.\n` +
                    `Status berikutnya: Menunggu persetujuan HSE Officer.`
                ).catch((err) => console.error('[WA Notify] Failed to notify PTW requester:', err.message));
            });

            return res.json(permit);
        }

        // Step 2: Wait for HSE
        if (permit.approval_step === 2) {
            if (userRole !== 'HSE' && userRole !== 'Admin') {
                return res.status(403).json({ message: 'Only HSE Officer can approve this step.' });
            }
            permit.safety_officer_sig = true;
            permit.safety_officer_approved_at = new Date();
            permit.approval_step = 3;
            await permit.save();
            await recordLog(req, 'APPROVE_PTW_STEP2', `${approverNama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 2 (HSE).`);
            emitPermitUpdate(`e-PTW #${permit.id_permit} disetujui HSE dan menunggu Manager`, ['Manager', 'Admin']);

            // WA: notify Manager about step 2 completion
            setImmediate(() => {
                notifyRoles(['Manager', 'Admin'],
                    `✅ *[NURAGA SAFETY — PTW Disetujui HSE]*\n\n` +
                    `PTW #${permit.id_permit} telah disetujui oleh *${approverNama}* (HSE Officer).\n` +
                    `Jenis Pekerjaan: ${permit.jenis_permit}\n` +
                    `Lokasi: ${permit.lokasi}\n` +
                    `Status: Menunggu persetujuan final Manager.`
                );
            });
            // Notify requester
            const req2 = await User.findByPk(permit.id_user);
            setImmediate(() => {
                notifyUser(req2,
                    `✅ *[NURAGA SAFETY — PTW Tahap 2 Disetujui]*\n\n` +
                    `PTW #${permit.id_permit} Anda telah disetujui oleh HSE Officer.\n` +
                    `Status berikutnya: Menunggu persetujuan final Manager.`
                ).catch((err) => console.error('[WA Notify] Failed to notify PTW requester:', err.message));
            });

            return res.json(permit);
        }

        // Step 3: Wait for Manager
        if (permit.approval_step === 3) {
            if (userRole !== 'Manager' && userRole !== 'Admin') {
                return res.status(403).json({ message: 'Only Manager can approve this step.' });
            }
            permit.approver_sig = true;
            permit.manager_approved_at = new Date();
            permit.approval_step = 4;
            permit.status = 'Approved';
            permit.approved_by = req.user.id;
            await permit.save();
            await recordLog(req, 'APPROVE_PTW_FINAL', `${approverNama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 3 (Final Approval). Status menjadi Approved.`);
            emitPermitUpdate(`e-PTW #${permit.id_permit} disetujui penuh oleh Manager`);

            // WA: notify requester — PTW fully approved!
            const req3 = await User.findByPk(permit.id_user);
            setImmediate(() => {
                notifyUser(req3,
                    `🎉 *[NURAGA SAFETY — PTW DISETUJUI PENUH]*\n\n` +
                    `PTW #${permit.id_permit} Anda telah mendapat persetujuan penuh dari Manager.\n` +
                    `Jenis Pekerjaan: ${permit.jenis_permit}\n` +
                    `Lokasi: ${permit.lokasi}\n` +
                    `Waktu Berlaku: s/d ${new Date(permit.waktu_selesai).toLocaleString('id-ID')}\n\n` +
                    `⚠️ Pastikan semua prosedur K3 dipatuhi selama pekerjaan berlangsung.`
                ).catch((err) => console.error('[WA Notify] Failed to notify PTW requester:', err.message));
            });

            return res.json(permit);
        }

        return res.status(400).json({ message: 'This permit is already fully processed.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const closePermit = async (req, res) => {
    try {
        const io = req.app.get('io');
        const permit = await WorkPermit.findByPk(req.params.id);
        if (!permit) return res.status(404).json({ message: 'Permit not found' });

        permit.status = 'Closed';
        permit.close_applicant_sig = req.body.close_applicant_sig !== false;
        permit.close_supervisor_sig = req.body.close_supervisor_sig !== false;
        permit.housekeeping_verified = req.body.housekeeping_verified !== false;
        permit.closedAt = new Date();

        await permit.save();
        const closer = await User.findByPk(req.user.id);
        const closerNama = req.user.nama || (closer ? closer.nama : 'Pekerja');
        await recordLog(req, 'CLOSE_PTW', `${closerNama} (${req.user.role}) menutup Izin Kerja (PTW) #${permit.id_permit}.`);
        if (io) {
            io.emit('PTW_STATUS_UPDATE', {
                id_permit: permit.id_permit,
                id_user: permit.id_user,
                jenis_permit: permit.jenis_permit,
                lokasi: permit.lokasi,
                status: permit.status,
                approval_step: permit.approval_step,
                approverName: closerNama,
                approverRole: req.user.role,
                nextApproverRoles: [],
                updatedAt: permit.updatedAt,
                message: `e-PTW #${permit.id_permit} telah ditutup oleh ${closerNama}`
            });
        }
        res.json(permit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const autoExpirePermits = async () => {
    try {
        const now = new Date();
        const [affectedCount] = await WorkPermit.update(
            { status: 'Expired' },
            {
                where: {
                    status: { [Op.in]: ['Approved', 'Active', 'Pending'] },
                    waktu_selesai: { [Op.lt]: now }
                }
            }
        );
        if (affectedCount > 0) {
            console.log(`[Scheduler] Auto-expired ${affectedCount} permits past their selesai time (${now.toISOString()}).`);
        }
    } catch (error) {
        console.error('[Scheduler] Error in autoExpirePermits:', error);
    }
};

module.exports = { requestPermit, getPermits, approvePermit, closePermit, autoExpirePermits };
