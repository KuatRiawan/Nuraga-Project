const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const HazardReport = require('../models/HazardReport');
const { recordLog } = require('./logController');

/** Public self-registration: role is never taken from the client (C1). */
const PUBLIC_REGISTER_ROLE = 'Staff';

const register = async (req, res) => {
    try {
        const { nama, email, password, no_whatsapp, jenis_kelamin } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({
            nama,
            email,
            password,
            role: PUBLIC_REGISTER_ROLE,
            no_whatsapp,
            jenis_kelamin,
        });
        res.status(201).json({
            message: 'User registered successfully',
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user.id_user, role: user.role, nama: user.nama },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Record Audit Trail Log
        await recordLog(
            { user: { id: user.id_user, nama: user.nama, role: user.role }, headers: req.headers, ip: req.ip, socket: req.socket }, 
            'LOGIN', 
            `User ${user.nama} (${user.role}) berhasil masuk ke dalam sistem.`
        );

        res.json({
            token,
            user: {
                id: user.id_user,
                nama: user.nama,
                email: user.email,
                role: user.role,
                foto: user.foto,
                points: user.points,
                no_whatsapp: user.no_whatsapp,
                nik: user.nik,
                jabatan: user.jabatan,
                area_kerja: user.area_kerja,
                jenis_kelamin: user.jenis_kelamin,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }
        res.json({
            id: user.id_user,
            id_user: user.id_user,
            nama: user.nama,
            email: user.email,
            role: user.role,
            foto: user.foto,
            points: user.points,
            no_whatsapp: user.no_whatsapp,
            nik: user.nik,
            jabatan: user.jabatan,
            area_kerja: user.area_kerja,
            jenis_kelamin: user.jenis_kelamin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }
        // In a real app, send email with reset link. Here we just mock success.
        res.json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { email, no_whatsapp, jenis_kelamin } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        // === FIELD-LEVEL ACCESS CONTROL ===
        // Users can ONLY change: email, no_whatsapp, foto, jenis_kelamin
        // nama, nik, jabatan, area_kerja -> ADMIN ONLY (via /api/users/:id)
        if (email && email !== user.email) {
            const userExists = await User.findOne({ where: { email } });
            if (userExists) {
                return res.status(400).json({ message: 'Email sudah digunakan oleh user lain' });
            }
            user.email = email;
        }
        if (no_whatsapp !== undefined) user.no_whatsapp = no_whatsapp;
        if (jenis_kelamin !== undefined) user.jenis_kelamin = jenis_kelamin;
        if (req.file) {
            user.foto = req.file.filename;
        }

        await user.save();

        res.json({
            message: 'Profil berhasil diperbarui',
            user: {
                id: user.id_user,
                nama: user.nama,
                email: user.email,
                role: user.role,
                foto: user.foto,
                points: user.points,
                no_whatsapp: user.no_whatsapp,
                nik: user.nik,
                jabatan: user.jabatan,
                area_kerja: user.area_kerja,
                jenis_kelamin: user.jenis_kelamin,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/** Authenticated password change only — requires current password (C2). */
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, currentPassword } = req.body;
        const previousPassword = oldPassword ?? currentPassword;

        if (!previousPassword || !newPassword) {
            return res.status(400).json({
                message: 'oldPassword dan newPassword wajib diisi',
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'Password baru minimal 8 karakter',
            });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const isMatch = await bcrypt.compare(previousPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password lama salah' });
        }

        user.password = newPassword;
        await user.save();

        await recordLog(
            req,
            'CHANGE_PASSWORD',
            `User ${user.nama} mengubah password akun.`
        );

        res.json({ message: 'Password berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const redeemPoints = async (req, res) => {
    try {
        const { rewardId, rewardTitle, points } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }
        const REWARDS_CONFIG = [
            { id: 1, title: 'Voucer Makan Siang', points: 200, quota: 50 },
            { id: 2, title: 'Voucer Belanja Rp50K', points: 500, quota: 30 },
            { id: 3, title: 'Hari Libur Tambahan', points: 1000, quota: 5 },
            { id: 4, title: 'Merchandise K3 Premium', points: 750, quota: 15 },
        ];
        const rewardConfig = REWARDS_CONFIG.find(r => r.id === Number(rewardId));
        if (rewardConfig) {
            const count = await Voucher.count({
                where: { reward_id: rewardId }
            });
            if (count >= rewardConfig.quota) {
                return res.status(400).json({ message: 'Kuota penukaran untuk hadiah ini sudah habis!' });
            }
        }

        user.points -= points;
        await user.save();

        // Generate unique code, e.g. VCH-ABCD12
        const code = 'VCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const voucher = await Voucher.create({
            id_user: user.id_user,
            reward_id: rewardId,
            reward_title: rewardTitle || 'Hadiah Keamanan K3',
            points_spent: points,
            code: code,
            status: 'Pending'
        });

        res.json({
            message: 'Berhasil menukarkan poin',
            points: user.points,
            voucher
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id_user', 'nama', 'role', 'points'],
            order: [['points', 'DESC']]
        });
        
        const leaderboardData = [];
        for (const u of users) {
            const reportsCount = await HazardReport.count({
                where: {
                    id_user: u.id_user,
                    is_verified: true
                }
            });
            leaderboardData.push({
                name: u.nama,
                dept: u.role,
                points: u.points,
                reports: reportsCount,
                badge: u.points > 1000 ? 'Safety Champion' : u.points > 500 ? 'Hazard Hunter' : ''
            });
        }
        
        leaderboardData.sort((a, b) => b.points - a.points);
        res.json(leaderboardData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRewards = async (req, res) => {
    try {
        const REWARDS_CONFIG = [
            { id: 1, title: 'Voucer Makan Siang', points: 200, icon: '🍱', quota: 50 },
            { id: 2, title: 'Voucer Belanja Rp50K', points: 500, icon: '🛒', quota: 30 },
            { id: 3, title: 'Hari Libur Tambahan', points: 1000, icon: '🏖️', quota: 5 },
            { id: 4, title: 'Merchandise K3 Premium', points: 750, icon: '🎁', quota: 15 },
        ];

        const rewardsWithRemaining = [];
        for (const reward of REWARDS_CONFIG) {
            const count = await Voucher.count({
                where: { reward_id: reward.id }
            });
            const remaining = Math.max(0, reward.quota - count);
            rewardsWithRemaining.push({
                ...reward,
                remaining,
                available: remaining > 0
            });
        }
        res.json(rewardsWithRemaining);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    register,
    login,
    getMe,
    forgotPassword,
    updateProfile,
    changePassword,
    redeemPoints,
    getLeaderboard,
    getRewards,
};


