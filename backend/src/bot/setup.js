const { Telegraf } = require('telegraf');
require('dotenv').config();
const setupActions = require('./actions');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(async (ctx, next) => {
    if (ctx.from && ctx.from.id.toString() !== process.env.ADMIN_TG_ID) return;
    return next();
});

setupActions(bot);

module.exports = bot;