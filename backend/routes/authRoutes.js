const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, forgotPassword, updateProfile, changePassword, redeemPoints, getLeaderboard, getRewards } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 requests per minute
    message: { message: 'Terlalu banyak percobaan login. Harap tunggu 1 menit.' }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { message: 'Terlalu banyak percobaan registrasi. Harap tunggu 1 menit.' }
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
// Mock forgot password endpoint removed for security (H10)
// router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('foto'), updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/redeem', protect, redeemPoints);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/rewards', protect, getRewards);

module.exports = router;
