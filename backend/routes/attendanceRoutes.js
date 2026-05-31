const express = require('express');
const router = express.Router();
const multer = require('multer');
const { clockIn, clockOut, getTodayStatus, getMyHistory, getAllHistory, submitLeave, approveLeave } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

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

router.post('/clock-in', protect, handleUpload('foto_bukti'), clockIn);
router.post('/clock-out', protect, clockOut);
router.get('/today', protect, getTodayStatus);
router.get('/my-history', protect, getMyHistory);
router.get('/all', protect, authorize('Admin'), getAllHistory);

router.post('/leave', protect, handleUpload('document_proof'), submitLeave);
router.put('/leave/:id_leave', protect, authorize('Admin', 'Supervisor'), approveLeave);

module.exports = router;
