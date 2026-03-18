require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcrypt');

async function initAdmin() {
    const username = 'admin';
    const password = '1234';
    
    try {
        const hash = await bcrypt.hash(password, 10);
        
        await pool.query(`
            INSERT INTO users (username, password_hash, role) 
            VALUES ($1, $2, 'admin') 
            ON CONFLICT (username) 
            DO UPDATE SET password_hash = $2
        `, [username, hash]);

        console.log('🚀 [DATABASE] Адмін успішно ініціалізований:');
        console.log(`   Логін: ${username}`);
        console.log(`   Пароль: ${password}`);
    } catch (err) {
        console.error('❌ Помилка при створенні адміна:', err);
    } finally {
        process.exit();
    }
}

initAdmin();