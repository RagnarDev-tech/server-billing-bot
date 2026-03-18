require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bot = require('./bot/setup');
const authRoutes = require('./api/routes/authRoutes');
const serverRoutes = require('./api/routes/serverRoutes');
const statsRoutes = require('./api/routes/statsRoutes');
const webServersPageRoutes = require('./api/routes/webServersPageRoutes');
const dashboardRoutes = require('./api/routes/dashboardRoutes');
const profileRoutes = require('./api/routes/profileRoutes'); 
const referenceRoutes = require('./api/routes/referenceRoutes');
const { syncBalances } = require('./services/bitlaunch');

syncBalances();
setInterval(syncBalances, 15 * 60 * 1000);

const app = express();

require('./workers/pinger');
require('./workers/notifier');

app.use(cors());
app.use(express.json());

// Підключення роутів
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/web', webServersPageRoutes); 
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/profile', profileRoutes);    
app.use('/api/references', referenceRoutes);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
    bot.launch().then(() => console.log('Бот запущено'));
});

const shutdown = () => {
    bot.stop();
    server.close();
    process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);