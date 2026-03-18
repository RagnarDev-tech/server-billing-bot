const pool = require('../../db/pool');

exports.getAll = async (req, res) => {
    console.log("--> [References] Запит на всі довідники...");
    try {
        const os = await pool.query('SELECT * FROM os_types ORDER BY id DESC');
        const providers = await pool.query('SELECT * FROM providers ORDER BY id DESC');
        const teams = await pool.query('SELECT * FROM teams ORDER BY id DESC');
        const billing = await pool.query(`
            SELECT ba.*, p.name as provider_name, t.name as team_name 
            FROM billing_accounts ba
            LEFT JOIN providers p ON ba.provider_id = p.id
            LEFT JOIN teams t ON ba.team_id = t.id
            ORDER BY ba.id DESC
        `);
        
        res.json({
            os: os.rows,
            providers: providers.rows,
            teams: teams.rows,
            billing: billing.rows
        });
    } catch (e) {
        console.error("❌ [References] Помилка getAll:", e);
        res.status(500).json({ error: e.message });
    }
};

exports.createItem = async (req, res) => {
    const { type } = req.params;
    const { name, website_url, description, provider_id, team_id, api_key } = req.body;
    try {
        if (type === 'os') {
            await pool.query('INSERT INTO os_types (name) VALUES ($1)', [name]);
        } else if (type === 'providers') {
            await pool.query('INSERT INTO providers (name, website_url) VALUES ($1, $2)', [name, website_url]);
        } else if (type === 'teams') {
            await pool.query('INSERT INTO teams (name, description) VALUES ($1, $2)', [name, description]);
        } else if (type === 'billing') {
            await pool.query(
                'INSERT INTO billing_accounts (name, provider_id, team_id, api_key) VALUES ($1, $2, $3, $4)', 
                [name, provider_id, team_id, api_key]
            );
        } else {
            return res.status(400).json({ error: 'Невідомий тип довідника' });
        }
        res.json({ success: true, message: 'Успішно створено' });
    } catch (e) {
        console.error("❌ [References] Помилка createItem:", e);
        res.status(500).json({ error: e.message });
    }
};

exports.updateItem = async (req, res) => {
    const { type, id } = req.params;
    const { name, website_url, description, provider_id, team_id, api_key } = req.body;
    try {
        if (type === 'os') {
            await pool.query('UPDATE os_types SET name = $1 WHERE id = $2', [name, id]);
        } else if (type === 'providers') {
            await pool.query('UPDATE providers SET name = $1, website_url = $2 WHERE id = $3', [name, website_url, id]);
        } else if (type === 'teams') {
            await pool.query('UPDATE teams SET name = $1, description = $2 WHERE id = $3', [name, description, id]);
        } else if (type === 'billing') {
            await pool.query(
                'UPDATE billing_accounts SET name = $1, provider_id = $2, team_id = $3, api_key = $4 WHERE id = $5',
                [name, provider_id, team_id, api_key, id]
            );
        } else {
            return res.status(400).json({ error: 'Невідомий тип довідника' });
        }
        res.json({ success: true, message: 'Успішно оновлено' });
    } catch (e) {
        console.error("❌ [References] Помилка updateItem:", e);
        res.status(500).json({ error: e.message });
    }
};

exports.deleteItem = async (req, res) => {
    const { type, id } = req.params;
    try {
        const table = type === 'os' ? 'os_types' : 
                      type === 'providers' ? 'providers' : 
                      type === 'teams' ? 'teams' : 
                      type === 'billing' ? 'billing_accounts' : null;

        if (!table) return res.status(400).json({ error: 'Невідомий тип' });

        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (e) {
        console.error("❌ [References] Помилка deleteItem:", e);
        res.status(500).json({ error: e.message });
    }
};