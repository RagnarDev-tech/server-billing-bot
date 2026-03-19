const pool = require('../../db/pool');
const { Markup } = require('telegraf');

const escapeHtml = (text) => {
    if (!text) return '';
    return text.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const getAllNodes = async () => {
    const { rows: servers } = await pool.query(`
        SELECT s.id, s.name, s.status, s.ip_original, s.ip_vpn,
        COALESCE((SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id), 'Без команди') AS team_name
        FROM servers s WHERE s.status != 'archived'
    `);

    const { rows: apiAccounts } = await pool.query(`
        SELECT ba.id, ba.name, 'api' AS status, 'Auto-Sync' AS ip_original, NULL AS ip_vpn,
        COALESCE(t.name, 'Без команди') AS team_name
        FROM billing_accounts ba LEFT JOIN teams t ON ba.team_id = t.id
    `);

    return [
        ...servers.map(s => ({ ...s, type: 'server' })),
        ...apiAccounts.map(a => ({ ...a, type: 'api' }))
    ];
};

module.exports = (bot) => {

    const renderMainList = async () => {
        const nodes = await getAllNodes();
        const teamsGroup = {};

        nodes.forEach(node => {
            if (!teamsGroup[node.team_name]) teamsGroup[node.team_name] = [];
            teamsGroup[node.team_name].push(node);
        });

        let text = `🖥 <b>СИСТЕМНІ ВУЗЛИ (${nodes.length} шт.)</b>\n\n`;

        for (const [team, teamNodes] of Object.entries(teamsGroup)) {
            text += `👥 <b>${escapeHtml(team)}</b>\n`;
            
            teamNodes.sort((a, b) => {
                const w = { 'down': 1, 'dead': 1, 'api': 2, 'up': 3 };
                return (w[a.status] || 4) - (w[b.status] || 4);
            });

            teamNodes.forEach((n, idx) => {
                const isLast = idx === teamNodes.length - 1;
                let icon = n.status === 'api' ? '🔑' : (n.status === 'down' || n.status === 'dead' ? '🔴' : '🟢');
                const ip = n.ip_vpn || n.ip_original || 'Немає IP';
                text += `${isLast ? '└' : '├'} ${icon} <b>${escapeHtml(n.name)}</b> [<code>${escapeHtml(ip)}</code>]\n`;
            });
            text += `\n`;
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Переглянути детальніше', 'srv_menu_teams')],
            [Markup.button.callback('❌ Сховати', 'srv_close')]
        ]);

        return { text, keyboard };
    };

    bot.hears('🖥 Сервери', async (ctx) => {
        const loading = await ctx.reply('⏳ Формую список...');
        try {
            const { text, keyboard } = await renderMainList();
            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, text, { 
                parse_mode: 'HTML', reply_markup: keyboard.reply_markup 
            });
        } catch (e) {
            console.error(e);
            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '❌ Помилка завантаження.');
        }
    });

    bot.action('srv_list_main', async (ctx) => {
        try {
            const { text, keyboard } = await renderMainList();
            await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
        } catch (e) {
            console.error(e);
        }
    });

    bot.action('srv_close', async (ctx) => {
        try { await ctx.deleteMessage(); } catch (e) {}
    });

    bot.action('srv_menu_teams', async (ctx) => {
        try {
            const nodes = await getAllNodes();
            const teams = [...new Set(nodes.map(n => n.team_name))];
            
            let text = `📂 <b>ОБЕРІТЬ КАТЕГОРІЮ:</b>\n\nВкажіть команду, щоб переглянути її сервери.`;
            const buttons = [];

            teams.forEach(t => {
                const safeName = t.length > 20 ? t.substring(0, 20) : t; 
                buttons.push(Markup.button.callback(`👥 ${t}`, `srv_t_${safeName}`));
            });

            const keyboard = [];
            for (let i = 0; i < buttons.length; i += 2) {
                keyboard.push(buttons.slice(i, i + 2));
            }
            keyboard.push([Markup.button.callback('🌐 Переглянути всі сервери', 'srv_all')]);
            keyboard.push([Markup.button.callback('🔙 Повернутись', 'srv_list_main')]);

            await ctx.editMessageText(text, { 
                parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } 
            });
        } catch (e) {
            console.error(e);
        }
    });

    bot.action(/^srv_t_(.+)$/, async (ctx) => {
        const teamName = ctx.match[1];
        try {
            const nodes = await getAllNodes();
            const teamNodes = nodes.filter(n => n.team_name.startsWith(teamName));

            let text = `👥 <b>Команда: ${escapeHtml(teamName)}</b>\nОберіть вузол для перегляду деталей:`;
            const buttons = [];

            teamNodes.forEach(n => {
                let icon = n.status === 'api' ? '🔑' : (n.status === 'down' || n.status === 'dead' ? '🔴' : '🟢');
                buttons.push(Markup.button.callback(`${icon} ${n.name}`, `srv_info_${n.type}_${n.id}`));
            });

            const keyboard = [];
            for (let i = 0; i < buttons.length; i += 2) {
                keyboard.push(buttons.slice(i, i + 2));
            }
            keyboard.push([Markup.button.callback('🔙 Назад до команд', 'srv_menu_teams')]);

            await ctx.editMessageText(text, { 
                parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } 
            });
        } catch (e) {
            console.error(e);
        }
    });

    bot.action('srv_all', async (ctx) => {
        try {
            const nodes = await getAllNodes();
            
            nodes.sort((a, b) => {
                if (a.team_name !== b.team_name) {
                    return a.team_name.localeCompare(b.team_name);
                }
                const w = { 'down': 1, 'dead': 1, 'api': 2, 'up': 3 };
                return (w[a.status] || 4) - (w[b.status] || 4);
            });

            let text = `🌐 <b>Всі системні вузли</b>\nОберіть вузол для перегляду деталей:`;
            const buttons = [];

            nodes.forEach(n => {
                let icon = n.status === 'api' ? '🔑' : (n.status === 'down' || n.status === 'dead' ? '🔴' : '🟢');
                buttons.push(Markup.button.callback(`${icon} [${n.team_name}] ${n.name}`, `srv_info_${n.type}_${n.id}`));
            });

            const keyboard = [];
            for (let i = 0; i < buttons.length; i += 1) {
                keyboard.push(buttons.slice(i, i + 1));
            }
            keyboard.push([Markup.button.callback('🔙 Назад до команд', 'srv_menu_teams')]);

            await ctx.editMessageText(text, { 
                parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } 
            });
        } catch (e) {
            console.error(e);
        }
    });

    bot.action(/^srv_info_(server|api)_(\d+)$/, async (ctx) => {
        const type = ctx.match[1];
        const id = ctx.match[2];
        
        try {
            let text = '';
            if (type === 'server') {
                const { rows } = await pool.query(`
                    SELECT s.name, s.status, s.ip_original, s.ip_vpn, o.name AS os_name, p.name AS provider_name,
                    b.next_payment_date, b.is_custom_cycle, b.custom_cycle_days, b.cycle_months,
                    COALESCE((SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id), 'Без команди') AS team_name
                    FROM servers s
                    LEFT JOIN os_types o ON s.os_id = o.id
                    LEFT JOIN server_billing b ON s.id = b.server_id
                    LEFT JOIN providers p ON b.provider_id = p.id
                    WHERE s.id = $1
                `, [id]);
                
                if (!rows.length) return ctx.answerCbQuery('Сервер не знайдено!', {show_alert: true});
                const s = rows[0];
                let icon = (s.status === 'down' || s.status === 'dead') ? '🔴 ВІДВАЛИВСЯ' : '🟢 ONLINE';
                const dateStr = s.next_payment_date ? new Date(s.next_payment_date).toLocaleDateString('uk-UA') : 'Невідомо';
                const cycle = s.is_custom_cycle ? `${s.custom_cycle_days} дн.` : `${s.cycle_months || 1} міс.`;

                text = `🖥 <b>${escapeHtml(s.name)}</b>\n➖➖➖➖➖➖➖➖➖➖\n`;
                text += `<b>Статус:</b> ${icon}\n`;
                text += `<b>Команда:</b> 👥 ${escapeHtml(s.team_name)}\n`;
                text += `<b>ОС:</b> ${escapeHtml(s.os_name || '—')}\n`;
                text += `<b>Провайдер:</b> ${escapeHtml(s.provider_name || '—')}\n`;
                text += `<b>IP (Ориг):</b> <code>${escapeHtml(s.ip_original || '—')}</code>\n`;
                text += `<b>IP (VPN):</b> <code>${escapeHtml(s.ip_vpn || '—')}</code>\n`;
                text += `<b>Оплата:</b> <code>${dateStr}</code> (цикл: ${cycle})\n`;

            } else {
                const { rows } = await pool.query(`
                    SELECT ba.name, ba.last_balance, ba.predicted_burn_out_date, p.name AS provider_name, COALESCE(t.name, 'Без команди') AS team_name
                    FROM billing_accounts ba
                    LEFT JOIN providers p ON ba.provider_id = p.id
                    LEFT JOIN teams t ON ba.team_id = t.id
                    WHERE ba.id = $1
                `, [id]);

                if (!rows.length) return ctx.answerCbQuery('API Акаунт не знайдено!', {show_alert: true});
                const api = rows[0];
                const dateStr = api.predicted_burn_out_date ? new Date(api.predicted_burn_out_date).toLocaleDateString('uk-UA') : 'Невідомо';

                text = `🔑 <b>${escapeHtml(api.name)}</b> [API]\n➖➖➖➖➖➖➖➖➖➖\n`;
                text += `<b>Команда:</b> 👥 ${escapeHtml(api.team_name)}\n`;
                text += `<b>Провайдер:</b> ${escapeHtml(api.provider_name || '—')}\n`;
                text += `<b>Баланс:</b> <code>$${api.last_balance || 0}</code>\n`;
                text += `<b>Прогноз:</b> <code>${dateStr}</code>\n`;
            }

            await ctx.editMessageText(text, { 
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Назад', 'srv_menu_teams')]] }
            });

        } catch (e) {
            console.error(e);
            await ctx.answerCbQuery('Помилка бази', { show_alert: true });
        }
    });
};