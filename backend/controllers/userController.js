const User = require('../models/User');
const { recordLog } = require('./logController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Atau 'bcrypt' (tergantung package yang kamu pakai)

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createUser = async (req, res) => {
    try {
        const { nama, email, password, role, nik, jabatan, area_kerja, no_whatsapp, jenis_kelamin } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const user = await User.create({ nama, email, password, role, nik, jabatan, area_kerja, no_whatsapp, jenis_kelamin });
        const userResponse = user.toJSON();
        delete userResponse.password;

        const pembuat = req.user ? 'Admin' : 'Sistem (Setup Pertama)';
        await recordLog(req, 'CREATE_USER', `${pembuat} mendaftarkan user baru: ${nama} (${email}) dengan peran ${role}.`);
        
        res.status(201).json(userResponse);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { nama, email, password, role, nik, jabatan, area_kerja, no_whatsapp, jenis_kelamin } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            user.email = email;
        }

        if (nama) user.nama = nama;
        if (role) user.role = role;
        if (password) user.password = password; 

        if (nik !== undefined) user.nik = nik;
        if (jabatan !== undefined) user.jabatan = jabatan;
        if (area_kerja !== undefined) user.area_kerja = area_kerja;
        if (no_whatsapp !== undefined) user.no_whatsapp = no_whatsapp;
        if (jenis_kelamin !== undefined) user.jenis_kelamin = jenis_kelamin;

        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.password;
        await recordLog(req, 'UPDATE_USER', `Admin memperbarui data user: ${user.nama} (${user.email}).`);
        res.json(userResponse);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user && parseInt(req.params.id, 10) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }

        const deletedUserName = user.nama;
        const deletedUserEmail = user.email;
        await user.destroy();
        await recordLog(req, 'DELETE_USER', `Admin menghapus user: ${deletedUserName} (${deletedUserEmail}).`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        const token = jwt.sign(
            { id: user.id_user || user.id, role: user.role }, 
            process.env.JWT_SECRET || 'rahasia_nuraga_k3',
            { expiresIn: '1d' }
        );

        req.user = { id: user.id_user || user.id, nama: user.nama, email: user.email };
        await recordLog(req, 'LOGIN', `User ${user.nama} (${user.email}) berhasil login.`);
        
        res.json({
            message: 'Login berhasil',
            user: {
                id: user.id_user || user.id,
                nama: user.nama,
                email: user.email,
                role: user.role,
                area_kerja: user.area_kerja
            },
            token
        });

    } catch (error) {
        console.error('[Internal] Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    loginUser
};