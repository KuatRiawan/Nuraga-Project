const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { clockIn, clockOut, getTodayStatus, getMyHistory, getAllHistory, submitLeave, approveLeave } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rate limiters for attendance endpoints
const clockInLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { message: 'Terlalu banyak percobaan clock-in. Harap tunggu 1 menit.' }
});

const sosLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { message: 'Terlalu banyak permintaan darurat. Harap tunggu 1 menit.' }
});

// Wrap multer upload to return clean JSON errors instead of HTML
const handleUpload = (field) => (req, res, next) => {
    upload.single(field)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message || 'File upload gagal.' });
        }
        next();
    });
};

router.post('/clock-in', protect, clockInLimiter, handleUpload('foto_bukti'), clockIn);
router.post('/clock-out', protect, clockOut);
router.get('/today', protect, getTodayStatus);
router.get('/my-history', protect, getMyHistory);
router.get('/all', protect, authorize('Admin'), getAllHistory);

router.post('/leave', protect, handleUpload('document_proof'), submitLeave);
router.put('/leave/:id_leave', protect, authorize('Admin', 'Supervisor'), approveLeave);

module.exports = router;
