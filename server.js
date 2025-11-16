const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./ecogo.db', (err) => {
  if (err) console.error(err);
  else console.log('SQLite підключено');
});

db.run(`
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  instagram TEXT,
  facebook TEXT,
  other TEXT,
  phone TEXT,
  address TEXT,
  founder TEXT,
  description TEXT
)
`);

app.post('/add_org', (req, res) => {
  const { name, instagram, facebook, other, phone, address, founder, description } = req.body;

  db.run(
    `INSERT INTO organizations (name, instagram, facebook, other, phone, address, founder, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, instagram, facebook, other, phone, address, founder, description],
    err => {
      if (err) res.json({ message: 'Помилка ❌' });
      else res.json({ message: 'Організацію збережено ✅' });
    }
  );
});

/* ===== Отримати всі ===== */
app.get('/get_all', (req, res) => {
  db.all(`SELECT * FROM organizations`, [], (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

/* ===== Видалити вибрані ===== */
app.post('/delete_selected', (req, res) => {
  const ids = req.body.ids;

  if (!ids || ids.length === 0) return res.json({ status: "empty" });

  const placeholders = ids.map(() => '?').join(',');

  db.run(`DELETE FROM organizations WHERE id IN (${placeholders})`, ids, err => {
    if (err) res.json({ status: "error" });
    else res.json({ status: "ok" });
  });
});

/* ===== Завантажити TXT ===== */
app.get('/download_all', (req, res) => {
  db.all(`SELECT * FROM organizations`, [], (err, rows) => {
    if (err) return res.send('Помилка ❌');

    let content = '=== Ecogo Organizations ===\n\n';
    rows.forEach(r => {
      content += `Назва: ${r.name}
Instagram: ${r.instagram}
Facebook: ${r.facebook}
Інше: ${r.other}
Телефон: ${r.phone}
Адреса: ${r.address}
Засновник: ${r.founder}
Опис: ${r.description}\n\n`;
    });

    const filePath = path.join(__dirname, 'organizations.txt');
    fs.writeFileSync(filePath, content);
    res.download(filePath);
  });
});

app.listen(PORT, () =>
  console.log(`Сервер працює: http://localhost:${PORT}`)
);