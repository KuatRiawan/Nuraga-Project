const express = require('express');
const router = express.Router();
const { triggerEmergency, getEmergencies, registerSseClient } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/', protect, triggerEmergency);
router.get('/', protect, authorize('Admin', 'HSE', 'Supervisor', 'Manager'), getEmergencies);
router.get('/stream', protect, registerSseClient);

module.exports = router;
