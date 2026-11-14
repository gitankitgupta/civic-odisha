const pool = require('../db');

async function addResolutionEvidence(grievanceId, { staffId, mediaUrl, note, evidenceType }) {
  const res = await pool.query(
    `INSERT INTO resolution_evidence (grievance_id, staff_id, media_url, note, evidence_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [grievanceId, staffId || null, mediaUrl, note, evidenceType || 'photo']
  );
  return res.rows[0];
}

async function getResolutionEvidence(grievanceId) {
  const res = await pool.query(
    `SELECT id, staff_id AS "staffId", media_url AS "mediaUrl", note, evidence_type AS "evidenceType", created_at AS "createdAt"
     FROM resolution_evidence WHERE grievance_id = $1 ORDER BY created_at ASC`,
    [grievanceId]
  );
  return res.rows;
}

module.exports = { addResolutionEvidence, getResolutionEvidence };