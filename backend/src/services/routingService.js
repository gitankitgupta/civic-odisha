const pool = require('../db');

// Maps grievance category to the department that handles it.
// Matches the seed data already in the departments table.
const CATEGORY_TO_DEPARTMENT = {
  pothole: 'PWD',
  road: 'PWD',
  other: 'PWD',
  garbage: 'Sanitation',
  drainage: 'Water Supply',
  streetlight: 'Electrical',
  water: 'Water Supply',
};

async function routeGrievance({ category, wardId }) {
  const departmentName = CATEGORY_TO_DEPARTMENT[category];

  if (!departmentName) {
    return {
      departmentId: null,
      routingReason: `No department mapping found for category "${category}" — sent to manual triage.`,
      routingConfidence: 0,
    };
  }

  const res = await pool.query(
    'SELECT id, ward_coverage FROM departments WHERE name = $1',
    [departmentName]
  );

  if (!res.rows.length) {
    return {
      departmentId: null,
      routingReason: `Department "${departmentName}" not found in reference data — sent to manual triage.`,
      routingConfidence: 0,
    };
  }

  const department = res.rows[0];
  const coversWard = !wardId || department.ward_coverage?.includes(wardId);

  if (!coversWard) {
    return {
      departmentId: department.id,
      routingReason: `Matched category "${category}" to ${departmentName}, but ward ${wardId} is outside its normal coverage — flagged for staff confirmation.`,
      routingConfidence: 0.5,
    };
  }

  return {
    departmentId: department.id,
    routingReason: `Routed to ${departmentName} based on category "${category}".`,
    routingConfidence: 0.9,
  };
}

module.exports = { routeGrievance };