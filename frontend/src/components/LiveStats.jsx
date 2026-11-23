import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import AnimatedCounter from './AnimatedCounter';

export default function LiveStats() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  const resolved = items.filter((g) => g.status === 'resolved');
  const avgDays = resolved.length
    ? resolved.reduce(
        (sum, g) => sum + (new Date(g.updatedAt) - new Date(g.createdAt)) / 86400000,
        0
      ) / resolved.length
    : 0;

  const recent = [...resolved]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  const stats = [
    { label: 'Issues reported', node: <AnimatedCounter to={items.length} /> },
    { label: 'Resolved', node: <AnimatedCounter to={resolved.length} /> },
    { label: 'Avg days to resolve', node: <AnimatedCounter to={avgDays} decimals={1} /> },
  ];

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <style>{`@keyframes civic-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#F8FAF9] border border-[#E5EEEC] rounded-2xl px-4 py-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#0B1F3A]">{s.node}</p>
            <p className="text-xs text-[#64748B] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="overflow-hidden mt-5">
          <div
            className="flex gap-2 w-max"
            style={{ animation: 'civic-marquee 25s linear infinite' }}
          >
            {[...recent, ...recent].map((g, i) => (
              <span
                key={`${g.id}-${i}`}
                className="text-xs font-semibold text-[#0F766E] bg-[#F0FDFA] border border-[#CFEFEC] px-3 py-1.5 rounded-full whitespace-nowrap capitalize"
              >
                ✓ {g.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}