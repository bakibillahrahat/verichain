const db = require('./database');

// Helper to run query with Promise
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 1. Product Queries
async function saveProduct(product) {
  const sql = `
    INSERT OR REPLACE INTO products 
    (product_sn, name, brand, price, batch_id, manufacturer_address, current_owner, status, fingerprint, tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return await runAsync(sql, [
    product.product_sn,
    product.name,
    product.brand,
    product.price,
    product.batch_id || 'BATCH-01',
    product.manufacturer_address,
    product.current_owner || product.manufacturer_address,
    product.status || 'Registered',
    product.fingerprint || '',
    product.tx_hash || ''
  ]);
}

async function getProductBySN(sn) {
  return await getAsync(`SELECT * FROM products WHERE product_sn = ?`, [sn]);
}

async function getAllProducts(limit = 100) {
  return await allAsync(`SELECT * FROM products ORDER BY created_at DESC LIMIT ?`, [limit]);
}

// 2. Transfer Queries
async function recordTransfer(transfer) {
  const sql = `
    INSERT INTO transfers (product_sn, from_address, to_address, stage, location_hash, tx_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runAsync(sql, [
    transfer.product_sn,
    transfer.from_address,
    transfer.to_address,
    transfer.stage,
    transfer.location_hash || '',
    transfer.tx_hash || ''
  ]);

  // Update product current owner and status
  let newStatus = 'InTransit';
  if (transfer.stage.includes('Retailer')) newStatus = 'WithRetailer';
  if (transfer.stage.includes('Consumer')) newStatus = 'Sold';

  await runAsync(`UPDATE products SET current_owner = ?, status = ? WHERE product_sn = ?`, [
    transfer.to_address,
    newStatus,
    transfer.product_sn
  ]);
}

async function getTransfersBySN(sn) {
  return await allAsync(`SELECT * FROM transfers WHERE product_sn = ? ORDER BY created_at ASC`, [sn]);
}

// 3. Scan Event Queries
async function logScanEvent(scan) {
  const sql = `
    INSERT INTO scan_logs 
    (product_sn, scanner_address, location_name, latitude, longitude, location_hash, crs_score, risk_level, anomaly_reason, is_counterfeit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return await runAsync(sql, [
    scan.product_sn,
    scan.scanner_address,
    scan.location_name || 'Unknown',
    scan.latitude || 0,
    scan.longitude || 0,
    scan.location_hash || '',
    scan.crs_score,
    scan.risk_level,
    scan.anomaly_reason || '',
    scan.is_counterfeit || 0
  ]);
}

async function getScansBySN(sn) {
  return await allAsync(`SELECT * FROM scan_logs WHERE product_sn = ? ORDER BY created_at DESC`, [sn]);
}

async function getRecentScans(limit = 20) {
  return await allAsync(`SELECT * FROM scan_logs ORDER BY created_at DESC LIMIT ?`, [limit]);
}

// 4. Dashboard Metrics Aggregator
async function getDashboardStats() {
  const totalProductsRow = await getAsync(`SELECT COUNT(*) as count FROM products`);
  const totalScansRow = await getAsync(`SELECT COUNT(*) as count FROM scan_logs`);
  const counterfeitScansRow = await getAsync(`SELECT COUNT(*) as count FROM scan_logs WHERE is_counterfeit = 1 OR crs_score >= 0.8`);
  const genuineScansRow = await getAsync(`SELECT COUNT(*) as count FROM scan_logs WHERE crs_score < 0.5`);
  const entitiesRow = await getAsync(`SELECT COUNT(*) as count FROM entities`);

  const statusCounts = await allAsync(`SELECT status, COUNT(*) as count FROM products GROUP BY status`);

  return {
    totalProducts: totalProductsRow ? totalProductsRow.count : 0,
    totalScans: totalScansRow ? totalScansRow.count : 0,
    authenticScans: genuineScansRow ? genuineScansRow.count : 0,
    counterfeits: counterfeitScansRow ? counterfeitScansRow.count : 0,
    activeEntities: entitiesRow ? entitiesRow.count : 0,
    statusCounts: statusCounts || []
  };
}

// 5. Seed initial realistic dataset if DB is fresh
async function seedInitialData() {
  const countRow = await getAsync(`SELECT COUNT(*) as count FROM products`);
  if (countRow && countRow.count > 0) {
    return; // Already populated
  }

  console.log('Seeding initial SQLite database with demo supply-chain products and logs...');

  // Sample Products
  const sampleProducts = [
    { sn: 'SN-ROLEX-SUB-9941', name: 'Submariner Date', brand: 'Rolex', price: 10250, mfr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
    { sn: 'SN-IPHONE-15P-3882', name: 'iPhone 15 Pro Max', brand: 'Apple', price: 1199, mfr: '0x2e8f192B9c02A7E2b62C5dBf09b5A98F7b3f9A21' },
    { sn: 'SN-NIKE-AIR-7721', name: 'Air Jordan 1 Retro', brand: 'Nike', price: 210, mfr: '0x4a7B9302Cc4F9bE2a05d81C92a2B3f0892c90a12' },
    { sn: 'SN-SONY-WH-1000', name: 'WH-1000XM5 Headphones', brand: 'Sony', price: 399, mfr: '0x9561b34A81cB208F3a2A109E2B38A190cF83A1b0' },
    { sn: 'SN-CHANEL-NO5-4410', name: 'Chanel No. 5 Perfume', brand: 'Chanel', price: 165, mfr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
  ];

  for (const p of sampleProducts) {
    await saveProduct({
      product_sn: p.sn,
      name: p.name,
      brand: p.brand,
      price: p.price,
      batch_id: 'BATCH-2026-A',
      manufacturer_address: p.mfr,
      status: 'Registered',
      fingerprint: '0x' + Math.random().toString(16).substr(2, 64)
    });
  }

  // Sample Scans
  await logScanEvent({
    product_sn: 'SN-ROLEX-SUB-9941',
    scanner_address: '0x8F3A2b...2D1b',
    location_name: 'Tokyo, Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    crs_score: 0.89,
    risk_level: 'CRITICAL',
    anomaly_reason: 'Impossible Travel: Scanned in NYC 14 mins ago (Δd = 10,850 km)',
    is_counterfeit: 1
  });

  await logScanEvent({
    product_sn: 'SN-IPHONE-15P-3882',
    scanner_address: '0x71C765...3E8a',
    location_name: 'London, UK',
    latitude: 51.5074,
    longitude: -0.1278,
    crs_score: 0.12,
    risk_level: 'LOW',
    anomaly_reason: 'Valid provenance path, normal temporal spacing',
    is_counterfeit: 0
  });

  await logScanEvent({
    product_sn: 'SN-NIKE-AIR-7721',
    scanner_address: '0x9A2B09...F1c4',
    location_name: 'Berlin, Germany',
    latitude: 52.5200,
    longitude: 13.4050,
    crs_score: 0.74,
    risk_level: 'HIGH',
    anomaly_reason: 'High frequency burst: 12 scans in 3 mins from different IPs',
    is_counterfeit: 1
  });

  console.log('SQLite initial seeding complete.');
}

const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

async function seedDefaultAccounts() {
  const accounts = [
    {
      address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
      email: 'manufacturer@rolex.com',
      password_hash: hashPassword('rolex123'),
      role: 'Manufacturer',
      name: 'Rolex Geneva SA',
      brand: 'Rolex',
      code: 'MFR-ROLEX',
      location: 'Geneva, Switzerland'
    },
    {
      address: '0x9a2b09fe14c2b3f0892c90a1209b5a98f7b3f9a2',
      email: 'buyer@retail.com',
      password_hash: hashPassword('buyer123'),
      role: 'Buyer',
      name: 'Authorized Retail Partner',
      brand: 'VeriChain Certified',
      code: 'SL-1001',
      location: 'Paris Flagship'
    },
    {
      address: '0x3d7f129a88c02b94107e580b4c91b872d80219aa',
      email: 'admin@verichain.com',
      password_hash: hashPassword('admin123'),
      role: 'Security Admin',
      name: 'VeriChain Threat Intel Unit',
      brand: 'Enterprise CACD Defense',
      code: 'ADMIN-SEC-01',
      location: 'Zurich Security Operations Center'
    }
  ];

  for (const acc of accounts) {
    await runAsync(`
      INSERT INTO entities (address, email, password_hash, role, name, brand, code, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        role = excluded.role,
        name = excluded.name,
        brand = excluded.brand,
        code = excluded.code,
        location = excluded.location
    `, [acc.address, acc.email, acc.password_hash, acc.role, acc.name, acc.brand, acc.code, acc.location]).catch(() => {});
  }
}

// Auto seed on boot
seedInitialData().catch(console.error);
seedDefaultAccounts().catch(console.error);

module.exports = {
  saveProduct,
  getProductBySN,
  getAllProducts,
  recordTransfer,
  getTransfersBySN,
  logScanEvent,
  getScansBySN,
  getRecentScans,
  getDashboardStats,
  hashPassword,
  seedDefaultAccounts
};

