const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
// Припускаємо, що у тебе є middleware для перевірки токена
const authMiddleware = require('../../middleware/auth');

router.get('/me', authMiddleware, profileController.getMe);
router.put('/password', authMiddleware, profileController.updatePassword);

module.exports = router;