CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tg_id BIGINT UNIQUE,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS user_teams (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS os_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website_url TEXT
);

-- ОНОВЛЕНО: Додано команду та поля балансу
CREATE TABLE IF NOT EXISTS billing_accounts (
    id SERIAL PRIMARY KEY,
    provider_id INT REFERENCES providers(id) ON DELETE CASCADE,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_key TEXT,
    last_balance DECIMAL(10,2) DEFAULT 0.00,
    predicted_burn_out_date DATE,
    last_check_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_steps (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES reminder_policies(id) ON DELETE CASCADE,
    days_passed INT NOT NULL,
    pings_per_day INT NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    os_id INT REFERENCES os_types(id) ON DELETE SET NULL,
    ip_original VARCHAR(50),
    ip_vpn VARCHAR(50),
    status VARCHAR(50) DEFAULT 'up'
);

CREATE TABLE IF NOT EXISTS server_billing (
    server_id INT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,
    billing_account_id INT REFERENCES billing_accounts(id) ON DELETE SET NULL,
    payment_day INT,
    cycle_months INT DEFAULT 1,
    is_custom_cycle BOOLEAN DEFAULT FALSE,
    custom_cycle_days INT,
    notify_days_before INT DEFAULT 5,
    next_payment_date DATE,
    last_paid_date DATE
);

CREATE TABLE IF NOT EXISTS server_notifications (
    server_id INT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    reminder_policy_id INT REFERENCES reminder_policies(id) ON DELETE SET NULL,
    snooze_until TIMESTAMP,
    snooze_interval_hours INT
);

CREATE TABLE IF NOT EXISTS server_teams (
    server_id INT REFERENCES servers(id) ON DELETE CASCADE,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (server_id, team_id)
);

CREATE TABLE IF NOT EXISTS payments_log (
    id SERIAL PRIMARY KEY,
    server_id INT REFERENCES servers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS downtime_log (
    id SERIAL PRIMARY KEY,
    server_id INT REFERENCES servers(id) ON DELETE CASCADE,
    down_at TIMESTAMP NOT NULL,
    up_at TIMESTAMP,
    duration_seconds INT
);

CREATE OR REPLACE VIEW v_servers_dashboard AS
SELECT 
    s.id,
    s.name AS server_name,
    o.name AS os_name,
    s.ip_original,
    s.ip_vpn,
    s.status,
    b.payment_day,
    b.next_payment_date,
    b.is_custom_cycle,
    b.custom_cycle_days,
    b.notify_days_before,
    p.name AS provider_name,
    p.website_url AS provider_url,
    t.name AS team_name,
    n.snooze_until,
    ba.last_balance AS team_balance
FROM servers s
LEFT JOIN os_types o ON s.os_id = o.id
LEFT JOIN server_billing b ON s.id = b.server_id
LEFT JOIN providers p ON b.provider_id = p.id
LEFT JOIN server_teams st ON s.id = st.server_id
LEFT JOIN teams t ON st.team_id = t.id
LEFT JOIN server_notifications n ON s.id = n.server_id
LEFT JOIN billing_accounts ba ON b.billing_account_id = ba.id;

SELECT setval('os_types_id_seq', COALESCE((SELECT MAX(id) FROM os_types), 1));
SELECT setval('providers_id_seq', COALESCE((SELECT MAX(id) FROM providers), 1));
SELECT setval('servers_id_seq', COALESCE((SELECT MAX(id) FROM servers), 1));