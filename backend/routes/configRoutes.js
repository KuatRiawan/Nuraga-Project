const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/configController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize('Admin'), getConfig);
router.post('/', protect, authorize('Admin'), updateConfig);

module.exports = router;
