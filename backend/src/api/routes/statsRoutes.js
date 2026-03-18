const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const statsController = require('../controllers/statsController');

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Немає доступу' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Невалідний токен' });
    }
};

router.use(authMiddleware);

router.get('/dashboard', statsController.getDashboardStats);

module.exports = router;