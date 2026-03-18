const pool = require('../../db/pool');

exports.getOsList = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM os_types ORDER BY name ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createOs = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "Назва обов'язкова" });
    const { rows } = await pool.query('INSERT INTO os_types (name) VALUES ($1) RETURNING *', [req.body.name]);
    res.json(rows[0]);
  } catch (e) { 
    console.error("Помилка створення ОС:", e);
    res.status(500).json({ error: e.message }); 
  }
};

exports.getProvidersList = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM providers ORDER BY name ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createProvider = async (req, res) => {
  try {
    const { name, website_url } = req.body;
    if (!name) return res.status(400).json({ error: "Назва обов'язкова" });
    const { rows } = await pool.query(
      'INSERT INTO providers (name, website_url) VALUES ($1, $2) RETURNING *', 
      [name, website_url || null]
    );
    res.json(rows[0]);
  } catch (e) { 
    console.error("Помилка створення Провайдера:", e);
    res.status(500).json({ error: e.message }); 
  }
};

exports.getTeamsList = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM teams ORDER BY name ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Назва обов'язкова" });
    const { rows } = await pool.query(
      'INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING *', 
      [name, description || null]
    );
    res.json(rows[0]);
  } catch (e) { 
    console.error("Помилка створення Команди:", e);
    res.status(500).json({ error: e.message }); 
  }
};

// 🔥 ГОЛОВНИЙ СПИСОК (СЕРВЕРИ + API АКАУНТИ) 🔥
exports.getServers = async (req, res) => {
  try {
    // 1. Беремо звичайні сервери з View
    const { rows: servers } = await pool.query('SELECT * FROM v_servers_dashboard ORDER BY id DESC');

    // 2. Беремо API акаунти, які ми хочемо бачити як окремі сутності
    const { rows: apiAccounts } = await pool.query(`
        SELECT 
            ba.id, 
            ba.name AS server_name, 
            p.name AS provider_name, 
            p.website_url AS provider_url,
            t.name AS team_name, 
            ba.last_balance AS team_balance,
            ba.predicted_burn_out_date AS next_payment_date
        FROM billing_accounts ba
        LEFT JOIN providers p ON ba.provider_id = p.id
        LEFT JOIN teams t ON ba.team_id = t.id
        ORDER BY ba.id DESC
    `);

    // 3. Форматуємо API акаунти під структуру сервера
    const formattedApi = apiAccounts.map(api => ({
        id: 'api_' + api.id,
        server_name: api.server_name,
        os_name: 'API BALANCE',
        ip_original: 'Auto-Sync',
        ip_vpn: null,
        status: 'api',
        provider_name: api.provider_name,
        provider_url: api.provider_url,
        team_name: api.team_name,
        team_balance: api.team_balance,
        next_payment_date: api.next_payment_date,
        is_api_account: true 
    }));

    // Повертаємо мікс (API завжди на початку)
    res.json([...formattedApi, ...servers]);
  } catch (e) { 
    console.error(e);
    res.status(500).json({ error: e.message }); 
  }
};

