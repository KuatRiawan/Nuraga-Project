const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { triggerEmergency, getEmergencies, resolveEmergency } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Rate limiter for SOS emergency endpoint
const sosLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { message: 'Terlalu banyak permintaan darurat. Harap tunggu 1 menit.' }
});

router.post('/', protect, sosLimiter, triggerEmergency);
router.patch('/:id/resolve', protect, authorize('Admin', 'HSE', 'Manager'), resolveEmergency);
router.get('/', protect, authorize('Admin', 'HSE', 'Supervisor', 'Manager'), getEmergencies);


module.exports = router;
