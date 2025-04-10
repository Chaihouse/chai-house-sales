const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Database setup
const db = new sqlite3.Database('./sales.db', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Create sales table if not exists
// Replace the existing db.run() with:
db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      customer_name TEXT,
      date TEXT NOT NULL,
      payment_mode TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    )
  `);

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve frontend files

// API: Add a new sale
app.post('/api/sales', (req, res) => {
  const { date, item_name, quantity, price, payment_mode } = req.body;
  const total = quantity * price;

  db.run(
    `INSERT INTO sales (date, item_name, quantity, price, total, payment_mode) VALUES (?, ?, ?, ?, ?, ?)`,
    [date, item_name, quantity, price, total, payment_mode],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// API: Get sales by date
app.get('/api/sales/:date', (req, res) => {
  const { date } = req.params;
  db.all(
    `SELECT * FROM sales WHERE date = ? ORDER BY id DESC`,
    [date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});