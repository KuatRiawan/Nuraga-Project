const express = require('express');
const router = express.Router();
const { createHazard, getHazards, updateStatus, overrideRisk, verifyHazard } = require('../controllers/hazardController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.post('/', protect, upload.single('foto'), createHazard);
router.get('/', protect, getHazards);
router.patch('/:id/status', protect, authorize('HSE', 'Supervisor'), updateStatus);
router.patch('/:id/override', protect, authorize('HSE', 'Admin'), overrideRisk);
router.patch('/:id/verify', protect, authorize('HSE', 'Admin'), verifyHazard);

module.exports = router;
