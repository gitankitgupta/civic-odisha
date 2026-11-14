// SLA targets in hours — how long a grievance can stay in "submitted"
// before it's considered overdue and gets escalated.
const SLA_HOURS = {
  water: 24,
  drainage: 24,
  pothole: 72,
  streetlight: 96,
  garbage: 48,
  other: 120,
};

function getSlaHours(category) {
  return SLA_HOURS[category] ?? SLA_HOURS.other;
}

/**
 * Given a grievance's category, status, and createdAt, returns
 * the SLA due date and whether it's currently overdue.
 * Only "submitted" grievances are tracked — once work has started
 * (in_progress) or finished (resolved), the SLA clock is considered stopped.
 */
function calculateSlaStatus(grievance) {
  const hours = getSlaHours(grievance.category);
  const createdAt = new Date(grievance.createdAt);
  const dueAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);

  const isOverdue = grievance.status === 'submitted' && Date.now() > dueAt.getTime();

  return {
    slaDueAt: dueAt.toISOString(),
    slaHours: hours,
    slaStatus: grievance.status !== 'submitted' ? 'stopped' : isOverdue ? 'overdue' : 'on_time',
  };
}

module.exports = { calculateSlaStatus, getSlaHours };