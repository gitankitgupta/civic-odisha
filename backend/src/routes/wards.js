const express = require('express');
const router = express.Router();
const { getAllWards } = require('../repositories/departmentRepo');

router.get('/', async (req, res) => {
  try {
    const wards = await getAllWards();
    res.json(wards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

module.exports = router;