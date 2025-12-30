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
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
  if (!email || !user) return res.status(400).json({ ok: false });

  try {
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length) return res.json({ ok: false, error: "exists" });

    const result = await pool.query(
      "INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id",
      [email, user]
    );

    const uid = result.rows[0].id;
    await pool.query("INSERT INTO scores (user_id, score) VALUES ($1, 0)", [uid]);

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
    const result = await pool.query("SELECT score FROM scores WHERE user_id = $1", [uid]);
    res.json({ score: result.rows[0]?.score || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ score: 0 });
  }
});

/* ===== ADD SCORE ===== */
app.post("/score", async (req, res) => {
  const { id, score } = req.body; // Важливо: frontend відправляє `id`
  if (!id || !score) return res.status(400).json({ ok: false });

  try {
    await pool.query(
      "UPDATE scores SET score = score + $1 WHERE user_id = $2",
      [score, id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== ADMIN ===== */
const ADMIN_PASSWORD = "dandelion0514";

app.post("/admin/users", async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "forbidden" });

  try {
    const result = await pool.query(`
      SELECT users.id, users.email, users.username, scores.score
      FROM users
      LEFT JOIN scores ON users.id = scores.user_id
      ORDER BY users.id
    `);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== START SERVER ===== */
app.listen(PORT, () => console.log("🚀 Server running on", PORT));