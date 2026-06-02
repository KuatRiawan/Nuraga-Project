const express = require('express');
const router = express.Router();
const { getConfig, updateConfig, getChecklistTemplates } = require('../controllers/configController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize('Admin'), getConfig);
router.post('/', protect, authorize('Admin'), updateConfig);
router.get('/checklist-templates', protect, getChecklistTemplates);

module.exports = router;
