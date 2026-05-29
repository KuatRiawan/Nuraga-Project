const SystemConfig = require('../models/SystemConfig');
const { recordLog } = require('./logController');

const getConfig = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        const configs = await SystemConfig.findAll();
        const configMap = {};
        configs.forEach(c => {
            configMap[c.key] = c.value;
        });

        res.json(configMap);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateConfig = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        const payload = req.body; // e.g. { whatsapp_gateway_number: '+62...', ... }

        for (const [key, value] of Object.entries(payload)) {
            await SystemConfig.upsert({
                key,
                value: String(value)
            });
        }

        await recordLog(req, 'UPDATE_CONFIG', `Admin memperbarui konfigurasi integrasi sistem: ${Object.keys(payload).join(', ')}`);

        res.json({ message: 'Konfigurasi berhasil disimpan.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getConfig, updateConfig };
