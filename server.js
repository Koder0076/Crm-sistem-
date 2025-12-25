const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;
const db = new sqlite3.Database("./users.db");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Таблиця з додатковим полем score
db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    user TEXT,
    score INTEGER DEFAULT 0
)
`);

// Перевірка користувача
app.post("/check", (req, res) => {
    const { email } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (row) res.json({ exists: true, user: row });
        else res.json({ exists: false });
    });
});

// Реєстрація
app.post("/register", (req, res) => {
    const { email, user } = req.body;
    db.run(
        "INSERT INTO users (email, user) VALUES (?, ?)",
        [email, user],
        function () {
            res.json({ id: this.lastID });
        }
    );
});

// Оновлення очок
app.post("/score", (req, res) => {
    const { email, score } = req.body;
    db.run(
        "UPDATE users SET score = ? WHERE email = ?",
        [score, email],
        function(err) {
            if (err) res.status(500).send("Помилка оновлення очок");
            else res.send("Очки оновлено");
        }
    );
});

// Отримати очки користувача
app.get("/score/:email", (req, res) => {
    const email = req.params.email;
    db.get("SELECT score FROM users WHERE email = ?", [email], (err, row) => {
        if (err) res.status(500).send("Помилка бази");
        else res.json({ score: row ? row.score : 0 });
    });
});

// Запуск сервера
app.listen(PORT, () => console.log(`✅ Сервер запущено на http://localhost:${PORT}`));