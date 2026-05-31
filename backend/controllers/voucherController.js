const Voucher = require('../models/Voucher');
const User = require('../models/User');

const getMyVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.findAll({
            where: { id_user: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(vouchers);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.findAll({
            include: [{ model: User, attributes: ['id_user', 'nama', 'role', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(vouchers);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const claimVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByPk(req.params.id);
        if (!voucher) return res.status(404).json({ message: 'Voucher tidak ditemukan' });

        voucher.status = 'Claimed';
        voucher.claimedAt = new Date();
        await voucher.save();
        res.json(voucher);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getMyVouchers, getAllVouchers, claimVoucher };
