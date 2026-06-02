const CorrectiveAction = require('../models/CorrectiveAction');
const HazardReport = require('../models/HazardReport');
const User = require('../models/User');
const { clearStatsCache } = require('./statsController');

const createAction = async (req, res) => {
    try {
        const { id_hazard, assigned_to, deadline, description } = req.body;
        const action = await CorrectiveAction.create({
            id_hazard,
            assigned_to,
            deadline,
            description,
        });
        clearStatsCache();

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('ACTION_CREATED', {
                id: action.id_action,
                id_hazard: action.id_hazard,
                assigned_to: action.assigned_to,
                deadline: action.deadline,
                description: action.description,
                status: action.status,
                createdBy: req.user.nama,
                createdByRole: req.user.role,
                createdAt: action.createdAt
            });
        }

        res.status(201).json(action);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getActions = async (req, res) => {
    try {
        const actions = await CorrectiveAction.findAll({
            include: [
                { model: HazardReport, attributes: ['lokasi', 'deskripsi', 'risiko'] },
                { model: User, as: 'assignee', attributes: ['nama'] }
            ],
            order: [['deadline', 'ASC']],
        });
        res.json(actions);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateActionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const action = await CorrectiveAction.findByPk(req.params.id);
        if (!action) return res.status(404).json({ message: 'Action not found' });

        action.status = status;
        await action.save();
        clearStatsCache();

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('ACTION_UPDATED', {
                id: action.id_action,
                id_hazard: action.id_hazard,
                assigned_to: action.assigned_to,
                deadline: action.deadline,
                description: action.description,
                status: action.status,
                updatedBy: req.user.nama,
                updatedByRole: req.user.role,
                updatedAt: action.updatedAt
            });
        }

        res.json(action);
    } catch (error) {
        console.error('[Internal] Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { createAction, getActions, updateActionStatus };

