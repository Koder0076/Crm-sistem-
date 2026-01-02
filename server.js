
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
  // Таблиця користувачів
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT
    )
  `);

  // Таблиця очок
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER DEFAULT 0
    )
  `);

  // Таблиця earn-блоків
  await pool.query(`
    CREATE TABLE IF NOT EXISTS earn_blocks (
      id SERIAL PRIMARY KEY,
      data JSONB
    )
  `);

  // Таблиця виконаних earn-блоків
  await pool.query(`
    CREATE TABLE IF NOT EXISTS earn_done (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      block_id INTEGER,
      PRIMARY KEY (user_id, block_id)
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
  const { id, score } = req.body;
  if (!id || score === undefined || score === null) return res.status(400).json({ ok: false });

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

/* ===== EARN BLOCKS ===== */

// GET: повертає блоки
app.get("/earn-blocks", async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM earn_blocks ORDER BY id ASC");
    const blocks = result.rows.map(r => r.data);
    res.json(blocks);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

// POST: зберігає блоки з адмінки
app.post("/admin/earn-blocks", async (req, res) => {
  const { password, blocks } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "forbidden" });

  try {
    await pool.query("DELETE FROM earn_blocks");
    for (const block of blocks) {
      await pool.query("INSERT INTO earn_blocks (data) VALUES ($1)", [block]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== COMPLETE EARN BLOCK ===== */
app.post("/earn/complete", async (req, res) => {
  const { userId, blockId, reward } = req.body;
  if (!userId || blockId === undefined) return res.status(400).json({ ok: false });

  try {
    // Перевірка чи вже виконано
    const check = await pool.query(
      "SELECT 1 FROM earn_done WHERE user_id=$1 AND block_id=$2",
      [userId, blockId]
    );

    if (check.rows.length) return res.json({ ok: false, already: true });

    // Додаємо очки
    await pool.query(
      "UPDATE scores SET score = score + $1 WHERE user_id = $2",
      [reward || 0, userId]
    );

    // Фіксуємо виконання
    await pool.query(
      "INSERT INTO earn_done (user_id, block_id) VALUES ($1, $2)",
      [userId, blockId]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* ===== START SERVER ===== */
app.listen(PORT, () => console.log("🚀 Server running on", PORT));