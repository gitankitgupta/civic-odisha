const pool = require('../db');
const { calculateSimilarity, isNearby } = require('../utils/similarity');
const { detectLanguage } = require('../utils/language');
const { routeGrievance } = require('../services/routingService');
const { calculatePriorityScore } = require('../utils/priority');
const { calculateSlaStatus } = require('../utils/sla');
const { semanticSimilarity } = require('../services/embeddingService');

// Rebuilds the same object shape the old in-memory version returned,
// so routes/business logic don't need to change their expectations.
async function mapRowToGrievance(row) {
  const mediaRes = await pool.query(
    'SELECT type, url FROM grievance_media WHERE grievance_id = $1',
    [row.id]
  );
  const auditRes = await pool.query(
    `SELECT action, actor_role AS actor, note, created_at AS timestamp
     FROM audit_events WHERE grievance_id = $1 ORDER BY created_at ASC`,
    [row.id]
  );

  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    citizenId: row.is_anonymous ? null : row.citizen_id,
    isAnonymous: row.is_anonymous,
    location: { lat: row.latitude, lng: row.longitude, wardId: row.ward_id },
    address: row.address,
    media: mediaRes.rows,
    duplicateOf: row.duplicate_of,
    similarityScore: row.similarity_score,
    departmentId: row.department_id,
    routingReason: row.routing_reason,
    routingConfidence: row.routing_confidence,
    upvotes: row.upvotes,
    language: row.language,
    auditTrail: auditRes.rows,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const { priorityScore, priorityFactors } = calculatePriorityScore(base);
  const { slaDueAt, slaHours, slaStatus } = calculateSlaStatus(base);

  return { ...base, priorityScore, priorityFactors, slaDueAt, slaHours, slaStatus };
}

async function findPossibleDuplicate(data) {
  const res = await pool.query(
    `SELECT * FROM grievances WHERE category = $1 AND status != 'resolved'`,
    [data.category]
  );

  let bestMatch = null;
  let bestScore = 0;
  let usedSemantic = false;

  for (const g of res.rows) {
    const gLocation = { lat: g.latitude, lng: g.longitude, wardId: g.ward_id };
    if (!isNearby(gLocation, data.location)) continue;

    const textA = `${g.title} ${g.description}`;
    const textB = `${data.title} ${data.description}`;

    let score = await semanticSimilarity(textA, textB);

    if (score === null) {
      // Fallback: Hugging Face unavailable, use the original Jaccard method
      score = calculateSimilarity(textA, textB);
    } else {
      usedSemantic = true;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = g;
    }
  }

  // Semantic embeddings are more forgiving of different wording,
  // so we use a slightly higher threshold than plain Jaccard.
  const threshold = usedSemantic ? 0.55 : 0.4;

  if (bestMatch && bestScore > threshold) {
    return { id: bestMatch.id, score: bestScore, method: usedSemantic ? 'semantic' : 'jaccard' };
  }
  return null;
}

async function createGrievance(data) {
  const duplicate = await findPossibleDuplicate(data);
  const language = detectLanguage(`${data.title} ${data.description}`);
  const routing = await routeGrievance({ category: data.category, wardId: data.location?.wardId });

  const insertRes = await pool.query(
    `INSERT INTO grievances
      (title, description, category, status, citizen_id, is_anonymous, latitude, longitude, address, ward_id, duplicate_of, similarity_score, upvotes, language, department_id, routing_reason, routing_confidence)
     VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,$8,$9,$10,$11,0,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.title,
      data.description,
      data.category,
      data.citizenId || null,
      data.isAnonymous || false,
      data.location?.lat || null,
      data.location?.lng || null,
      data.address || null,
      data.location?.wardId || null,
      duplicate ? duplicate.id : null,
      duplicate ? duplicate.score : null,
      language,
      routing.departmentId,
      routing.routingReason,
      routing.routingConfidence,
    ]
  );

  const grievance = insertRes.rows[0];

  if (data.media && data.media.length) {
    for (const m of data.media) {
      await pool.query(
        'INSERT INTO grievance_media (grievance_id, type, url) VALUES ($1,$2,$3)',
        [grievance.id, m.type, m.url]
      );
    }
  }

  await pool.query(
    `INSERT INTO audit_events (grievance_id, action, actor_role, note)
     VALUES ($1, 'submitted', $2, $3)`,
    [
      grievance.id,
      data.citizenId || 'anonymous',
      duplicate
        ? `Possible duplicate of grievance #${duplicate.id}`
        : 'Grievance submitted',
    ]
  );

  return mapRowToGrievance(grievance);
}

async function getAllGrievances() {
  const res = await pool.query('SELECT * FROM grievances ORDER BY created_at DESC');
  return Promise.all(res.rows.map(mapRowToGrievance));
}

async function getGrievanceById(id) {
  const res = await pool.query('SELECT * FROM grievances WHERE id = $1', [id]);
  if (!res.rows[0]) return null;
  return mapRowToGrievance(res.rows[0]);
}

async function updateGrievanceStatus(id, { status, note, actor }) {
  const updateRes = await pool.query(
    `UPDATE grievances SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id]
  );

  if (!updateRes.rows[0]) return null;

  await pool.query(
    `INSERT INTO audit_events (grievance_id, action, actor_role, note)
     VALUES ($1, $2, $3, $4)`,
    [
      id,
      `status_changed_to_${status}`,
      actor || 'department_staff',
      note || `Status updated to ${status}`,
    ]
  );

  return mapRowToGrievance(updateRes.rows[0]);
}

async function upvoteGrievance(id) {
  const res = await pool.query(
    `UPDATE grievances SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!res.rows[0]) return null;
  return mapRowToGrievance(res.rows[0]);
}

async function getPublicGrievanceById(id) {
  const grievance = await getGrievanceById(id);
  if (!grievance) return null;

  const { citizenId, ...publicGrievance } = grievance;
  return publicGrievance;
}

module.exports = {
  createGrievance,
  getAllGrievances,
  getGrievanceById,
  getPublicGrievanceById,
  updateGrievanceStatus,
  upvoteGrievance,
};