const express = require('express');
const router = express.Router();
const queries = require('../db/queries');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await queries.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/recent-scans
router.get('/recent-scans', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const scans = await queries.getRecentScans(limit);
    res.json({
      success: true,
      data: scans
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dashboard/simulate
router.post('/simulate', async (req, res) => {
  try {
    const { type, productSN, location } = req.body;
    let scanData = {};

    if (type === 'clone') {
      scanData = {
        product_sn: productSN || 'SN-ROLEX-SUB-9941',
        scanner_address: '0x33A1b0...2E90',
        location_name: location || 'Tokyo, Japan',
        latitude: 35.6762,
        longitude: 139.6503,
        crs_score: 0.94,
        risk_level: 'CRITICAL',
        anomaly_reason: 'Impossible Travel: Product scanned in Paris 10 mins ago (Velocity = 6,800 km/h)',
        is_counterfeit: 1
      };
    } else if (type === 'replay') {
      scanData = {
        product_sn: productSN || 'SN-NIKE-AIR-7721',
        scanner_address: '0x992B...F1c4',
        location_name: location || 'Moscow, Russia',
        latitude: 55.7558,
        longitude: 37.6173,
        crs_score: 0.88,
        risk_level: 'CRITICAL',
        anomaly_reason: 'Replay Burst Anomaly: 20 rapid scans with identical nonce signature',
        is_counterfeit: 1
      };
    } else if (type === 'orphan') {
      scanData = {
        product_sn: productSN || 'SN-ROGUE-ITEM-001',
        scanner_address: '0x1245...AA99',
        location_name: location || 'São Paulo, Brazil',
        latitude: -23.5505,
        longitude: -46.6333,
        crs_score: 1.00,
        risk_level: 'CRITICAL',
        anomaly_reason: 'Supply Chain Insertion: Product SN has no manufacturer block record in ProductRegistry',
        is_counterfeit: 1
      };
    } else {
      // Genuine
      scanData = {
        product_sn: productSN || 'SN-IPHONE-15P-3882',
        scanner_address: '0x71C765...3E8a',
        location_name: location || 'London, UK',
        latitude: 51.5074,
        longitude: -0.1278,
        crs_score: 0.11,
        risk_level: 'LOW',
        anomaly_reason: 'Single authentic scan at certified retail location',
        is_counterfeit: 0
      };
    }

    const result = await queries.logScanEvent(scanData);
    res.json({
      success: true,
      event: { id: result.id, ...scanData }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

