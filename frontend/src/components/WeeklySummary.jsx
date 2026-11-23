import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

const WEEK = 7 * 86400000;

function getWard(address) {
  const m = String(address || '').match(/Ward\s*(\d+)/i);
  return m ? `Ward ${m[1]}` : null;
}

function topOf(list, getKey) {
  const counts = {};
  list.forEach((g) => {
    const key = getKey(g);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? { name: entries[0][0], count: entries[0][1] } : null;
}

export default function WeeklySummary() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  if (!items) return null;

  const now = Date.now();
  const recent = items.filter((g) => now - new Date(g.createdAt) <= WEEK);
  const resolvedWeek = items.filter(
    (g) => g.status === 'resolved' && now - new Date(g.updatedAt) <= WEEK
  );
  const overdue = items.filter((g) => g.slaStatus === 'overdue');

  const topCategory = topOf(recent, (g) => g.category);
  const topWard = topOf(recent, (g) => getWard(g.address));

  const lines = [];
  lines.push(
    recent.length === 0
      ? 'No new issues were reported in the last 7 days.'
      : `${recent.length} new ${recent.length === 1 ? 'issue was' : 'issues were'} reported in the last 7 days.`
  );
  if (topCategory) lines.push(`Most reported category: ${topCategory.name} (${topCategory.count}).`);
  if (topWard) lines.push(`Busiest area: ${topWard.name} (${topWard.count} new).`);
  lines.push(`${resolvedWeek.length} resolved this week.`);
  lines.push(
    overdue.length === 0
      ? 'No open issue is past its SLA deadline.'
      : `${overdue.length} open ${overdue.length === 1 ? 'issue is' : 'issues are'} past the SLA deadline.`
  );

  return (
    <div className="bg-[#F8FAF9] border border-[#E5EEEC] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#0B1F3A]">This week at a glance</h2>
        <span className="text-[11px] text-[#94A3B8]">Auto-generated from live data</span>
      </div>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="text-sm text-[#4B5A6B] flex gap-2">
            <span className="text-[#0EA5A0]">•</span>
            <span className="capitalize-first">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}