/**
 * whatsappRoutes.js
 * Routes for the WhatsApp Baileys integration panel.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getStatus, stream, logout, testMessage, manualReconnect } = require('../controllers/whatsappController');

// All WA management routes require Admin authentication
router.get('/status',  protect, authorize('Admin'), getStatus);
router.get('/stream',  protect, stream);          // SSE — all authenticated users can listen
router.post('/logout', protect, authorize('Admin'), logout);
router.post('/reconnect', protect, authorize('Admin'), manualReconnect); // NEW: force reconnect
router.post('/test',   protect, authorize('Admin'), testMessage);

module.exports = router;
