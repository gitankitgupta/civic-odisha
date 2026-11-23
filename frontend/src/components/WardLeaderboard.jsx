import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function getWard(address) {
  const m = String(address || '').match(/Ward\s*(\d+)/i);
  return m ? `Ward ${m[1]}` : null;
}

export default function WardLeaderboard() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  if (!items) return null;

  const map = {};
  items.forEach((g) => {
    const ward = getWard(g.address);
    if (!ward) return;
    if (!map[ward]) map[ward] = { ward, total: 0, resolved: 0 };
    map[ward].total += 1;
    if (g.status === 'resolved') map[ward].resolved += 1;
  });

  const rows = Object.values(map)
    .sort((a, b) => b.resolved - a.resolved || b.total - a.total)
    .slice(0, 5);

  if (rows.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <section className="max-w-xl mx-auto px-6 pb-10">
      <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
        Ward leaderboard
      </h2>
      <div className="bg-white border border-[#E5EEEC] rounded-2xl divide-y divide-[#E5EEEC]">
        {rows.map((r, i) => {
          const rate = r.total ? Math.round((r.resolved / r.total) * 100) : 0;
          return (
            <div key={r.ward} className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#0B1F3A]">
                  {medals[i] || `${i + 1}.`} {r.ward}
                </span>
                <span className="text-xs text-[#64748B]">
                  {r.resolved}/{r.total} resolved
                </span>
              </div>
              <div className="h-1.5 bg-[#E5EEEC] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#0EA5A0] rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}