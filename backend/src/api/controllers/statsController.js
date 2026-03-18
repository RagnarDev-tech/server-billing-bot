const pool = require('../../db/pool');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalServers = await pool.query('SELECT COUNT(*) FROM servers');
        
        const deadServers = await pool.query("SELECT COUNT(*) FROM servers WHERE status = 'dead' OR status = 'down'");
        
        const recentPayments = await pool.query(`
            SELECT amount, payment_date 
            FROM payments_log 
            ORDER BY payment_date DESC LIMIT 10
        `);

        res.json({
            total: parseInt(totalServers.rows[0].count),
            dead: parseInt(deadServers.rows[0].count),
            recent_payments: recentPayments.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Помилка отримання статистики' });
    }
};