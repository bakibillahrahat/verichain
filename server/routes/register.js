const express = require('express');
const router = express.Router();
const queries = require('../db/queries');

router.post('/', async (req, res) => {
  try {
    const { productSN, productName, productBrand, productPrice, batchId, manufacturerAddress, txHash } = req.body;
    
    if (!productSN || !productName) {
      return res.status(400).json({ success: false, error: 'Product SN and Name are required' });
    }

    const result = await queries.saveProduct({
      product_sn: productSN,
      name: productName,
      brand: productBrand || 'Generic',
      price: parseFloat(productPrice) || 0,
      batch_id: batchId || 'BATCH-01',
      manufacturer_address: manufacturerAddress || '0x0000000000000000000000000000000000000000',
      status: 'Registered',
      tx_hash: txHash || ''
    });

    res.json({
      success: true,
      message: 'Product registered and cached in SQLite successfully',
      productId: result.id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
