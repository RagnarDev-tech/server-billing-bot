require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

async function migrate() {
    const client = new Client({ ...dbConfig, database: 'postgres' });

    try {
        await client.connect();
        const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${process.env.DB_NAME}'`);
        
        if (res.rowCount === 0) {
            await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
        }
    } finally {
        await client.end();
    }

    const appClient = new Client({ ...dbConfig, database: process.env.DB_NAME });

    try {
        await appClient.connect();
        
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await appClient.query(sql);
        
        const adminCheck = await appClient.query(`SELECT id FROM users WHERE username = 'Admin'`);
        if (adminCheck.rowCount === 0) {
            const hash = await bcrypt.hash('1234', 10);
            await appClient.query(
                `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)`,
                ['Admin', hash, 'admin']
            );
        }
    } finally {
        await appClient.end();
    }
}

migrate();