exports.createServer = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      name, os_id, ip_original, ip_vpn, provider_id, team_id, billing_account_id, next_payment_date,
      is_custom_cycle, custom_cycle_days, notify_days_before
    } = req.body;
    
    const v_os_id = os_id ? parseInt(os_id, 10) : null;
    const v_provider_id = provider_id ? parseInt(provider_id, 10) : null;
    const v_team_id = team_id ? parseInt(team_id, 10) : null;
    const v_billing_id = billing_account_id ? parseInt(billing_account_id, 10) : null;
    
    const sRes = await client.query(
      'INSERT INTO servers (name, os_id, ip_original, ip_vpn) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, v_os_id, ip_original || null, ip_vpn || null]
    );
    const serverId = sRes.rows[0].id;

    let payDay = null;
    if (next_payment_date) payDay = parseInt(next_payment_date.split('-')[2], 10);

    await client.query(
      `INSERT INTO server_billing 
       (server_id, provider_id, billing_account_id, payment_day, next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        serverId, v_provider_id, v_billing_id, payDay, next_payment_date || null, 
        is_custom_cycle === true, custom_cycle_days ? parseInt(custom_cycle_days, 10) : null, 
        notify_days_before ? parseInt(notify_days_before, 10) : 5
      ]
    );

    if (v_team_id) {
      await client.query('INSERT INTO server_teams (server_id, team_id) VALUES ($1, $2)', [serverId, v_team_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, id: serverId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Помилка створення сервера:", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

exports.updateServer = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const serverId = req.params.id;
    const { 
      name, os_id, ip_original, ip_vpn, provider_id, team_id, billing_account_id, next_payment_date,
      is_custom_cycle, custom_cycle_days, notify_days_before
    } = req.body;
    
    const v_os_id = os_id ? parseInt(os_id, 10) : null;
    const v_provider_id = provider_id ? parseInt(provider_id, 10) : null;
    const v_team_id = team_id ? parseInt(team_id, 10) : null;
    const v_billing_id = billing_account_id ? parseInt(billing_account_id, 10) : null;

    await client.query(
      'UPDATE servers SET name=$1, os_id=$2, ip_original=$3, ip_vpn=$4 WHERE id=$5',
      [name, v_os_id, ip_original || null, ip_vpn || null, serverId]
    );

    let payDay = null;
    if (next_payment_date) payDay = parseInt(next_payment_date.split('-')[2], 10);

    await client.query(
      `INSERT INTO server_billing (server_id, provider_id, billing_account_id, payment_day, next_payment_date, is_custom_cycle, custom_cycle_days, notify_days_before) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (server_id) 
       DO UPDATE SET 
         provider_id = EXCLUDED.provider_id, 
         billing_account_id = EXCLUDED.billing_account_id,
         payment_day = EXCLUDED.payment_day, 
         next_payment_date = EXCLUDED.next_payment_date,
         is_custom_cycle = EXCLUDED.is_custom_cycle,
         custom_cycle_days = EXCLUDED.custom_cycle_days,
         notify_days_before = EXCLUDED.notify_days_before`,
      [
        serverId, v_provider_id, v_billing_id, payDay, next_payment_date || null, 
        is_custom_cycle === true, custom_cycle_days ? parseInt(custom_cycle_days, 10) : null, 
        notify_days_before ? parseInt(notify_days_before, 10) : 5
      ]
    );

    await client.query('DELETE FROM server_teams WHERE server_id = $1', [serverId]);
    if (v_team_id) {
      await client.query('INSERT INTO server_teams (server_id, team_id) VALUES ($1, $2)', [serverId, v_team_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Помилка оновлення сервера:", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

exports.deleteServer = async (req, res) => {
  try {
    await pool.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { 
    console.error("Помилка видалення:", e.message);
    res.status(500).json({ error: e.message }); 
  }
};

exports.archiveServer = async (req, res) => {
  try {
    await pool.query("UPDATE servers SET status = 'archived' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) { 
    console.error("Помилка архівації:", e.message);
    res.status(500).json({ error: e.message }); 
  }
};

exports.getServerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const serverRes = await pool.query(`
      SELECT 
          s.id, s.name, s.ip_original, s.ip_vpn, s.status,
          s.os_id, o.name as os_name,
          b.provider_id, p.name as provider_name, p.website_url as provider_url,
          b.payment_day, b.cycle_months, b.next_payment_date, b.last_paid_date,
          b.is_custom_cycle, b.custom_cycle_days, b.notify_days_before,
          b.billing_account_id, ba.name as billing_account_name,
          st.team_id, t.name as team_name, t.description as team_desc,
          n.snooze_until, n.snooze_interval_hours,
          rp.name as reminder_policy_name
      FROM servers s
      LEFT JOIN os_types o ON s.os_id = o.id
      LEFT JOIN server_billing b ON s.id = b.server_id
      LEFT JOIN providers p ON b.provider_id = p.id
      LEFT JOIN billing_accounts ba ON b.billing_account_id = ba.id
      LEFT JOIN server_teams st ON s.id = st.server_id
      LEFT JOIN teams t ON st.team_id = t.id
      LEFT JOIN server_notifications n ON s.id = n.server_id
      LEFT JOIN reminder_policies rp ON n.reminder_policy_id = rp.id
      WHERE s.id = $1
    `, [id]);

    if (serverRes.rows.length === 0) {
      return res.status(404).json({ error: "Сервер не знайдено" });
    }

    const downtimeRes = await pool.query('SELECT * FROM downtime_log WHERE server_id = $1 ORDER BY down_at DESC LIMIT 50', [id]);
    const paymentsRes = await pool.query('SELECT * FROM payments_log WHERE server_id = $1 ORDER BY payment_date DESC LIMIT 50', [id]);

    res.json({
      info: serverRes.rows[0],
      downtime: downtimeRes.rows,
      payments: paymentsRes.rows
    });
  } catch (e) {
    console.error("Помилка отримання деталей:", e);
    res.status(500).json({ error: e.message });
  }
};