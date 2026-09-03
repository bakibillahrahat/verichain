const express = require('express');
const router = express.Router();
const queries = require('../db/queries');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await queries.getAllProducts();
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/:sn
router.get('/:sn', async (req, res) => {
  try {
    const sn = req.params.sn;
    const product = await queries.getProductBySN(sn);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const transfers = await queries.getTransfersBySN(sn);
    const scans = await queries.getScansBySN(sn);

    res.json({
      success: true,
      product,
      provenance: transfers,
      scans
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

