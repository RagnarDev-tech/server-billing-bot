const pool = require('../../db/pool');

exports.getSummary = async (req, res) => {
    try {
        // 1. Рахуємо ВСЬОГО: звичайні (не архівні) + API-акаунти
        const totalServersRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM servers WHERE status != 'archived') + 
                (SELECT COUNT(*) FROM billing_accounts) as count
        `);
        const totalServers = parseInt(totalServersRes.rows[0].count, 10);

        // 2. Помилки: тільки звичайні сервери (бо API ми вважаємо завжди "api" або "up")
        const deadRes = await pool.query(`SELECT COUNT(*) FROM servers WHERE status IN ('down', 'dead')`);
        const deadServers = parseInt(deadRes.rows[0].count, 10);

        // 3. Оплати (дедлайни 5 днів): сервери з датою + API-акаунти з прогнозом
        const paymentsRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM server_billing b 
                 JOIN servers s ON b.server_id = s.id 
                 WHERE s.status != 'archived' AND b.next_payment_date <= CURRENT_DATE + INTERVAL '5 days') +
                (SELECT COUNT(*) FROM billing_accounts 
                 WHERE predicted_burn_out_date <= CURRENT_DATE + INTERVAL '5 days') as count
        `);
        const upcomingPayments = parseInt(paymentsRes.rows[0].count, 10);

        // 4. Паузи сповіщень
        const snoozedRes = await pool.query(`
            SELECT COUNT(*) FROM server_notifications n
            JOIN servers s ON n.server_id = s.id
            WHERE s.status != 'archived' AND n.snooze_until > NOW()
        `);
        const snoozedCount = parseInt(snoozedRes.rows[0].count, 10);

        // 5. Стрічка подій (тут поки лишаємо як є, бо API-акаунти не генерують логів down/up)
        const feedRes = await pool.query(`
            (SELECT s.id AS server_id, s.name, 'down' AS type, d.down_at AS event_date FROM downtime_log d JOIN servers s ON d.server_id = s.id)
            UNION ALL
            (SELECT s.id AS server_id, s.name, 'up' AS type, d.up_at AS event_date FROM downtime_log d JOIN servers s ON d.server_id = s.id WHERE d.up_at IS NOT NULL)
            UNION ALL
            (SELECT s.id AS server_id, s.name, 'paid' AS type, p.payment_date AS event_date FROM payments_log p JOIN servers s ON p.server_id = s.id)
            UNION ALL
            (SELECT s.id AS server_id, s.name, 'warning' AS type, (b.next_payment_date - (COALESCE(b.notify_days_before, 5) || ' days')::interval)::timestamp AS event_date 
             FROM server_billing b JOIN servers s ON b.server_id = s.id 
             WHERE b.next_payment_date IS NOT NULL AND s.status != 'archived')
            ORDER BY event_date DESC LIMIT 50
        `);

        // 6. Черга дедлайнів: мікс з топ-5 найближчих дат (Сервери + API)
        const upcomingListRes = await pool.query(`
            SELECT * FROM (
                SELECT s.id AS server_id, s.name, b.next_payment_date, n.snooze_until, FALSE as is_api
                FROM server_billing b
                JOIN servers s ON b.server_id = s.id
                LEFT JOIN server_notifications n ON s.id = n.server_id
                WHERE s.status != 'archived' AND b.next_payment_date IS NOT NULL
                
                UNION ALL
                
                SELECT ba.id AS server_id, ba.name, ba.predicted_burn_out_date as next_payment_date, NULL as snooze_until, TRUE as is_api
                FROM billing_accounts ba
                WHERE ba.predicted_burn_out_date IS NOT NULL
            ) combined
            ORDER BY next_payment_date ASC LIMIT 5
        `);

        res.json({
            totalServers, deadServers, upcomingPayments, snoozedCount,
            recentEvents: feedRes.rows,
            upcomingList: upcomingListRes.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};