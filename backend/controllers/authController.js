const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const { recordLog } = require('./logController');

const register = async (req, res) => {
    try {
        const { nama, email, password, role, no_whatsapp, jenis_kelamin } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({ nama, email, password, role, no_whatsapp, jenis_kelamin });
        res.status(201).json({ message: 'User registered successfully' });
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

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password (Model will hash it in beforeUpdate hook)
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
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

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password saat ini salah' });
        }

        user.password = newPassword;
        await user.save();

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
        if (user.points < points) {
            return res.status(400).json({ message: 'Poin tidak mencukupi' });
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

module.exports = { register, login, getMe, forgotPassword, resetPassword, updateProfile, changePassword, redeemPoints };


