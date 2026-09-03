const express = require('express');
const router = express.Router();
const { computeCrsScore } = require('../services/crsEngine');
const queries = require('../db/queries');

router.post('/', async (req, res) => {
  try {
    const { productSN, scannerAddress, locationHash, locationName } = req.body;
    
    if (!productSN) {
      return res.status(400).json({ error: 'Product Serial Number is required' });
    }

    // 1. Fetch previous scan history from SQLite for behavioral analysis
    const priorScans = await queries.getScansBySN(productSN);
    const productRecord = await queries.getProductBySN(productSN);
    const provenancePath = await queries.getTransfersBySN(productSN);

    const now = Date.now();
    const scanCount = priorScans.length + 1;
    
    let minInterval = 86400; // Default 1 day
    let impossibleTravel = 0;
    let anomalyReason = 'Normal verification telemetry';

    if (priorScans.length > 0) {
      const lastScan = priorScans[0];
      const lastScanTime = new Date(lastScan.created_at).getTime();
      const elapsedSeconds = Math.max(1, Math.floor((now - lastScanTime) / 1000));
      minInterval = elapsedSeconds;

      // Detect impossible travel (< 1 hour across different locations)
      if (lastScan.location_name && locationName && lastScan.location_name !== locationName && elapsedSeconds < 3600) {
        impossibleTravel = 1;
        anomalyReason = `Impossible Travel: Product scanned in ${lastScan.location_name} ${Math.round(elapsedSeconds / 60)} mins ago`;
      } else if (elapsedSeconds < 60) {
        anomalyReason = `Rapid Burst Scan: Scanned twice in ${elapsedSeconds} seconds`;
      }
    }

    // Feature extraction vector for CRS engine
    const features = {
      f1: scanCount,
      f2: priorScans.length > 0 ? (scanCount / 24.0) : 0.05,
      f3: minInterval,
      f4: priorScans.length > 1 ? 120 : 15000,
      f5: Math.min(10, priorScans.length + 1),
      f6: impossibleTravel ? 5000 : 10,
      f7: impossibleTravel,
      f8: provenancePath.length || 3,
      f9: productRecord ? 0 : 1,
      f10: productRecord ? 1 : 0,
      f11: Math.min(10, priorScans.length + 1),
      f12: (productRecord && productRecord.status === 'Sold') ? 1 : 0
    };

    if (!productRecord) {
      anomalyReason = 'Supply Chain Insertion: Product serial number not registered by manufacturer';
    } else if (features.f12 === 1) {
      anomalyReason = 'Post-Sale Conflict: Product was already sold to a verified consumer';
    }

    const crsScore = computeCrsScore(features);
    let riskLevel = 'LOW';
    let isCounterfeit = 0;

    if (crsScore >= 0.8) {
      riskLevel = 'CRITICAL';
      isCounterfeit = 1;
    } else if (crsScore >= 0.5) {
      riskLevel = 'HIGH';
      isCounterfeit = 1;
    } else if (crsScore >= 0.2) {
      riskLevel = 'MEDIUM';
    }

    // 2. Persist this verification event into SQLite
    await queries.logScanEvent({
      product_sn: productSN,
      scanner_address: scannerAddress || '0x0000000000000000000000000000000000000000',
      location_name: locationName || 'Authorized Store',
      latitude: 0,
      longitude: 0,
      location_hash: locationHash || '',
      crs_score: crsScore,
      risk_level: riskLevel,
      anomaly_reason: anomalyReason,
      is_counterfeit: isCounterfeit
    });

    res.json({
      success: true,
      crs: crsScore,
      riskLevel: riskLevel,
      anomalyReason: anomalyReason,
      product: productRecord,
      provenancePath: provenancePath,
      scanHistory: priorScans,
      features: features
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
