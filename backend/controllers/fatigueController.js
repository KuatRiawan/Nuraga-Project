const axios = require('axios');
const FatigueLog = require('../models/FatigueLog');
const User = require('../models/User');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.logFatigue = async (req, res) => {
    try {
        const { sleep_hours, stress_level } = req.body;
        const id_user = req.user.id; 

        // 1. Call AI Service to get prediction
        let aiPrediction;
        try {
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict-fatigue`, {
                sleep_hours,
                stress_level
            }, { timeout: 5000 });
            aiPrediction = aiResponse.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.error("AI Service Timeout:", error.message);
                return res.status(503).json({ message: "Layanan AI sedang sibuk" });
            } else {
                console.error("AI Service Error:", error.message);
                return res.status(503).json({ message: "AI Service unavailable. Failed to analyze fatigue." });
            }
        }

        // 2. Save to database
        const fatigueLog = await FatigueLog.create({
            id_user,
            sleep_hours,
            stress_level,
            fatigue_status: aiPrediction.fatigue_status,
            recommendation: aiPrediction.recommendation
        });

        res.status(201).json({
            message: "Fatigue log saved successfully",
            data: fatigueLog
        });
    } catch (error) {
        console.error("Error in logFatigue:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getFatigueHistory = async (req, res) => {
    try {
        const id_user = req.user.id;
        const history = await FatigueLog.findAll({
            where: { id_user },
            order: [['createdAt', 'DESC']],
            limit: 30
        });

        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching fatigue history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
