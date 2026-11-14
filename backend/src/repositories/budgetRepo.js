const pool = require('../db');

function mapRowToProposal(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    estimatedCost: row.estimated_cost,
    wardId: row.ward_id,
    sourceGrievanceIds: row.source_grievance_ids || [],
    votes: { up: row.votes_up, down: row.votes_down },
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getAllProposals() {
  const res = await pool.query('SELECT * FROM budget_proposals ORDER BY created_at DESC');
  return res.rows.map(mapRowToProposal);
}

async function getProposalById(id) {
  const res = await pool.query('SELECT * FROM budget_proposals WHERE id = $1', [id]);
  if (!res.rows[0]) return null;
  return mapRowToProposal(res.rows[0]);
}

async function createProposal(data) {
  const insertRes = await pool.query(
    `INSERT INTO budget_proposals
      (title, description, estimated_cost, ward_id, source_grievance_ids, votes_up, votes_down, status)
     VALUES ($1,$2,$3,$4,$5,0,0,'proposed')
     RETURNING *`,
    [
      data.title,
      data.description,
      data.estimatedCost,
      data.wardId,
      data.sourceGrievanceIds || [],
    ]
  );
  return mapRowToProposal(insertRes.rows[0]);
}

async function voteOnProposal(id, voterId, voteType) {
  const proposal = await getProposalById(id);
  if (!proposal) return null;

  try {
    await pool.query(
      `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1,$2,$3)`,
      [id, voterId, voteType]
    );
  } catch (err) {
    // unique_violation = user already voted on this proposal (enforced at DB level)
    if (err.code === '23505') {
      return { error: 'already_voted' };
    }
    throw err;
  }

  const column = voteType === 'up' ? 'votes_up' : 'votes_down';
  const updateRes = await pool.query(
    `UPDATE budget_proposals SET ${column} = ${column} + 1 WHERE id = $1 RETURNING *`,
    [id]
  );

  return mapRowToProposal(updateRes.rows[0]);
}

module.exports = {
  getAllProposals,
  getProposalById,
  createProposal,
  voteOnProposal,
};