const pool = require('../../db/pool');

const escapeHtml = (text) => {
    if (!text) return '';
    return text.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

module.exports = (bot) => {
    bot.hears('💰 Фінанси', async (ctx) => {
        const loading = await ctx.reply('⏳ Трушу бухгалтерів, рахую бабки...');
        
        try {
            const today = new Date();

            // 1. API Баланси та Burn Rate
            const { rows: apiRows } = await pool.query(`
                SELECT 
                    COALESCE(t.name, 'Без команди') as team_name,
                    SUM(ba.last_balance) as balance,
                    SUM(CASE 
                        WHEN ba.last_balance > 0 AND ba.predicted_burn_out_date IS NOT NULL 
                        THEN (ba.last_balance / (EXTRACT(EPOCH FROM (ba.predicted_burn_out_date - COALESCE(ba.last_check_at, NOW()))) / 3600)) * 24
                        ELSE 0 
                    END) as burn
                FROM billing_accounts ba
                LEFT JOIN teams t ON ba.team_id = t.id
                GROUP BY t.name
            `);

            // 2. План на ПОТОЧНИЙ МІСЯЦЬ (по командах)
            const { rows: currentMonthRows } = await pool.query(`
                SELECT 
                    COALESCE(t.name, 'Без команди') as team_name,
                    s.name as server_name,
                    s.status,
                    b.next_payment_date
                FROM server_billing b
                JOIN servers s ON b.server_id = s.id
                LEFT JOIN server_teams st ON s.id = st.server_id
                LEFT JOIN teams t ON st.team_id = t.id
                WHERE b.next_payment_date >= DATE_TRUNC('month', CURRENT_DATE)
                AND b.next_payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                ORDER BY b.next_payment_date ASC
            `);

            // 3. Список оплат на НАСТУПНІ 15 ДНІВ (незалежно від місяця)
            const { rows: next15DaysRows } = await pool.query(`
                SELECT s.name, b.next_payment_date
                FROM server_billing b
                JOIN servers s ON b.server_id = s.id
                WHERE b.next_payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'
                ORDER BY b.next_payment_date ASC
            `);

            // 4. Останні 5 логів оплат
            const { rows: lastLogs } = await pool.query(`
                SELECT s.name, l.amount, l.payment_date 
                FROM payments_log l
                JOIN servers s ON l.server_id = s.id
                ORDER BY l.payment_date DESC LIMIT 5
            `);

            let text = `💰 <b>ФІНАНСОВА АНАЛІТИКА</b>\n`;
            text += `📅 <code>${today.toLocaleDateString('uk-UA')}</code>\n\n`;

            text += `👥 <b>БАЛАНСИ ТА ВИТРАТИ</b>\n`;
            apiRows.forEach(row => {
                text += `<b>${escapeHtml(row.team_name)}</b>\n`;
                text += `├ Баланс: <code>$${parseFloat(row.balance).toFixed(2)}</code>\n`;
                text += `└ Burn: <code>$${parseFloat(row.burn).toFixed(2)}</code>/день\n\n`;
            });

            text += `📅 <b>ПЛАН ОПЛАТ (ЦЕЙ МІСЯЦЬ)</b>\n`;
            if (currentMonthRows.length > 0) {
                const grouped = {};
                currentMonthRows.forEach(r => {
                    if (!grouped[r.team_name]) grouped[r.team_name] = [];
                    grouped[r.team_name].push(r);
                });

                for (const [team, servers] of Object.entries(grouped)) {
                    text += `👥 <b>${escapeHtml(team)}</b>\n`;
                    servers.forEach((s, idx) => {
                        const isLast = idx === servers.length - 1;
                        const statusIcon = (s.status === 'down' || s.status === 'dead') ? '🔴' : '🟢';
                        text += `${isLast ? '└' : '├'} ${statusIcon} ${escapeHtml(s.server_name)} — <code>${new Date(s.next_payment_date).toLocaleDateString('uk-UA')}</code>\n`;
                    });
                    text += `\n`;
                }
            } else {
                text += `└ Платежів у цьому місяці немає\n\n`;
            }

            // ТОЙ САМИЙ НОВИЙ ПУНКТ: Гарячі дедлайни на 15 днів
            text += `🔥 <b>В КІНЦІ МІСЯЦЯ (НА 15 ДНІВ):</b>\n`;
            if (next15DaysRows.length > 0) {
                next15DaysRows.forEach((r, idx) => {
                    const isLast = idx === next15DaysRows.length - 1;
                    const d = new Date(r.next_payment_date).toLocaleDateString('uk-UA');
                    text += `${isLast ? '└' : '├'} <code>${d}</code> — <b>${escapeHtml(r.name)}</b>\n`;
                });
            } else {
                text += `└ Поки все тихо\n`;
            }
            text += `\n`;

            text += `📜 <b>ОСТАННІ ТРАНЗАКЦІЇ</b>\n`;
            if (lastLogs.length > 0) {
                lastLogs.forEach((l, idx) => {
                    const isLast = idx === lastLogs.length - 1;
                    const date = new Date(l.payment_date).toLocaleDateString('uk-UA');
                    text += `${isLast ? '└' : '├'} ${date} | <b>${escapeHtml(l.name)}</b>: <code>${l.amount ? '$'+l.amount : '??'}</code>\n`;
                });
            } else {
                text += `└ Історія порожня\n`;
            }

            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, text, { parse_mode: 'HTML' });

        } catch (e) {
            console.error(e);
            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '❌ Бабло зникло, база видала помилку. Дивись лог.');
        }
    });
};