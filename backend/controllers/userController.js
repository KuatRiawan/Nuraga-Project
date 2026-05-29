const User = require('../models/User');
const { recordLog } = require('./logController');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { nama, email, password, role } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({ nama, email, password, role });
        const userResponse = user.toJSON();
        delete userResponse.password;
        await recordLog(req, 'CREATE_USER', `Admin mendaftarkan user baru: ${nama} (${email}) dengan peran ${role}.`);
        res.status(201).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { nama, email, password, role, nik, jabatan, area_kerja } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If email is changed, verify it doesn't collide
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            user.email = email;
        }

        if (nama) user.nama = nama;
        if (role) user.role = role;
        if (password) user.password = password; // automatically hashed via beforeUpdate hook

        // === ADMIN-ONLY OPERATIONAL FIELDS ===
        if (nik !== undefined) user.nik = nik;
        if (jabatan !== undefined) user.jabatan = jabatan;
        if (area_kerja !== undefined) user.area_kerja = area_kerja;

        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.password;
        await recordLog(req, 'UPDATE_USER', `Admin memperbarui data user: ${user.nama} (${user.email}).`);
        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent self-deletion
        if (parseInt(req.params.id, 10) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }

        const deletedUserName = user.nama;
        const deletedUserEmail = user.email;
        await user.destroy();
        await recordLog(req, 'DELETE_USER', `Admin menghapus user: ${deletedUserName} (${deletedUserEmail}).`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};
