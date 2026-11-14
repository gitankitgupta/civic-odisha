export default function PriorityBadge({ score, factors }) {
  const tier =
    score >= 30 ? 'high' : score >= 15 ? 'medium' : 'low';

  const tierStyles = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-slate-100 text-slate-600 border-slate-300',
  };

  const tierLabel = {
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority',
  };

  const tooltip = factors
    ? `Supporters: +${factors.upvotes.points} (${factors.upvotes.value})\n` +
      `Days open: +${factors.daysOpen.points} (${factors.daysOpen.value}d)\n` +
      `Category severity: +${factors.categorySeverity.points} (${factors.categorySeverity.value})`
    : '';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${tierStyles[tier]}`}
    >
      {tierLabel[tier]} · {score}
    </span>
  );
}