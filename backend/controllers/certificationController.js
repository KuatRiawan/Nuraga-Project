const Certification = require('../models/Certification');
const User = require('../models/User');

const addCertification = async (req, res) => {
    try {
        const { id_user, nama_sertifikasi, penerbit, tanggal_terbit, tanggal_kadaluarsa } = req.body;
        // If Admin, they can assign it to any user via id_user payload, otherwise default to self
        const targetUserId = (req.user.role === 'Admin' && id_user) ? id_user : req.user.id;
        
        const certification = await Certification.create({
            nama_sertifikasi,
            penerbit,
            tanggal_terbit,
            tanggal_kadaluarsa,
            id_user: targetUserId
        });
        res.status(201).json(certification);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMyCertifications = async (req, res) => {
    try {
        const certs = await Certification.findAll({ where: { id_user: req.user.id } });
        res.json(certs);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAllCertifications = async (req, res) => {
    try {
        const certs = await Certification.findAll({
            include: [{ model: User, attributes: ['id_user', 'nama', 'role', 'no_whatsapp'] }]
        });
        res.json(certs);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateCertification = async (req, res) => {
    try {
        const { nama_sertifikasi, penerbit, tanggal_terbit, tanggal_kadaluarsa } = req.body;
        const cert = await Certification.findByPk(req.params.id);
        if (!cert) return res.status(404).json({ message: 'Sertifikasi tidak ditemukan' });

        if (nama_sertifikasi !== undefined) cert.nama_sertifikasi = nama_sertifikasi;
        if (penerbit !== undefined) cert.penerbit = penerbit;
        if (tanggal_terbit !== undefined) cert.tanggal_terbit = tanggal_terbit;
        if (tanggal_kadaluarsa !== undefined) cert.tanggal_kadaluarsa = tanggal_kadaluarsa;
        
        await cert.save();
        res.json(cert);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteCertification = async (req, res) => {
    try {
        const cert = await Certification.findByPk(req.params.id);
        if (!cert) return res.status(404).json({ message: 'Sertifikasi tidak ditemukan' });

        await cert.destroy();
        res.json({ message: 'Sertifikasi berhasil dihapus' });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { 
    addCertification, 
    getMyCertifications, 
    getAllCertifications, 
    updateCertification, 
    deleteCertification 
};
