const express = require('express');
const router = express.Router();
const { getMyVouchers, getAllVouchers, claimVoucher } = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/my', protect, getMyVouchers);
router.get('/all', protect, authorize('HSE', 'Admin'), getAllVouchers);
router.patch('/:id/claim', protect, authorize('HSE', 'Admin'), claimVoucher);

module.exports = router;
