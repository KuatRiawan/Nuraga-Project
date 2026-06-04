const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/global', protect, chatController.getGlobalHistory);

module.exports = router;
