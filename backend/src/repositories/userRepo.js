const bcrypt = require('bcryptjs');
const pool = require('../db');

async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const res = await pool.query(
    `INSERT INTO users (name, email, password, role, ward_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.name,
      data.email,
      hashedPassword,
      data.role || 'citizen',
      data.wardId || null,
    ]
  );

  return mapRowToUser(res.rows[0]);
}

async function getUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!res.rows[0]) return null;
  return mapRowToUser(res.rows[0]);
}

async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!res.rows[0]) return null;
  return mapRowToUser(res.rows[0]);
}

function mapRowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    wardId: row.ward_id,
    createdAt: row.created_at,
  };
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
};