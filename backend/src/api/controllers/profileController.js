const pool = require('../../db/pool');
const bcrypt = require('bcrypt');

exports.getMe = async (req, res) => {
  console.log("--> [Profile] Запит на отримання профілю...");
  try {
    const { rows } = await pool.query('SELECT username, role FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(rows[0]);
  } catch (e) {
    console.error("❌ [Profile] Помилка getMe:", e);
    res.status(500).json({ error: e.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword) return res.status(400).json({ error: "Пароль не може бути порожнім" });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    res.json({ success: true, message: "Пароль оновлено" });
  } catch (e) {
    console.error("❌ [Profile] Помилка updatePassword:", e);
    res.status(500).json({ error: e.message });
  }
};