import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler
);

const STATUS_META = [
  { key: 'resolved', label: 'Resolved', color: '#1baf7a' },
  { key: 'in_progress', label: 'In progress', color: '#2a78d6' },
  { key: 'submitted', label: 'Submitted', color: '#eda100' },
];

const GRID = 'rgba(128,128,128,0.18)';
const TICK = '#94A3B8';
const DAY = 24 * 60 * 60 * 1000;

function buildWeeks(points) {
  const now = Date.now();
  const weeks = [];
  for (let i = 5; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY;
    const end = now - i * 7 * DAY;
    const inWeek = points.filter((p) => {
      if (!p.createdAt) return false;
      const t = new Date(p.createdAt).getTime();
      return t > start && t <= end;
    });
    weeks.push({
      label: new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      reported: inWeek.length,
      resolved: inWeek.filter((p) => p.status === 'resolved').length,
    });
  }
  return weeks;
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#0B1F3A] mb-3">{title}</p>
      {children}
    </div>
  );
}

function LegendItem({ color, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
      {children}
    </span>
  );
}

export default function WorkDashboard({ points }) {
  const total = points.length;

  if (total === 0) {
    return (
      <div className="border border-[#E5EEEC] rounded-2xl p-6 mb-6 text-sm text-[#94A3B8]">
        No grievance data yet, charts will appear once issues are reported.
      </div>
    );
  }

  const statusCounts = STATUS_META.map((s) => points.filter((p) => p.status === s.key).length);
  const resolvedPct = Math.round((statusCounts[0] / total) * 100);

  const catMap = {};
  points.forEach((p) => {
    catMap[p.category] = (catMap[p.category] || 0) + 1;
  });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const catLabel = (c) => c.charAt(0).toUpperCase() + c.slice(1);

  const weeks = buildWeeks(points);

  return (
    <div className="mb-6 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Work status">
          <div className="relative w-full" style={{ height: '190px' }}>
            <Doughnut
              data={{
                labels: STATUS_META.map((s) => s.label),
                datasets: [
                  {
                    data: statusCounts,
                    backgroundColor: STATUS_META.map((s) => s.color),
                    borderWidth: 0,
                    spacing: 3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-[#0B1F3A] leading-none">{resolvedPct}%</span>
              <span className="text-xs text-[#64748B] mt-1">resolved</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-[#64748B]">
            {STATUS_META.map((s, i) => (
              <LegendItem key={s.key} color={s.color}>
                {s.label} {statusCounts[i]} ({Math.round((statusCounts[i] / total) * 100)}%)
              </LegendItem>
            ))}
          </div>
        </Card>

        <Card title="Issues by category">
          <div
            className="relative w-full"
            style={{ height: `${Math.max(190, cats.length * 38 + 40)}px` }}
          >
            <Bar
              data={{
                labels: cats.map(([c]) => catLabel(c)),
                datasets: [
                  {
                    data: cats.map(([, n]) => n),
                    backgroundColor: '#0EA5A0',
                    borderRadius: 4,
                    barThickness: 18,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { color: GRID },
                    ticks: { color: TICK, precision: 0 },
                    border: { display: false },
                  },
                  y: { grid: { display: false }, ticks: { color: TICK }, border: { color: GRID } },
                },
              }}
            />
          </div>
        </Card>
      </div>

      <Card title="Weekly trend (last 6 weeks)">
        <div className="flex gap-4 text-xs text-[#64748B] mb-2">
          <LegendItem color="#2a78d6">Reported</LegendItem>
          <LegendItem color="#1baf7a">Resolved (of those reported that week)</LegendItem>
        </div>
        <div className="relative w-full" style={{ height: '220px' }}>
          <Line
            data={{
              labels: weeks.map((w) => w.label),
              datasets: [
                {
                  label: 'Reported',
                  data: weeks.map((w) => w.reported),
                  borderColor: '#2a78d6',
                  backgroundColor: 'rgba(42,120,214,0.10)',
                  fill: true,
                  tension: 0.35,
                  borderWidth: 2,
                  pointRadius: 3,
                  pointBackgroundColor: '#2a78d6',
                },
                {
                  label: 'Resolved',
                  data: weeks.map((w) => w.resolved),
                  borderColor: '#1baf7a',
                  borderDash: [6, 4],
                  tension: 0.35,
                  borderWidth: 2,
                  pointRadius: 3,
                  pointBackgroundColor: '#1baf7a',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { color: TICK }, border: { color: GRID } },
                y: {
                  beginAtZero: true,
                  grid: { color: GRID },
                  ticks: { color: TICK, precision: 0 },
                  border: { display: false },
                },
              },
            }}
          />
        </div>
      </Card>
    </div>
  );
}