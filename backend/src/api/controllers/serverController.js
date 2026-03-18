const pool = require('../../db/pool');

exports.getAll = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM v_servers_dashboard ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
};

exports.getById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM v_servers_dashboard WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Не знайдено' });
        res.json({ info: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
};

exports.create = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            name, os_id, ip_original, ip_vpn, 
            provider_id, team_id, billing_account_id, 
            next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before 
        } = req.body;

        const serverRes = await client.query(
            `INSERT INTO servers (name, os_id, ip_original, ip_vpn, status) 
             VALUES ($1, $2, $3, $4, 'up') RETURNING id`,
            [name, os_id || null, ip_original || null, ip_vpn || null]
        );
        const serverId = serverRes.rows[0].id;

        if (team_id) {
            await client.query(
                `INSERT INTO server_teams (server_id, team_id) VALUES ($1, $2)`,
                [serverId, team_id]
            );
        }

        await client.query(
            `INSERT INTO server_billing 
             (server_id, provider_id, billing_account_id, next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [serverId, provider_id || null, billing_account_id || null, next_payment_date || null, is_custom_cycle || false, custom_cycle_days || null, notify_days_before || 5]
        );

        await client.query('COMMIT');
        res.json({ success: true, id: serverId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Помилка створення сервера' });
    } finally {
        client.release();
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            name, os_id, ip_original, ip_vpn, 
            provider_id, team_id, billing_account_id, 
            next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before 
        } = req.body;

        await client.query(
            `UPDATE servers SET name = $1, os_id = $2, ip_original = $3, ip_vpn = $4 WHERE id = $5`,
            [name, os_id || null, ip_original || null, ip_vpn || null, id]
        );

        await client.query(`DELETE FROM server_teams WHERE server_id = $1`, [id]);
        if (team_id) {
            await client.query(`INSERT INTO server_teams (server_id, team_id) VALUES ($1, $2)`, [id, team_id]);
        }

        const billCheck = await client.query(`SELECT server_id FROM server_billing WHERE server_id = $1`, [id]);
        if (billCheck.rows.length > 0) {
            await client.query(
                `UPDATE server_billing 
                 SET provider_id = $1, billing_account_id = $2, next_payment_date = $3, 
                     is_custom_cycle = $4, custom_cycle_days = $5, notify_days_before = $6
                 WHERE server_id = $7`,
                [provider_id || null, billing_account_id || null, next_payment_date || null, is_custom_cycle || false, custom_cycle_days || null, notify_days_before || 5, id]
            );
        } else {
            await client.query(
                `INSERT INTO server_billing 
                 (server_id, provider_id, billing_account_id, next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [id, provider_id || null, billing_account_id || null, next_payment_date || null, is_custom_cycle || false, custom_cycle_days || null, notify_days_before || 5]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Помилка оновлення сервера' });
    } finally {
        client.release();
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM servers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Помилка видалення' });
    }
};

exports.archive = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("UPDATE servers SET status = 'archived' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Помилка архівації' });
    }
};