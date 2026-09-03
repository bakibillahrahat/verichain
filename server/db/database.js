const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'verichain.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Initialize Tables
db.serialize(() => {
  // 1. Products Table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sn TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      price REAL NOT NULL,
      batch_id TEXT,
      manufacturer_address TEXT NOT NULL,
      current_owner TEXT,
      status TEXT DEFAULT 'Registered',
      fingerprint TEXT,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Supply Chain Entities (Manufacturers, Distributors, Retailers, Security Admins)
  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      code TEXT UNIQUE,
      phone TEXT,
      manager TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Safe migrations for existing SQLite database
  db.run(`ALTER TABLE entities ADD COLUMN email TEXT`, () => {});
  db.run(`ALTER TABLE entities ADD COLUMN password_hash TEXT`, () => {});

  // 3. Provenance Transfer History
  db.run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sn TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      stage TEXT NOT NULL,
      location_hash TEXT,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_sn) REFERENCES products (product_sn)
    )
  `);

  // 4. Immutable Scan Event Logs & CACD Telemetry
  db.run(`
    CREATE TABLE IF NOT EXISTS scan_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sn TEXT NOT NULL,
      scanner_address TEXT NOT NULL,
      location_name TEXT,
      latitude REAL,
      longitude REAL,
      location_hash TEXT,
      crs_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      anomaly_reason TEXT,
      is_counterfeit INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Indexes for fast querying
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_sn ON products(product_sn)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scan_sn ON scan_logs(product_sn)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transfers_sn ON transfers(product_sn)`);
});

module.exports = db;

