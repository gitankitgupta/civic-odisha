const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyCitizen } = require('../middleware/verifyCitizen');
const { getAllGrievances } = require('../repositories/grievanceRepo');

// Called after successful OTP verification on the frontend.
// Creates a citizen profile row if one doesn't exist yet (using the
// Supabase Auth user's own UUID as the id), otherwise returns the existing one.
router.post('/profile', verifyCitizen, async (req, res) => {
  try {
    const { id, email } = req.citizen;

    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (existing.rows[0]) {
      return res.json(existing.rows[0]);
    }

    const insertRes = await pool.query(
      `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, 'citizen') RETURNING *`,
      [id, null, email]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create/fetch citizen profile' });
  }
});

// Updates the citizen's display name (used by the "Complete your profile" step).
router.patch('/profile', verifyCitizen, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updateRes = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING *`,
      [name.trim(), req.citizen.id]
    );

    if (!updateRes.rows[0]) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Returns the currently authenticated citizen's own profile.
router.get('/profile', verifyCitizen, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.citizen.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Returns only the grievances submitted by the currently authenticated citizen.
router.get('/my-grievances', verifyCitizen, async (req, res) => {
  try {
    const allGrievances = await getAllGrievances();
    const myGrievances = allGrievances.filter((g) => g.citizenId === req.citizen.id);
    res.json(myGrievances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your grievances' });
  }
});

module.exports = router;