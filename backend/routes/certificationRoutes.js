const express = require('express');
const router = express.Router();
const { addCertification, getMyCertifications, getAllCertifications, updateCertification, deleteCertification } = require('../controllers/certificationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/', protect, authorize('Admin'), addCertification);
router.get('/my', protect, getMyCertifications);
router.get('/all', protect, authorize('Admin', 'HSE', 'Manager', 'Supervisor'), getAllCertifications);
router.put('/:id', protect, authorize('Admin'), updateCertification);
router.delete('/:id', protect, authorize('Admin'), deleteCertification);

module.exports = router;
