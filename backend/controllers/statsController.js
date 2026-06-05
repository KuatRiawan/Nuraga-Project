const { Op } = require('sequelize');
const HazardReport = require('../models/HazardReport');
const IncidentReport = require('../models/IncidentReport');
const Audit = require('../models/Audit');
const CorrectiveAction = require('../models/CorrectiveAction');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

let cache = {
    stats: null,
    statsExpiry: 0,
    analytics: null,
    analyticsExpiry: 0,
    reportData: null,
    reportDataExpiry: 0,
};

const CACHE_TTL = 10000; // TTL 10 detik

const clearStatsCache = () => {
    cache.stats = null;
    cache.statsExpiry = 0;
    cache.analytics = null;
    cache.analyticsExpiry = 0;
    cache.reportData = null;
    cache.reportDataExpiry = 0;
    console.log('[Cache] Stats cache invalidated.');
};

const getDashboardStats = async (req, res) => {
    try {
        const now = Date.now();
        if (cache.stats && cache.statsExpiry > now) {
            return res.json(cache.stats);
        }

        const totalHazards = await HazardReport.count();
        const totalIncidents = await IncidentReport.count();
        const totalAudits = await Audit.count();
        const pendingActions = await CorrectiveAction.count({ where: { status: 'Open' } });

        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);
        
        const incidentsLastYear = await IncidentReport.count({
            where: { createdAt: { [Op.gte]: oneYearAgo } }
        });

        const activeUsersYear = await Attendance.findAll({
            where: { 
                type: 'Datang',
                createdAt: { [Op.gte]: oneYearAgo }
            },
            attributes: ['id_user'],
            group: ['id_user']
        });
        
        const numberOfWorkers = activeUsersYear.length || 1; // Hindari pembagian dengan nol
        const workingDaysYear = 260; // Sekitar 260 hari kerja per tahun
        const hoursPerDay = 8; // Standar hari kerja 8 jam
        const totalWorkHours = numberOfWorkers * workingDaysYear * hoursPerDay;

        const trir = incidentsLastYear > 0 ? (incidentsLastYear * 200000) / totalWorkHours : 0;

        const ltiRate = incidentsLastYear > 0 ? (incidentsLastYear * 200000) / totalWorkHours : 0;

        const statsData = {
            totalHazards,
            totalIncidents,
            totalAudits,
            pendingActions,
            trir: parseFloat(trir.toFixed(2)),
            ltiRate: parseFloat(ltiRate.toFixed(2)),
            totalWorkHours
        };

        cache.stats = statsData;
        cache.statsExpiry = now + CACHE_TTL;

        res.json(statsData);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMonthlyAnalytics = async (req, res) => {
    try {
        const now = Date.now();
        if (cache.analytics && cache.analyticsExpiry > now) {
            return res.json(cache.analytics);
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const hazards = await HazardReport.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            attributes: ['createdAt']
        });

        const incidents = await IncidentReport.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            attributes: ['createdAt']
        });

        const analytics = {};
        for (let i = 0; i <= 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            analytics[dateString] = { date: dateString, hazards: 0, incidents: 0 };
        }

        hazards.forEach(h => {
            const date = h.createdAt.toISOString().split('T')[0];
            if (analytics[date]) analytics[date].hazards++;
        });

        incidents.forEach(i => {
            const date = i.createdAt.toISOString().split('T')[0];
            if (analytics[date]) analytics[date].incidents++;
        });

        const analyticsData = Object.values(analytics);
        cache.analytics = analyticsData;
        cache.analyticsExpiry = now + CACHE_TTL;

        res.json(analyticsData);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getReportData = async (req, res) => {
    try {
        const now = Date.now();
        if (cache.reportData && cache.reportDataExpiry > now) {
            return res.json(cache.reportData);
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const hazards = await HazardReport.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            order: [['createdAt', 'DESC']]
        });

        const incidents = await IncidentReport.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            order: [['createdAt', 'DESC']]
        });

        const audits = await Audit.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            order: [['createdAt', 'DESC']]
        });

        const reportData = {
            summary: {
                hazards: hazards.length,
                incidents: incidents.length,
                audits: audits.length,
                period: 'Last 30 Days'
            },
            details: {
                hazards,
                incidents,
                audits
            }
        };

        cache.reportData = reportData;
        cache.reportDataExpiry = now + CACHE_TTL;

        res.json(reportData);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getDashboardStats, getMonthlyAnalytics, getReportData, clearStatsCache };


