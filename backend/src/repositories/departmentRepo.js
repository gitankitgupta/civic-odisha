const pool = require('../db');

async function getAllDepartments() {
  const res = await pool.query('SELECT * FROM departments ORDER BY id ASC');
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    contactHandle: row.contact_handle,
    wardCoverage: row.ward_coverage,
  }));
}

async function getAllWards() {
  const res = await pool.query('SELECT * FROM wards ORDER BY id ASC');
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    population: row.population,
    budgetPool: row.budget_pool,
  }));
}

module.exports = { getAllDepartments, getAllWards };