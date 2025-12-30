const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

/* ===== ROOT ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ===== POSTGRES ===== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ===== INIT DB ===== */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      user_id INTEGER PRIMARY KEY,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  if (!email || !user) {
    return res.status(400).json({ ok: false });
  }

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
  const uid = Number(req.params.uid);

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

/* ===== ADD SCORE ===== */
app.post("/score", async (req, res) => {
  const { uid, score } = req.body;

  try {
    await pool.query(
      "UPDATE scores SET score = score + $1 WHERE user_id = $2",
      [score, uid]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== ADMIN ===== */
app.get("/admin/users", async (req, res) => {
  const result = await pool.query(`
    SELECT users.id, users.email, users.username, scores.score
    FROM users
    LEFT JOIN scores ON users.id = scores.user_id
    ORDER BY users.id
  `);

  res.json(result.rows);
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});