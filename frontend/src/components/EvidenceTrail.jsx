export default function EvidenceTrail({ auditTrail = [], compact = false }) {
  if (!auditTrail.length) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {auditTrail.map((entry, index) => {
        const isLast = index === auditTrail.length - 1;
        return (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1" />
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className={isLast ? 'pb-0' : 'pb-3'}>
              <p className="text-sm text-text-primary">{entry.note}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {entry.actor} · {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}