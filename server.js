const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "dandelion0514";

// Render-safe DB path
const db = new sqlite3.Database(path.join(__dirname, "users.db"));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    user TEXT,
    score INTEGER DEFAULT 0
)
`);

// ===== REGISTER =====
app.post("/register", (req, res) => {
    const { email, user } = req.body;
    db.run(
        "INSERT INTO users (email, user) VALUES (?, ?)",
        [email, user],
        function (err) {
            if (err) return res.status(400).json({ error: "exists" });
            res.json({ id: this.lastID });
        }
    );
});

// ===== GET SCORE =====
app.get("/score/:email", (req, res) => {
    db.get(
        "SELECT score FROM users WHERE email = ?",
        [req.params.email],
        (_, row) => res.json({ score: row ? row.score : 0 })
    );
});

// ===== SAVE SCORE =====
app.post("/score", (req, res) => {
    const { email, score } = req.body;
    db.run(
        "UPDATE users SET score = score + ? WHERE email = ?",
        [score, email],
        () => res.json({ ok: true })
    );
});

// ===== ADMIN LOGIN =====
app.post("/admin/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.json({ ok: true });
    } else {
        res.status(401).json({ ok: false });
    }
});

// ===== ADMIN USERS (PROTECTED) =====
app.post("/admin/users", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: "forbidden" });
    }

    db.all("SELECT * FROM users", [], (_, rows) => {
        res.json(rows);
    });
});

app.listen(PORT, () =>
    console.log(`✅ Server running on port ${PORT}`)
);