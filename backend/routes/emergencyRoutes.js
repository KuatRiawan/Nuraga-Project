const express = require('express');
const router = express.Router();
const { triggerEmergency, getEmergencies, resolveEmergency } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/', protect, triggerEmergency);
router.patch('/:id/resolve', protect, authorize('Admin', 'HSE', 'Manager'), resolveEmergency);
router.get('/', protect, authorize('Admin', 'HSE', 'Supervisor', 'Manager'), getEmergencies);


module.exports = router;
