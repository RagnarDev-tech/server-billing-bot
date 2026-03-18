const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Відсутній токен авторизації' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Використовуємо твій секретний ключ з .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
        req.user = decoded; // Записуємо дані юзера в запит
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Невірний або прострочений токен' });
    }
};