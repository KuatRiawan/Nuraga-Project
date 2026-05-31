const { Op } = require('sequelize');
const HazardReport = require('../models/HazardReport');
const IncidentReport = require('../models/IncidentReport');
const Audit = require('../models/Audit');
const CorrectiveAction = require('../models/CorrectiveAction');

// Simple In-memory Cache
let cache = {
    stats: null,
    statsExpiry: 0,
    analytics: null,
    analyticsExpiry: 0,
    reportData: null,
    reportDataExpiry: 0,
};

const CACHE_TTL = 10000; // 10 seconds TTL

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

        const statsData = {
            totalHazards,
            totalIncidents,
            totalAudits,
            pendingActions,
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

        // Group by date (simple implementation)
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

        // Limit columns to avoid loading long text fields (deskripsi, five_whys, kronologi, etc.)
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


