const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "dandelion0514";

const db = new sqlite3.Database(path.join(__dirname, "users.db"));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ===== TABLE =====
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
    if (!email || !user)
        return res.status(400).json({ error: "missing_data" });

    db.run(
        "INSERT INTO users (email, user) VALUES (?, ?)",
        [email, user],
        function (err) {
            if (err)
                return res.status(400).json({ error: "exists" });

            res.json({ ok: true, id: this.lastID });
        }
    );
});

// ===== GET SCORE BY ID =====
app.get("/score/:id", (req, res) => {
    db.get(
        "SELECT score FROM users WHERE id = ?",
        [req.params.id],
        (err, row) => {
            if (err)
                return res.status(500).json({ error: "db_error" });

            res.json({ score: row ? row.score : 0 });
        }
    );
});

// ===== ADD SCORE BY ID =====
app.post("/score", (req, res) => {
    const { id, score } = req.body;

    db.run(
        "UPDATE users SET score = score + ? WHERE id = ?",
        [score, id],
        function (err) {
            if (err)
                return res.status(500).json({ error: "db_error" });

            if (this.changes === 0)
                return res.status(404).json({ error: "user_not_found" });

            res.json({ ok: true });
        }
    );
});

// ===== ADMIN =====
app.post("/admin/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD)
        res.json({ ok: true });
    else
        res.status(401).json({ ok: false });
});

app.post("/admin/users", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(403).json({ error: "forbidden" });

    db.all("SELECT * FROM users", [], (_, rows) => res.json(rows));
});

app.listen(PORT, () =>
    console.log(`✅ Server running on port ${PORT}`)
);