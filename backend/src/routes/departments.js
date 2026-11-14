const express = require('express');
const router = express.Router();
const { getAllDepartments } = require('../repositories/departmentRepo');

router.get('/', async (req, res) => {
  try {
    const departments = await getAllDepartments();
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;