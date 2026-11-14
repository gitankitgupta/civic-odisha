// Category severity weights — reflects real-world urgency/health-safety impact
const CATEGORY_SEVERITY = {
  water: 15,
  drainage: 15,
  pothole: 12,
  streetlight: 8,
  garbage: 6,
  other: 4,
};

/**
 * Calculates a transparent, explainable priority score for a grievance.
 * Returns both the final score and the individual factors behind it,
 * so the UI can show "why" instead of a black-box number.
 */
function calculatePriorityScore(grievance) {
  const upvoteScore = (grievance.upvotes || 0) * 3;

  const createdAt = new Date(grievance.createdAt);
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  const ageScore = daysOpen * 2;

  const severityScore = CATEGORY_SEVERITY[grievance.category] ?? CATEGORY_SEVERITY.other;

  const totalScore = upvoteScore + ageScore + severityScore;

  return {
    priorityScore: totalScore,
    priorityFactors: {
      upvotes: { value: grievance.upvotes || 0, points: upvoteScore },
      daysOpen: { value: daysOpen, points: ageScore },
      categorySeverity: { value: grievance.category, points: severityScore },
    },
  };
}

module.exports = { calculatePriorityScore };