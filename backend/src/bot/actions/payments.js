const pool = require('../../db/pool');
const keyboards = require('../keyboards/inline');

module.exports = (bot) => {
    bot.action(/^pay_(\d+)$/, async (ctx) => {
        const serverId = ctx.match[1];
        await ctx.editMessageReplyMarkup(keyboards.confirmPaymentKeyboard(serverId).reply_markup);
    });

    bot.action(/^cancel_(\d+)$/, async (ctx) => {
        const serverId = ctx.match[1];
        await ctx.editMessageReplyMarkup(keyboards.paymentKeyboard(serverId).reply_markup);
    });

    bot.action(/^confirm_pay_(\d+)$/, async (ctx) => {
        const serverId = ctx.match[1];
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const updateRes = await client.query(`
                UPDATE server_billing 
                SET last_paid_date = CURRENT_DATE,
                    next_payment_date = CASE 
                        WHEN is_custom_cycle = TRUE THEN next_payment_date + (custom_cycle_days || ' days')::interval
                        ELSE next_payment_date + (cycle_months || ' months')::interval
                    END
                WHERE server_id = $1
                RETURNING next_payment_date
            `, [serverId]);
            
            await client.query(`UPDATE server_notifications SET snooze_until = NULL WHERE server_id = $1`, [serverId]);

            await client.query(`
                INSERT INTO payments_log (server_id, amount, notes) 
                VALUES ($1, NULL, 'Відмітка про ручну оплату')
            `, [serverId]);

            const sRes = await client.query(`
                SELECT 
                    s.name, 
                    COALESCE(s.ip_vpn, s.ip_original) AS ip,
                    p.name AS provider_name,
                    (SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id) AS teams
                FROM servers s
                LEFT JOIN server_billing b ON s.id = b.server_id
                LEFT JOIN providers p ON b.provider_id = p.id
                WHERE s.id = $1
            `, [serverId]);
            
            await client.query('COMMIT');

            const sData = sRes.rows[0] || {};
            const newDate = updateRes.rows[0]?.next_payment_date;
            const dateStr = newDate ? new Date(newDate).toISOString().split('T')[0] : 'Невідомо';
            
            const sName = sData.name || 'Невідомий';
            const sIp = sData.ip || '—';
            const details = [
                sData.provider_name ? `🏢 ${sData.provider_name}` : '',
                sData.teams ? `👥 ${sData.teams}` : ''
            ].filter(Boolean).join(' • ');

            const msg = `✅ <b>ОПЛАТУ ЗАФІКСОВАНО</b>\n\n🖥 <b>${sName}</b>\n🌐 <code>${sIp}</code>\n${details}\n\n📅 Наступна оплата: <b>${dateStr}</b>`;

            await ctx.editMessageText(msg, { parse_mode: 'HTML' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            await ctx.answerCbQuery('Помилка оновлення бази. Спробуй ще раз.', { show_alert: true });
        } finally {
            client.release();
        }
    });

    bot.action(/^snooze_prompt_(\d+)$/, async (ctx) => {
        const serverId = ctx.match[1];
        try {
            const res = await pool.query('SELECT ip_original, ip_vpn FROM servers WHERE id = $1', [serverId]);
            const hasIp = !!(res.rows[0]?.ip_original || res.rows[0]?.ip_vpn);
            await ctx.editMessageReplyMarkup(keyboards.snoozeOptionsKeyboard(serverId, hasIp).reply_markup);
        } catch (err) {
            console.error(err);
        }
    });

    bot.action(/^snooze_set_(\d+)_(\d+)$/, async (ctx) => {
        const serverId = ctx.match[1];
        const hours = parseInt(ctx.match[2], 10);
        try {
            const sRes = await pool.query(`
                SELECT s.name, (SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id) AS teams
                FROM servers s WHERE s.id = $1
            `, [serverId]);
            
            const sName = sRes.rows[0]?.name || 'Невідомий';
            const sTeams = sRes.rows[0]?.teams ? `👥 ${sRes.rows[0].teams}` : '';

            await pool.query(`
                INSERT INTO server_notifications (server_id, snooze_until) 
                VALUES ($1, NOW() + ($2 || ' hours')::interval)
                ON CONFLICT (server_id) 
                DO UPDATE SET snooze_until = NOW() + ($2 || ' hours')::interval
            `, [serverId, hours]);
            
            const timeText = hours % 24 === 0 ? `${hours / 24} дн.` : `${hours} год.`;
            const msg = `⏳ <b>НАГАДУВАННЯ ВІДКЛАДЕНО</b>\n\n🖥 <b>${sName}</b>\n${sTeams}\n\n💤 Пауза на: <b>${timeText}</b>`;
            
            await ctx.editMessageText(msg, { parse_mode: 'HTML' });
        } catch (err) {
            console.error(err);
            await ctx.answerCbQuery('Бля, помилка відкладки', { show_alert: true });
        }
    });
};