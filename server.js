const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

/* ===== POSTGRES ===== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/* ===== INIT DB ===== */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT,
      username TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      user_id INTEGER UNIQUE,
      score INTEGER DEFAULT 0
    )
  `);

  console.log("✅ Database ready");
}

initDB().catch(err => {
  console.error("DB ERROR:", err);
  process.exit(1);
});

/* ===== REGISTER ===== */
app.post("/register", async (req, res) => {
  const { email, user } = req.body;

  try {
    const exists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (exists.rows.length) {
      return res.json({ ok: false, error: "exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id",
      [email, user]
    );

    const uid = result.rows[0].id;

    await pool.query(
      "INSERT INTO scores (user_id, score) VALUES ($1, 0)",
      [uid]
    );

    res.json({ ok: true, id: uid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== GET SCORE ===== */
app.get("/score/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const result = await pool.query(
      "SELECT score FROM scores WHERE user_id = $1",
      [uid]
    );

    res.json({ score: result.rows[0]?.score || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ score: 0 });
  }
});

/* ===== ADMIN ===== */
app.get("/admin/users", async (req, res) => {
  const result = await pool.query(`
    SELECT users.id, users.email, users.username, scores.score
    FROM users
    LEFT JOIN scores ON users.id = scores.user_id
  `);

  res.json(result.rows);
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});