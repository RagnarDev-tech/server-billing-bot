const { Markup } = require('telegraf');
const os = require('os');
const pool = require('../../db/pool');

module.exports = (bot) => {
    bot.hears('⚙️ Налаштування', async (ctx) => {
        const loading = await ctx.reply('⏳ Запитую систему...');
        
        try {
            const uptime = process.uptime();
            const h = Math.floor(uptime / 3600);
            const m = Math.floor((uptime % 3600) / 60);
            const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);

            let text = `⚙️ <b>ПАНЕЛЬ КЕРУВАННЯ</b>\n➖➖➖➖➖➖➖➖➖➖\n`;
            text += `👤 <b>TG ID Адміна:</b> <code>${process.env.ADMIN_TG_ID}</code>\n`;
            text += `🖥 <b>Хост:</b> <code>${os.hostname()}</code>\n`;
            text += `⏱ <b>Аптайм бота:</b> <code>${h} год ${m} хв</code>\n`;
            text += `💾 <b>Споживання RAM:</b> <code>${mem} MB</code>\n\n`;
            text += `👇 <b>Ручне керування:</b>`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Синхронізувати API (BitLaunch)', 'manual_sync_api')],
                [Markup.button.callback('📡 Примусовий пінг серверів', 'manual_ping')],
                [Markup.button.callback('🔔 Розіслати нагадування', 'manual_notify')]
            ]);

            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, text, { 
                parse_mode: 'HTML', 
                reply_markup: keyboard.reply_markup 
            });
        } catch (e) {
            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '❌ Налаштування не завантажились.');
        }
    });

    bot.action('manual_sync_api', async (ctx) => {
        await ctx.answerCbQuery('🔄 Запускаю синхронізацію...');
        try {
            const { syncBalances } = require('../../services/bitlaunch');
            await syncBalances();
            await ctx.reply('✅ <b>BitLaunch:</b> Синхронізація успішно виконана!', { parse_mode: 'HTML' });
        } catch (e) {
            await ctx.reply('❌ Помилка при синхронізації API. Перевір логи.');
        }
    });

    bot.action('manual_ping', async (ctx) => {
        await ctx.answerCbQuery('📡 Пінг пішов...');
        try {
            const checkServers = require('../../workers/pinger');
            await checkServers(); 

            const { rows: deadServers } = await pool.query(`
                SELECT s.name, s.ip_vpn, s.ip_original, s.status,
                p.name AS provider_name,
                (SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id) AS team_name
                FROM servers s
                LEFT JOIN server_billing b ON s.id = b.server_id
                LEFT JOIN providers p ON b.provider_id = p.id
                WHERE s.status IN ('down', 'dead')
            `);

            if (deadServers.length > 0) {
                await ctx.reply(`🚨 <b>ПІНГ ЗАВЕРШЕНО. ВИЯВЛЕНО ПРОБЛЕМНІ ВУЗЛИ: ${deadServers.length} шт.</b>`, { parse_mode: 'HTML' });
                
                for (const s of deadServers) {
                    const targetIp = s.ip_vpn || s.ip_original || 'Немає IP';
                    const details = [
                        s.provider_name ? `🏢 ${s.provider_name}` : '',
                        s.team_name ? `👥 ${s.team_name}` : ''
                    ].filter(Boolean).join(' • ');

                    const msg = `❌ <b>СЕРВЕР ВПАВ</b>\n\n🖥 <b>${s.name}</b>\n🌐 <code>${targetIp}</code>\n${details}\n\nСтатус: <b>${s.status.toUpperCase()}</b>`;
                    await ctx.reply(msg, { parse_mode: 'HTML' });
                }
            } else {
                await ctx.reply('✅ <b>Пінг завершено!</b> Усі сервери в мережі і відповідають.', { parse_mode: 'HTML' });
            }
        } catch (e) {
            await ctx.reply('❌ Пінгер вийшов з чату з помилкою.');
        }
    });

    bot.action('manual_notify', async (ctx) => {
        await ctx.answerCbQuery('🔔 Розсилаю нагадування...');
        try {
            const notify = require('../../workers/notifier');
            await notify(true); 
            await ctx.reply('✅ <b>Усі актуальні нагадування успішно розіслані!</b>', { parse_mode: 'HTML' });
        } catch (e) {
            await ctx.reply('❌ Помилка при розсилці.');
        }
    });
};