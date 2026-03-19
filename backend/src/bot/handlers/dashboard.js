const pool = require('../../db/pool');

const escapeHtml = (text) => {
    if (!text) return '';
    return text.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const formatShortDate = (date) => {
    return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatTimeDate = (date) => {
    const d = date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${d} о ${h}:${m}`;
};

module.exports = (bot) => {
    bot.hears('📊 Дашборд', async (ctx) => {
        const loadingMsg = await ctx.reply('⏳ Збираю дані...');
        
        try {
            const serversRes = await pool.query(`
                SELECT 
                    s.id, s.name, s.ip_original, s.ip_vpn, s.status,
                    n.snooze_until,
                    COALESCE(
                        (SELECT STRING_AGG(t.name, ', ') 
                         FROM server_teams st 
                         JOIN teams t ON st.team_id = t.id 
                         WHERE st.server_id = s.id), 
                        'Без команди'
                    ) AS team_name
                FROM servers s
                LEFT JOIN server_notifications n ON s.id = n.server_id
                WHERE s.status != 'archived'
            `);
            
            const apiCountRes = await pool.query(`SELECT COUNT(*) as count FROM billing_accounts`);
            const apiCount = parseInt(apiCountRes.rows[0].count, 10);
            
            const allServers = serversRes.rows;
            const totalNodes = allServers.length + apiCount;
            const deadServers = allServers.filter(s => s.status === 'down' || s.status === 'dead');

            const apiRes = await pool.query(`
                SELECT name, last_balance, predicted_burn_out_date
                FROM billing_accounts
                WHERE last_balance IS NOT NULL
                ORDER BY id ASC
            `);

            const paymentsRes = await pool.query(`
                SELECT 
                    s.name AS server_name, 
                    b.next_payment_date,
                    b.notify_days_before,
                    n.snooze_until,
                    COALESCE(
                        (SELECT STRING_AGG(t.name, ', ') 
                         FROM server_teams st 
                         JOIN teams t ON st.team_id = t.id 
                         WHERE st.server_id = s.id), 
                        'Без команди'
                    ) AS team_name
                FROM server_billing b
                JOIN servers s ON b.server_id = s.id
                LEFT JOIN server_notifications n ON s.id = n.server_id
                WHERE s.status != 'archived' AND b.next_payment_date <= CURRENT_DATE + INTERVAL '7 days'
                ORDER BY b.next_payment_date ASC
            `);

            const today = new Date();

            let text = `🖥 <b>СИСТЕМНИЙ ДАШБОРД</b>\n`;
            text += `📅 <code>${formatShortDate(today)}</code>\n\n`;

            text += `📊 <b>СТАТИСТИКА МЕРЕЖІ</b>\n`;
            text += `├ Вузлів у базі: <code>${totalNodes}</code>\n`;
            
            if (deadServers.length > 0) {
                text += `└ Стан: 🔴 <b>ВТРАЧЕНО ЗВ'ЯЗОК (${deadServers.length})</b>\n\n`;
                text += `🚨 <b>ПРОБЛЕМНІ ВУЗЛИ</b>\n`;
                deadServers.forEach(ds => {
                    const ip = ds.ip_vpn || ds.ip_original || 'немає IP';
                    let snoozeInfo = '';
                    if (ds.snooze_until && new Date(ds.snooze_until) > today) {
                        snoozeInfo = ` | 🔕 Пауза до ${formatTimeDate(new Date(ds.snooze_until))}`;
                    }
                    text += `❌ <b>${escapeHtml(ds.name)}</b> [<code>${escapeHtml(ip)}</code>]\n`;
                    text += `  └ 👥 ${escapeHtml(ds.team_name)}${snoozeInfo}\n`;
                });
                text += `\n`;
            } else {
                text += `└ Стан: 🟢 <b>В НОРМІ</b>\n\n`;
            }

            if (apiRes.rowCount > 0) {
                text += `💰 <b>ФІНАНСИ API</b>\n`;
                apiRes.rows.forEach(api => {
                    let dateStr = '—';
                    let warn = '';
                    if (api.predicted_burn_out_date) {
                        const pDate = new Date(api.predicted_burn_out_date);
                        dateStr = formatShortDate(pDate);
                        const diffDays = Math.ceil((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 3) warn = ' ⚠️';
                    }
                    text += `💳 <b>${escapeHtml(api.name)}</b>${warn}\n`;
                    text += `  └ <code>$${api.last_balance}</code> | ⏳ до <code>${dateStr}</code>\n`;
                });
                text += `\n`;
            }

            text += `⏳ <b>ДЕДЛАЙНИ (&lt; 7 ДНІВ)</b>\n`;
            if (paymentsRes.rowCount > 0) {
                const teamsGroup = {};
                paymentsRes.rows.forEach(p => {
                    const tName = p.team_name;
                    if (!teamsGroup[tName]) teamsGroup[tName] = [];
                    teamsGroup[tName].push(p);
                });

                for (const [team, servers] of Object.entries(teamsGroup)) {
                    text += `👥 <b>${escapeHtml(team)}</b>\n`;
                    servers.forEach(p => {
                        const pDate = new Date(p.next_payment_date);
                        const diffTime = pDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        let daysText = diffDays === 0 ? 'СЬОГОДНІ' : diffDays < 0 ? 'ПРОСТРОЧЕНО' : `${diffDays} дн.`;
                        let icon = diffDays <= 1 ? '🆘' : '⚠️';
                        
                        let reminderText = '';
                        if (p.snooze_until && new Date(p.snooze_until) > today) {
                            reminderText = `🔕 Пауза до ${formatTimeDate(new Date(p.snooze_until))}`;
                        } else {
                            const notifyDays = parseInt(p.notify_days_before || 5, 10);
                            const notifyStart = new Date(pDate);
                            notifyStart.setDate(notifyStart.getDate() - notifyDays);
                            
                            if (today >= notifyStart) {
                                reminderText = '🔔 Нагадування активне';
                            } else {
                                reminderText = `🔔 Нагадування з ${formatShortDate(notifyStart)}`;
                            }
                        }

                        text += `${icon} <b>${escapeHtml(p.server_name)}</b> ➔ <code>${formatShortDate(pDate)}</code> (<code>${daysText}</code>)\n`;
                        text += `  └ ${reminderText}\n`;
                    });
                    text += `\n`;
                }
            } else {
                text += `  └ <i>Все чисто, дедлайнів немає.</i>\n`;
            }

            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                loadingMsg.message_id, 
                null, 
                text, 
                { parse_mode: 'HTML' }
            );

        } catch (err) {
            console.error(err);
            await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, '❌ Сталася помилка. Дані не завантажено.');
        }
    });
};