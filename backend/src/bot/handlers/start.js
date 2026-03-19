const { mainMenu } = require('../keyboards/reply');

module.exports = (bot) => {
    bot.command('start', async (ctx) => {
        await ctx.reply('👋 Здарова, Шеф. Пульт управління активовано. Що робимо?', mainMenu);
    });
};