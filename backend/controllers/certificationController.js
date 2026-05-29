const Certification = require('../models/Certification');
const User = require('../models/User');

const addCertification = async (req, res) => {
    try {
        const { id_user } = req.body;
        // If Admin, they can assign it to any user via id_user payload, otherwise default to self
        const targetUserId = (req.user.role === 'Admin' && id_user) ? id_user : req.user.id;
        
        const certification = await Certification.create({
            ...req.body,
            id_user: targetUserId
        });
        res.status(201).json(certification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyCertifications = async (req, res) => {
    try {
        const certs = await Certification.findAll({ where: { id_user: req.user.id } });
        res.json(certs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllCertifications = async (req, res) => {
    try {
        const certs = await Certification.findAll({
            include: [{ model: User, attributes: ['id_user', 'nama', 'role', 'no_whatsapp'] }]
        });
        res.json(certs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCertification = async (req, res) => {
    try {
        const cert = await Certification.findByPk(req.params.id);
        if (!cert) return res.status(404).json({ message: 'Sertifikasi tidak ditemukan' });

        await cert.update(req.body);
        res.json(cert);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCertification = async (req, res) => {
    try {
        const cert = await Certification.findByPk(req.params.id);
        if (!cert) return res.status(404).json({ message: 'Sertifikasi tidak ditemukan' });

        await cert.destroy();
        res.json({ message: 'Sertifikasi berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    addCertification, 
    getMyCertifications, 
    getAllCertifications, 
    updateCertification, 
    deleteCertification 
};
