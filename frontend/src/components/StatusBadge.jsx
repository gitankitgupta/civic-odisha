const statusConfig = {
  submitted: { label: 'Submitted', color: 'bg-text-muted/20 text-text-muted' },
  in_progress: { label: 'In Progress', color: 'bg-accent-warn/20 text-accent-warn' },
  resolved: { label: 'Resolved', color: 'bg-accent/20 text-accent' },
  closed: { label: 'Closed', color: 'bg-border text-text-muted' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.submitted;

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}