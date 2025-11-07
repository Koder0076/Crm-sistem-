const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// створення БД
const db = new sqlite3.Database('./ecogo.db', (err) => {
  if (err) console.error(err);
  else console.log('✅ Підключено до SQLite');
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

// додати організацію
app.post('/add_org', (req, res) => {
  const { name, instagram, facebook, other, phone, address, founder, description } = req.body;

  db.run(
    `INSERT INTO organizations (name, instagram, facebook, other, phone, address, founder, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, instagram, facebook, other, phone, address, founder, description],
    function (err) {
      if (err) res.json({ message: 'Помилка при збереженні ❌' });
      else res.json({ message: 'Організацію збережено ✅' });
    }
  );
});

// пошук організації
app.get('/search_org', (req, res) => {
  const name = req.query.name;
  db.get(`SELECT * FROM organizations WHERE name = ?`, [name], (err, row) => {
    if (err) return res.json({ error: 'Помилка запиту ❌' });
    if (!row) return res.json({ error: 'Такої організації не знайдено ❌' });
    res.json(row);
  });
});

// завантажити всі записи у TXT
app.get('/download_all', (req, res) => {
  db.all(`SELECT * FROM organizations`, [], (err, rows) => {
    if (err) return res.send('Помилка при читанні бази ❌');

    let content = '=== Ecogo Organizations ===\n\n';
    rows.forEach(r => {
      content += `Назва: ${r.name}\nInstagram: ${r.instagram}\nFacebook: ${r.facebook}\nІнше: ${r.other}\nТелефон: ${r.phone}\nАдреса: ${r.address}\nЗасновник: ${r.founder}\nОпис: ${r.description}\n\n`;
    });

    const filePath = path.join(__dirname, 'organizations.txt');
    fs.writeFileSync(filePath, content);
    res.download(filePath);
  });
});

app.listen(PORT, () => console.log(`🚀 Сервер запущено на http://localhost:${PORT}`));