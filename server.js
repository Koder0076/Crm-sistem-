const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "dandelion0514";

// ✅ PostgreSQL (Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ===== INIT DB =====
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            username TEXT,
            score INTEGER DEFAULT 0
        )
    `);
    console.log("✅ DB ready");
}
initDB();

// ===== REGISTER =====
app.post("/register", async (req, res) => {
    const { email, user } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id",
            [email, user]
        );
        res.json({ ok: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ error: "exists" });
    }
});

// ===== GET SCORE BY ID =====
app.get("/score/:id", async (req, res) => {
    const result = await pool.query(
        "SELECT score FROM users WHERE id = $1",
        [req.params.id]
    );
    res.json({ score: result.rows[0]?.score || 0 });
});

// ===== ADD SCORE =====
app.post("/score", async (req, res) => {
    const { id, score } = req.body;

    const result = await pool.query(
        "UPDATE users SET score = score + $1 WHERE id = $2 RETURNING score",
        [score, id]
    );

    if (result.rowCount === 0)
        return res.status(404).json({ error: "user_not_found" });

    res.json({ ok: true });
});

// ===== ADMIN =====
app.post("/admin/users", async (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(403).json({ error: "forbidden" });

    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.json(result.rows);
});

app.listen(PORT, () =>
    console.log(`🚀 Server running on ${PORT}`)
);