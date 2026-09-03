const express = require('express');
const router = express.Router();
const queries = require('../db/queries');

router.post('/', async (req, res) => {
  try {
    const { productSN, fromAddress, toAddress, stage, locationHash, txHash } = req.body;
    
    if (!productSN || !toAddress) {
      return res.status(400).json({ success: false, error: 'Product SN and recipient address are required' });
    }

    await queries.recordTransfer({
      product_sn: productSN,
      from_address: fromAddress || '0x0000000000000000000000000000000000000000',
      to_address: toAddress,
      stage: stage || 'Transfer',
      location_hash: locationHash || '',
      tx_hash: txHash || ''
    });

    res.json({
      success: true,
      message: 'Provenance transfer recorded in SQLite'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
