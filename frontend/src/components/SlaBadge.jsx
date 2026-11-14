export default function SlaBadge({ slaStatus, slaDueAt }) {
  if (slaStatus === 'stopped') return null; // don't show for resolved/in-progress

  const isOverdue = slaStatus === 'overdue';

  const dueLabel = new Date(slaDueAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <span
      title={isOverdue ? `Overdue since ${dueLabel}` : `Due by ${dueLabel}`}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${
        isOverdue
          ? 'bg-red-100 text-red-700 border-red-300'
          : 'bg-emerald-50 text-emerald-700 border-emerald-300'
      }`}
    >
      {isOverdue ? '⚠ Overdue' : `On time · due ${dueLabel}`}
    </span>
  );
}