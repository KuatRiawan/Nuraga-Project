const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const analyzeRisk = async (req, res) => {
    try {
        const { deskripsi, lokasi } = req.body;

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict-risk`, {
            description: deskripsi,
            location: lokasi
        });

        const data = aiResponse.data || {};

        res.json({
            predicted_risk: data.predicted_risk || 'Unknown',
            confidence: typeof data.confidence === 'number' ? data.confidence : 0,
            recommendation: data.recommendation || 'Manual review required.'
        });
    } catch (error) {
        console.error('AI analyze failed:', error.message, error.response?.data || 'No response data');
        res.json({
            predicted_risk: 'Unknown',
            confidence: 0,
            recommendation: 'AI service tidak tersedia, silakan tinjau secara manual.'
        });
    }
};

module.exports = { analyzeRisk };
