const cron = require('node-cron');
const pool = require('../db/pool');
const bot = require('../bot/setup');
const keyboards = require('../bot/keyboards');
const { syncBalances } = require('../services/bitlaunch');

async function notify() {
    try {
        const kyivTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
        const currentHour = new Date(kyivTime).getHours();

        // 1. Оновлюємо баланси BitLaunch перед звітом/алертами
        await syncBalances();

        // 2. Отримуємо дані з БД
        const { rows: servers } = await pool.query(`SELECT * FROM v_servers_dashboard WHERE status != 'archived'`);
        const { rows: accounts } = await pool.query(`
            SELECT ba.*, t.name as team_name 
            FROM billing_accounts ba 
            JOIN teams t ON ba.team_id = t.id
        `);

        // ==========================================
        // 📊 СТРУКТУРОВАНИЙ РАНКОВИЙ ЗВІТ (09:00)
        // ==========================================
        if (currentHour === 9) {
            let reportMsg = `📊 <b>РАНКОВИЙ ЗВІТ СИСТЕМ</b>\n\n`;
            
            const uniqueTeams = [...new Set(servers.map(s => s.team_name || 'Без команди'))];

            for (const team of uniqueTeams) {
                reportMsg += `👥 <b>Команда: ${team}</b>\n`;
                
                // Фільтруємо сервери команди та сортуємо за датою (спадання)
                const teamServers = servers
                    .filter(s => (s.team_name || 'Без команди') === team)
                    .sort((a, b) => new Date(b.next_payment_date) - new Date(a.next_payment_date));

                teamServers.forEach(s => {
                    const date = s.next_payment_date ? new Date(s.next_payment_date).toLocaleDateString('uk-UA') : '—';
                    reportMsg += `• <code>${date}</code> — ${s.server_name}\n`;
                });

                // Додаємо баланс BitLaunch, якщо він прив'язаний до команди
                const teamAcc = accounts.find(a => a.team_name === team);
                if (teamAcc) {
                    const burnDate = teamAcc.predicted_burn_out_date 
                        ? new Date(teamAcc.predicted_burn_out_date).toLocaleDateString('uk-UA') 
                        : '...';
                    reportMsg += `💰 <i>Баланс BitLaunch: $${teamAcc.last_balance} (до ${burnDate})</i>\n`;
                }
                reportMsg += `───────────────────\n`;
            }

            await bot.telegram.sendMessage(process.env.ADMIN_TG_ID, reportMsg, { parse_mode: 'HTML' });
        }

        // ==========================================
        // ⚠️ АЛЕРТИ ПО БАЛАНСУ (9, 12, 16)
        // ==========================================
        if ([9, 12, 16].includes(currentHour)) {
            for (const acc of accounts) {
                const balance = parseFloat(acc.last_balance);
                
                if (balance < 100) {
                    let alertMsg = `⚠️ <b>НИЗЬКИЙ БАЛАНС BITLAUNCH</b>\n\n🏢 Акаунт: <b>${acc.name}</b>\n👥 Команда: <b>${acc.team_name}</b>\n💰 Залишилось: <b>$${balance}</b>`;
                    
                    if (acc.predicted_burn_out_date) {
                        alertMsg += `\n📅 Прогноз до: <b>${new Date(acc.predicted_burn_out_date).toLocaleDateString('uk-UA')}</b>`;
                    }

                    if (balance < 70) {
                        alertMsg = `🚨 <b>КРИТИЧНИЙ БАЛАНС!</b>\nШеф, пора закидати кеш!\n\n` + alertMsg;
                    }

                    await bot.telegram.sendMessage(process.env.ADMIN_TG_ID, alertMsg, { parse_mode: 'HTML' });
                }
            }
        }

        // ==========================================
        // 💸 НАГАДУВАННЯ ПРО ОПЛАТУ СЕРВЕРІВ (9, 12, 16)
        // ==========================================
        for (const s of servers) {
            // Скіпаємо, якщо на паузі
            if (s.snooze_until && new Date(s.snooze_until) > new Date()) continue;

            const today = new Date();
            const nextPayment = new Date(s.next_payment_date);
            const daysLeft = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

            const details = [
                s.provider_name ? `🏢 ${s.provider_name}` : '',
                s.team_name ? `👥 ${s.team_name}` : ''
            ].filter(Boolean).join(' • ');

            const dateStr = nextPayment.toISOString().split('T')[0];
            const msgBase = `\n\n🖥 <b>${s.server_name}</b>\n🌐 <code>${s.ip_vpn || s.ip_original || 'Сервіс'}</code>\n${details}\n\n📅 Дедлайн: <b>${dateStr}</b>`;

            if ([9, 12, 16].includes(currentHour)) {
                if (daysLeft <= (s.notify_days_before || 5) && daysLeft >= 0) {
                    await bot.telegram.sendMessage(
                        process.env.ADMIN_TG_ID,
                        `💸 <b>ЧАС ПЛАТИТИ!</b>\n⏳ Залишилось: <b>${daysLeft} дн.</b>${msgBase}`,
                        { parse_mode: 'HTML', ...keyboards.paymentKeyboard(s.id) }
                    );
                } else if (daysLeft < 0) {
                    const overdueDays = Math.abs(daysLeft);
                    await bot.telegram.sendMessage(
                        process.env.ADMIN_TG_ID,
                        `❌ <b>ПРОСТРОЧКА!</b>\n⚠️ Затримка: <b>${overdueDays} дн.</b>${msgBase}`,
                        { parse_mode: 'HTML', ...keyboards.paymentKeyboard(s.id) }
                    );
                }
            }
        }
    } catch (err) {
        console.error("Помилка воркера notify:", err);
    }
}

