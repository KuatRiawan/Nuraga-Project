const { Op } = require('sequelize');
const WorkPermit = require('../models/WorkPermit');
const User = require('../models/User');
const { recordLog } = require('./logController');

const requestPermit = async (req, res) => {
    try {
        const permit = await WorkPermit.create({
            ...req.body,
            id_user: req.user.id,
            status: 'Pending'
        });

        await recordLog(req, 'REQUEST_PTW', `User ${req.user.nama} (${req.user.role}) mengajukan Izin Kerja (PTW) baru: ${permit.jenis_pekerjaan} di ${permit.lokasi_kerja}.`);
        res.status(201).json(permit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPermits = async (req, res) => {
    try {
        const queryOptions = {
            include: [
                { model: User, attributes: ['nama'], as: 'User' },
                { model: User, attributes: ['nama'], as: 'approver' }
            ],
            order: [['createdAt', 'DESC']]
        };

        // Operators and Contractors can only see their own permits.
        // Admins, HSE, Supervisors, and Managers can see all permits.
        if (req.user.role === 'Operator' || req.user.role === 'Kontraktor') {
            queryOptions.where = { id_user: req.user.id };
        }

        const permits = await WorkPermit.findAll(queryOptions);
        res.json(permits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const approvePermit = async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        const permit = await WorkPermit.findByPk(req.params.id);
        if (!permit) return res.status(404).json({ message: 'Permit not found' });

        if (status === 'Rejected') {
            permit.status = 'Rejected';
            await permit.save();
            await recordLog(req, 'REJECT_PTW', `${req.user.nama} (${req.user.role}) menolak Izin Kerja (PTW) #${permit.id_permit}.`);
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
            await recordLog(req, 'APPROVE_PTW_STEP1', `${req.user.nama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 1 (Supervisor).`);
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
            await recordLog(req, 'APPROVE_PTW_STEP2', `${req.user.nama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 2 (HSE).`);
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
            await recordLog(req, 'APPROVE_PTW_FINAL', `${req.user.nama} (${req.user.role}) menyetujui Izin Kerja (PTW) #${permit.id_permit} pada Tahap 3 (Final Approval). Status menjadi Approved.`);
            return res.json(permit);
        }

        return res.status(400).json({ message: 'This permit is already fully processed.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const closePermit = async (req, res) => {
    try {
        const permit = await WorkPermit.findByPk(req.params.id);
        if (!permit) return res.status(404).json({ message: 'Permit not found' });

        permit.status = 'Closed';
        permit.close_applicant_sig = req.body.close_applicant_sig !== false;
        permit.close_supervisor_sig = req.body.close_supervisor_sig !== false;
        permit.housekeeping_verified = req.body.housekeeping_verified !== false;
        permit.closedAt = new Date();

        await permit.save();
        await recordLog(req, 'CLOSE_PTW', `${req.user.nama} (${req.user.role}) menutup Izin Kerja (PTW) #${permit.id_permit}.`);
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
