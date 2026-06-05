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

        const payload = req.body; // contoh: { whatsapp_gateway_number: '+62...', ... }

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

const getChecklistTemplates = async (req, res) => {
    try {
        const checklistConfig = await SystemConfig.findOne({ where: { key: 'checklist_templates' } });
        let templates = {
            'APAR': ['Tabung tidak berkarat', 'Segel dalam kondisi baik', 'Penunjuk tekanan pada posisi hijau', 'Label inspeksi terbaru', 'Akses tidak terhalang'],
            'Perancah': ['Kaki perancah terkunci', 'Papan lantai tidak patah', 'Pagar pengaman terpasang', 'Beban tidak melebihi kapasitas'],
            'Forklift': ['Rem berfungsi normal', 'Lampu peringatan hidup', 'Klakson berfungsi', 'Fork tidak bengkok', 'Sabuk pengaman ada'],
            'APD': ['Helm dalam kondisi baik', 'Sepatu safety utuh', 'Rompi safety tersedia', 'Kacamata pelindung bersih', 'Sarung tangan tidak sobek'],
            'Listrik': ['Kabel tidak terkelupas', 'Stopkontak terpasang benar', 'Label tegangan jelas', 'Grounding terpasang', 'Panel terkunci']
        };

        if (checklistConfig) {
            try {
                templates = JSON.parse(checklistConfig.value);
            } catch (parseError) {
                console.warn('Failed to parse checklist_templates from database, using fallback');
            }
        }

        res.json(templates);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getConfig, updateConfig, getChecklistTemplates };
