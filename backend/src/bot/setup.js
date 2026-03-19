const { Telegraf } = require('telegraf');
require('dotenv').config();

const adminAuth = require('./middlewares/adminAuth');
const paymentsActions = require('./actions/payments');
const startHandler = require('./handlers/start');
const dashboardHandler = require('./handlers/dashboard');
const serversHandler = require('./handlers/servers');
const financeHandler = require('./handlers/finance');
const settingsHandler = require('./handlers/settings');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(adminAuth);

startHandler(bot);
dashboardHandler(bot);
serversHandler(bot);
financeHandler(bot);
settingsHandler(bot);
paymentsActions(bot);

bot.telegram.getMe().then((botInfo) => {
    console.log(`✅ [Telegram] Пульт підключено! Бот @${botInfo.username} готовий до роботи.`);
}).catch(err => {
    console.error('❌ [Telegram] Помилка підключення бота:', err.message);
});

module.exports = bot;