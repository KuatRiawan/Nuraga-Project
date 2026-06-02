const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const HazardReport = require('../models/HazardReport');
const SystemConfig = require('../models/SystemConfig');
const { recordLog } = require('./logController');
const sequelize = require('../config/db');

/** Public self-registration: role is never taken from the client (C1). */
const PUBLIC_REGISTER_ROLE = 'Staff';

const register = async (req, res) => {
    try {
        const { nama, email, password, no_whatsapp, jenis_kelamin } = req.body;

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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

        // Generate access token (short-lived: 1 hour)
        const token = jwt.sign(
            { id: user.id_user, role: user.role, nama: user.nama },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate refresh token (long-lived: 7 days)
        const refreshToken = jwt.sign(
            { id: user.id_user, role: user.role, nama: user.nama },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Hash refresh token before storing in database (security fix)
        const salt = await bcrypt.genSalt(10);
        const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

        // Store hashed refresh token in database
        const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        user.refresh_token = hashedRefreshToken;
        user.refresh_token_expires = refreshTokenExpires;
        await user.save();

        // Record Audit Trail Log
        await recordLog(
            { user: { id: user.id_user, nama: user.nama, role: user.role }, headers: req.headers, ip: req.ip, socket: req.socket },
            'LOGIN',
            `User ${user.nama} (${user.role}) berhasil masuk ke dalam sistem.`
        );

        res.json({
            token,
            refreshToken,
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const redeemPoints = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { rewardId, rewardTitle, points } = req.body;
        const user = await User.findByPk(req.user.id, { transaction: t });
        if (!user) {
            await t.rollback();
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
                where: { reward_id: rewardId },
                transaction: t
            });
            if (count >= rewardConfig.quota) {
                await t.rollback();
                return res.status(400).json({ message: 'Kuota penukaran untuk hadiah ini sudah habis!' });
            }
        }

        user.points -= points;
        await user.save({ transaction: t });

        // Generate unique code, e.g. VCH-ABCD12
        const code = 'VCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const voucher = await Voucher.create({
            id_user: user.id_user,
            reward_id: rewardId,
            reward_title: rewardTitle || 'Hadiah Keamanan K3',
            points_spent: points,
            code: code,
            status: 'Pending'
        }, { transaction: t });

        await t.commit();
        res.json({
            message: 'Berhasil menukarkan poin',
            points: user.points,
            voucher
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const { Sequelize } = require('sequelize');

        // Single query with aggregation to get users and their verified report counts
        const users = await User.findAll({
            attributes: [
                'id_user',
                'nama',
                'role',
                'points',
                [Sequelize.fn('COUNT', Sequelize.col('HazardReports.id_hazard')), 'reportsCount']
            ],
            include: [{
                model: HazardReport,
                attributes: [],
                where: { is_verified: true },
                required: false
            }],
            group: ['User.id_user', 'User.nama', 'User.role', 'User.points'],
            order: [['points', 'DESC']]
        });

        const leaderboardData = users.map(u => ({
            name: u.nama,
            dept: u.role,
            points: u.points || 0,
            reports: parseInt(u.dataValues.reportsCount) || 0,
            badge: '' // Removed hardcoded badge logic
        }));

        res.json(leaderboardData);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getRewards = async (req, res) => {
    try {
        // Fetch REWARDS_CONFIG from SystemConfig database
        const rewardsConfig = await SystemConfig.findOne({ where: { key: 'rewards_config' } });

        if (!rewardsConfig) {
            // Return empty array if no rewards config in database
            res.json([]);
            return;
        }

        let REWARDS_CONFIG;
        try {
            REWARDS_CONFIG = JSON.parse(rewardsConfig.value);
        } catch (parseError) {
            console.error('Failed to parse rewards_config from database:', parseError);
            res.json([]);
            return;
        }

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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id_user || req.user.id;

        // Count rewards claimed (vouchers)
        const rewardsClaimed = await Voucher.count({
            where: { id_user: userId }
        });

        // Count hazards reported
        const hazardsReported = await HazardReport.count({
            where: { id_user: userId }
        });

        res.json({
            rewardsClaimed,
            hazardsReported
        });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        // Find user with this refresh token
        const user = await User.findOne({ where: { id_user: decoded.id } });

        if (!user || !user.refresh_token) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Compare provided refresh token with hashed token in database
        const isMatch = await bcrypt.compare(refreshToken, user.refresh_token);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Check if refresh token is expired
        if (user.refresh_token_expires && new Date() > new Date(user.refresh_token_expires)) {
            return res.status(401).json({ message: 'Refresh token expired' });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { id: user.id_user, role: user.role, nama: user.nama },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate new refresh token (rotate refresh token for security)
        const newRefreshToken = jwt.sign(
            { id: user.id_user, role: user.role, nama: user.nama },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Hash new refresh token before storing in database (security fix)
        const salt = await bcrypt.genSalt(10);
        const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, salt);

        // Update hashed refresh token in database
        const newRefreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        user.refresh_token = hashedNewRefreshToken;
        user.refresh_token_expires = newRefreshTokenExpires;
        await user.save();

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error('[Internal] Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token expired' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user.id_user || req.user.id;

        // Clear refresh token from database
        const user = await User.findByPk(userId);
        if (user) {
            user.refresh_token = null;
            user.refresh_token_expires = null;
            await user.save();
        }

        // Record Audit Trail Log
        await recordLog(
            req,
            'LOGOUT',
            `User ${user?.nama} (${user?.role}) berhasil keluar dari sistem.`
        );

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getMe,
    // forgotPassword, // Removed for security (H10) - mock endpoint disabled
    updateProfile,
    changePassword,
    redeemPoints,
    getLeaderboard,
    getRewards,
    getUserStats,
    refreshToken,
    logout,
};


