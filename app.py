from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# --- Ініціалізація бази даних ---
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("""
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
    """)
    conn.commit()
    conn.close()

init_db()

# --- Додавання організації ---
@app.route("/add_org", methods=["POST"])
def add_org():
    data = request.get_json()
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("""
        INSERT INTO organizations (name, instagram, facebook, other, phone, address, founder, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["name"], data["instagram"], data["facebook"], data["other"],
        data["phone"], data["address"], data["founder"], data["description"]
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Організацію збережено ✅"}), 201

# --- Пошук організації ---
@app.route("/search_org", methods=["GET"])
def search_org():
    name = request.args.get("name", "").lower()
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM organizations WHERE LOWER(name) = ?", (name,))
    row = c.fetchone()
    conn.close()

    if row:
        return jsonify(dict(row))
    else:
        return jsonify({"error": "Такої організації немає ❌"}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)