/**
 * whatsappRoutes.js
 * Routes for the WhatsApp Baileys integration panel.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getStatus, stream, logout, testMessage, manualReconnect } = require('../controllers/whatsappController');

router.get('/status', protect, authorize('Admin'), getStatus);
router.get('/stream', stream);          // SSE — uses token validation in controller (no rate limit to prevent blocking)
router.post('/logout', protect, authorize('Admin'), logout);
router.post('/reconnect', protect, authorize('Admin'), manualReconnect); // sambung ulang paksa
router.post('/test', protect, authorize('Admin'), testMessage);

module.exports = router;
