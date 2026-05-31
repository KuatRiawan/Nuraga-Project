const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, updateProfile, changePassword, redeemPoints, getLeaderboard, getRewards } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('foto'), updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/redeem', protect, redeemPoints);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/rewards', protect, getRewards);

module.exports = router;
