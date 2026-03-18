const ping = require('ping');
const pool = require('../db/pool');
const bot = require('../bot/setup');

const state = {};

async function checkServers() {
    try {
        const result = await pool.query(`
            SELECT 
                s.id, s.name, s.ip_original, s.ip_vpn, s.status,
                p.name AS provider_name,
                (SELECT STRING_AGG(t.name, ', ') FROM server_teams st JOIN teams t ON st.team_id = t.id WHERE st.server_id = s.id) AS teams
            FROM servers s
            LEFT JOIN server_billing b ON s.id = b.server_id
            LEFT JOIN providers p ON b.provider_id = p.id
            WHERE s.status != 'archived'
        `);
        const servers = result.rows;

        const activeServerIds = servers.map(s => s.id);
        for (const id in state) {
            if (!activeServerIds.includes(parseInt(id))) {
                delete state[id];
            }
        }

        for (const server of servers) {
            const targetIp = server.ip_vpn || server.ip_original;
            if (!targetIp) continue;

            if (!state[server.id]) {
                state[server.id] = { fails: 0, successes: 0, currentStatus: server.status };
            }

            const s = state[server.id];
            const res = await ping.promise.probe(targetIp, { timeout: 2 });

            const ipType = server.ip_vpn ? 'VPN' : 'Ориг.';
            const details = [
                server.provider_name ? `🏢 ${server.provider_name}` : '',
                server.teams ? `👥 ${server.teams}` : ''
            ].filter(Boolean).join(' • ');

            const msgBase = `\n\n🖥 <b>${server.name}</b>\n🌐 <code>${targetIp}</code> <i>(${ipType})</i>\n${details}`;

            if (!res.alive) {
                s.successes = 0;
                s.fails += 1;

                if (s.fails === 2 && s.currentStatus !== 'down' && s.currentStatus !== 'dead') {
                    s.currentStatus = 'down';
                    await pool.query("UPDATE servers SET status = 'down' WHERE id = $1", [server.id]);
                    bot.telegram.sendMessage(process.env.ADMIN_TG_ID, `⚠️ <b>ВТРАТА ЗВ'ЯЗКУ (2 фейли)</b>${msgBase}`, { parse_mode: 'HTML' });
                } else if (s.fails === 5 && s.currentStatus !== 'dead') {
                    s.currentStatus = 'dead';
                    await pool.query("UPDATE servers SET status = 'dead' WHERE id = $1", [server.id]);
                    await pool.query("INSERT INTO downtime_log (server_id, down_at) VALUES ($1, NOW())", [server.id]);
                    bot.telegram.sendMessage(process.env.ADMIN_TG_ID, `🚨 <b>СЕРВЕР ВПАВ (5 фейлів)</b>${msgBase}`, { parse_mode: 'HTML' });
                }
            } else {
                if (s.currentStatus === 'down' || s.currentStatus === 'dead') {
                    s.successes += 1;
                    if (s.successes === 5) {
                        s.fails = 0;
                        s.currentStatus = 'up';
                        await pool.query("UPDATE servers SET status = 'up' WHERE id = $1", [server.id]);
                        await pool.query("UPDATE downtime_log SET up_at = NOW(), duration_seconds = EXTRACT(EPOCH FROM (NOW() - down_at)) WHERE server_id = $1 AND up_at IS NULL", [server.id]);
                        bot.telegram.sendMessage(process.env.ADMIN_TG_ID, `✅ <b>ЗВ'ЯЗОК ВІДНОВЛЕНО</b>${msgBase}`, { parse_mode: 'HTML' });
                    }
                } else {
                    s.fails = 0;
                    s.successes = 0;
                }
            }
        }
    } catch (err) {}
}

setInterval(checkServers, 5000);

module.exports = checkServers;