const express = require('express');
const router = express.Router();
const queries = require('../db/queries');
const db = require('../db/database');

// Helper for promise-based query
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// POST /api/auth/register (Create Enterprise Account)
router.post('/register', async (req, res) => {
  try {
    const { email, password, address, role, name, brand, code, phone, manager, location } = req.body;

    if (!role || !name) {
      return res.status(400).json({ success: false, error: 'Name and Role are required.' });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanAddr = address ? address.toLowerCase().trim() : ('0x' + crypto.randomBytes(20).toString('hex'));
    const passwordHash = password ? hashPassword(password) : null;
    const entityCode = code || (role === 'Manufacturer' ? 'MFR-' + Math.floor(1000 + Math.random()*9000) : 'SL-' + Math.floor(1000 + Math.random()*9000));

    // Check if email already registered
    if (cleanEmail) {
      const existing = await getAsync(`SELECT * FROM entities WHERE LOWER(email) = ?`, [cleanEmail]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered. Please sign in.' });
      }
    }

    const sql = `
      INSERT INTO entities (address, email, password_hash, role, name, brand, code, phone, manager, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        email = COALESCE(excluded.email, entities.email),
        password_hash = COALESCE(excluded.password_hash, entities.password_hash),
        role = excluded.role,
        name = excluded.name,
        brand = excluded.brand,
        code = excluded.code,
        phone = excluded.phone,
        manager = excluded.manager,
        location = excluded.location
    `;

    await runAsync(sql, [cleanAddr, cleanEmail, passwordHash, role, name, brand || '', entityCode, phone || '', manager || '', location || '']);
    
    const profile = await getAsync(`SELECT id, address, email, role, name, brand, code, phone, manager, location, created_at FROM entities WHERE address = ?`, [cleanAddr]);

    res.json({
      success: true,
      message: 'Account registered successfully',
      profile
    });
  } catch (err) {
    console.error('Auth register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login (Verify Credentials)
router.post('/login', async (req, res) => {
  try {
    const { emailOrAddress, password, role } = req.body;

    if (!emailOrAddress && !password) {
      return res.status(400).json({ success: false, error: 'Please enter your email/wallet address and password.' });
    }

    const queryTarget = (emailOrAddress || '').toLowerCase().trim();

    // Query by email, address, or code
    let user = await getAsync(
      `SELECT * FROM entities WHERE LOWER(email) = ? OR LOWER(address) = ? OR code = ?`,
      [queryTarget, queryTarget, queryTarget]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Account not found. Please register an enterprise account first.'
      });
    }

    // If account has a password, verify it
    if (user.password_hash && password) {
      const providedHash = hashPassword(password);
      if (providedHash !== user.password_hash) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password. Please verify your credentials.'
        });
      }
    }

    // Role check if specific role requested
    if (role && user.role !== role && user.role !== 'Security Admin') {
      return res.status(403).json({
        success: false,
        error: `Account role mismatch: This account is registered as ${user.role}, not ${role}.`
      });
    }

    // Sanitize user object (never return password_hash)
    const { password_hash, ...safeProfile } = user;

    res.json({
      success: true,
      message: 'Authenticated successfully',
      profile: safeProfile
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/profile/:address
router.get('/profile/:address', async (req, res) => {
  try {
    const profile = await getAsync(`SELECT * FROM entities WHERE LOWER(address) = ?`, [req.params.address.toLowerCase()]);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

