const axios = require('axios');
const pool = require('../db/pool');

const connectionStates = {};

async function syncBalances() {
    try {
        const { rows: accounts } = await pool.query(`
            SELECT ba.* FROM billing_accounts ba
            JOIN providers p ON ba.provider_id = p.id
            WHERE p.name ILIKE '%BitLaunch%' AND ba.api_key IS NOT NULL
        `);

        for (const acc of accounts) {
            try {
                const url = 'https://app.bitlaunch.io/api/user';
                const res = await axios.get(url, {
                    headers: { 
                        'Authorization': `Bearer ${acc.api_key.trim()}`,
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });

                if (connectionStates[acc.name] !== true) {
                    console.log(`✅ [BitLaunch] З'єднання встановлено. Акаунт: ${acc.name}`);
                    connectionStates[acc.name] = true;
                }

                const rawBalance = res.data.balance; 
                const rawCostHr = res.data.costPerHr; 
                
                const currentBalance = parseFloat((rawBalance / 1000).toFixed(2));
                const hourlyCost = rawCostHr / 1000;

                let predictedDate = null;

                if (rawBalance > 0 && rawCostHr > 0) {
                    const hoursLeft = rawBalance / rawCostHr;
                    const burnoutDate = new Date();
                    burnoutDate.setMilliseconds(burnoutDate.getMilliseconds() + (hoursLeft * 60 * 60 * 1000));
                    predictedDate = burnoutDate;
                }

                await pool.query(`
                    UPDATE billing_accounts 
                    SET last_balance = $1, 
                        predicted_burn_out_date = $2, 
                        last_check_at = NOW() 
                    WHERE id = $3
                `, [currentBalance, predictedDate, acc.id]);

            } catch (e) {
                if (connectionStates[acc.name] !== false) {
                    console.error(`❌ [BitLaunch] ВТРАЧЕНО З'ЄДНАННЯ для ${acc.name}:`, e.response?.status || e.message);
                    connectionStates[acc.name] = false;
                }
            }
        }
    } catch (e) {
        console.error('❌ [BitLaunch] Глобальна помилка сервісу:', e.message);
    }
}

module.exports = { syncBalances };