// Функція розрахунку останнього робочого дня
function getLastWorkingDayOfMonth(date) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const dayOfWeek = lastDay.getDay(); 
    if (dayOfWeek === 6) lastDay.setDate(lastDay.getDate() - 1);
    else if (dayOfWeek === 0) lastDay.setDate(lastDay.getDate() - 2);
    return lastDay;
}

// Зведений звіт на кінець місяця
async function notifyEndOfMonth() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const lastWorkingDay = getLastWorkingDayOfMonth(today);
        lastWorkingDay.setHours(0, 0, 0, 0);

        const dayBeforeLWD = new Date(lastWorkingDay);
        dayBeforeLWD.setDate(lastWorkingDay.getDate() - 1);
        dayBeforeLWD.setHours(0, 0, 0, 0);

        if (today.getTime() !== lastWorkingDay.getTime() && today.getTime() !== dayBeforeLWD.getTime()) return; 

        const { rows: results } = await pool.query(`
            SELECT s.name, b.next_payment_date, p.name AS provider_name
            FROM servers s
            JOIN server_billing b ON s.id = b.server_id
            LEFT JOIN providers p ON b.provider_id = p.id
            WHERE s.status != 'archived' 
            AND b.next_payment_date >= CURRENT_DATE
            AND b.next_payment_date <= CURRENT_DATE + INTERVAL '15 days'
            ORDER BY b.next_payment_date ASC
        `);

        if (results.length > 0) {
            let msg = today.getTime() === dayBeforeLWD.getTime() 
                ? `⏳ <b>Завтра останній робочий день місяця!</b>\n` 
                : `📊 <b>Звіт в останній робочий день місяця!</b>\n`;
            
            msg += `Оплати на найближчі 15 днів:\n\n`;
            
            results.forEach(row => {
                const dateStr = new Date(row.next_payment_date).toLocaleDateString('uk-UA');
                msg += `🔹 <b>${row.name}</b> (${row.provider_name}) — 🗓 <code>${dateStr}</code>\n`;
            });

            msg += `\n<i>Не забудь підготувати кеш!</i> 💸`;
            await bot.telegram.sendMessage(process.env.ADMIN_TG_ID, msg, { parse_mode: 'HTML' });
        }
    } catch (err) {
        console.error("Помилка EndOfMonth Notifier:", err);
    }
}

// Розклад
cron.schedule('0 9,12,16 * * *', notify, { timezone: 'Europe/Kyiv' });
cron.schedule('0 10 * * *', notifyEndOfMonth, { timezone: 'Europe/Kyiv' });

// ТЕСТОВИЙ ЗАПУСК (за потреби розкоментувати для перевірки)
// setTimeout(() => { notify(); }, 2000);

module.exports = notify;