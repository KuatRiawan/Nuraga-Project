/**
 * whatsappRoutes.js
 * Routes for the WhatsApp Baileys integration panel.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getStatus, stream, logout, testMessage, manualReconnect } = require('../controllers/whatsappController');

// Rate limiter for SSE stream endpoint to prevent resource exhaustion (DoS)
const streamLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Max 5 stream connections per minute per IP
    message: { message: 'Terlalu banyak koneksi stream. Harap tunggu 1 menit.' }
});

// All WA management routes require Admin authentication
router.get('/status',  protect, authorize('Admin'), getStatus);
router.get('/stream',  protect, streamLimiter, stream);          // SSE — all authenticated users can listen (rate limited)
router.post('/logout', protect, authorize('Admin'), logout);
router.post('/reconnect', protect, authorize('Admin'), manualReconnect); // NEW: force reconnect
router.post('/test',   protect, authorize('Admin'), testMessage);

module.exports = router;
