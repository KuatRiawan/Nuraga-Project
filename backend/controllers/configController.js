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
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateConfig = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        const payload = req.body; // e.g. { whatsapp_gateway_number: '+62...', ... }

        // Whitelist of allowed config keys to prevent injection attacks
        const ALLOWED_KEYS = [
            'whatsapp_gateway_number',
            'whatsapp_api_key',
            'ai_fastapi_endpoint',
            'open_meteo_endpoint'
        ];

        for (const [key, value] of Object.entries(payload)) {
            if (!ALLOWED_KEYS.includes(key)) {
                return res.status(400).json({ message: `Konfigurasi key '${key}' tidak diizinkan.` });
            }
            await SystemConfig.upsert({
                key,
                value: String(value)
            });
        }

        await recordLog(req, 'UPDATE_CONFIG', `Admin memperbarui konfigurasi integrasi sistem: ${Object.keys(payload).join(', ')}`);

        res.json({ message: 'Konfigurasi berhasil disimpan.' });
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getConfig, updateConfig };
