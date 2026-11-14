import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE_URL } from '../config';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
  pothole: '#e11d48',
  garbage: '#ca8a04',
  streetlight: '#7c3aed',
  water: '#0284c7',
  drainage: '#0891b2',
  other: '#64748b',
};

const DEFAULT_CENTER = [20.2961, 85.8245];

export default function AuthorityAnalytics() {
  const token = localStorage.getItem('civic_odisha_token');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load analytics');
        setLoading(false);
      });
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading analytics...</div>;
  if (error || !data) return <div className="p-8 text-red-600" style={{ fontFamily: "'Inter', sans-serif" }}>{error || 'No data available'}</div>;

    const {
    totalGrievances,
    statusCounts,
    categoryCounts,
    resolutionRate,
    overdueCount,
    wardHotspots,
    duplicateCount,
    avgResolutionHours,
    dailyTrend,
    budgetInsights,
  } = data;

  const kpiCard = (value, label, color) => (
    <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 text-center">
      <p className="display-font text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[#64748B] mt-1">{label}</p>
    </div>
  );

  const formatResolutionTime = (hours) => {
    if (hours === null || hours === undefined) return 'N/A';
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const maxCategoryCount = Math.max(...Object.values(categoryCounts || { none: 1 }));
  const maxWardCount = Math.max(...(wardHotspots || []).map((w) => w.count), 1);
  const maxTrendCount = Math.max(...(dailyTrend || []).map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">AUTHORITY VIEW</p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-8">Analytics Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {kpiCard(totalGrievances, 'Total Grievances', '#0B1F3A')}
          {kpiCard(statusCounts?.submitted || 0, 'Pending', '#D97706')}
          {kpiCard(statusCounts?.in_progress || 0, 'In Progress', '#0284C7')}
          {kpiCard(statusCounts?.resolved || 0, 'Resolved', '#16A34A')}
          {kpiCard(`${resolutionRate}%`, 'Resolution Rate', '#0EA5A0')}
          {kpiCard(overdueCount, 'Overdue (SLA)', '#DC2626')}
          {kpiCard(formatResolutionTime(avgResolutionHours), 'Avg Resolution Time', '#7C3AED')}
          {kpiCard(duplicateCount, 'Duplicates Found', '#64748B')}
        </div>

        {/* Trend Analysis */}
        <div className="bg-white border border-[#E5EEEC] rounded-2xl p-6 mb-8">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A] mb-1">Complaint Trend</h2>
          <p className="text-xs text-[#94A3B8] mb-5">Daily submissions over the last 30 days</p>

          {(!dailyTrend || dailyTrend.length === 0) ? (
            <p className="text-sm text-[#94A3B8]">No submissions in the last 30 days.</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {dailyTrend.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className="w-full bg-[#0EA5A0] rounded-t-sm hover:bg-[#0B1F3A] transition-colors"
                    style={{ height: `${(d.count / maxTrendCount) * 100}%`, minHeight: '4px' }}
                  />
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B1F3A] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {d.date}: {d.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white border border-[#E5EEEC] rounded-2xl p-6 mb-8">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A] mb-5">Category Distribution</h2>
          <div className="space-y-3">
            {Object.entries(categoryCounts || {})
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-[#0B1F3A] font-medium">{category}</span>
                    <span className="text-[#64748B]">{count}</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full"
                      style={{
                        width: `${(count / maxCategoryCount) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Duplicate Insights */}
        <div className="bg-[#F0FDFA] border border-[#CFEFEC] rounded-2xl p-5 mb-8 text-sm text-[#4B5A6B]">
          🔁 <strong>{duplicateCount}</strong> out of <strong>{totalGrievances}</strong> reports were detected as possible duplicates of an existing grievance.
        </div>

        {/* Ward Hotspot Map */}
        <div className="mb-4">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A] mb-4">Ward Hotspots</h2>
          <div className="rounded-2xl overflow-hidden border border-[#E5EEEC] shadow-sm" style={{ height: '450px' }}>
            <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {(wardHotspots || [])
                .filter((w) => w.lat && w.lng)
                .map((w) => (
                  <CircleMarker
                    key={w.wardId}
                    center={[w.lat, w.lng]}
                    radius={8 + (w.count / maxWardCount) * 20}
                    pathOptions={{
                      color: '#DC2626',
                      fillColor: '#DC2626',
                      fillOpacity: 0.4,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>Ward {w.wardId}</strong>
                        <br />
                        {w.count} grievance{w.count !== 1 ? 's' : ''}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
            </MapContainer>
          </div>
          <p className="text-xs text-[#94A3B8] mt-3">Circle size reflects number of grievances reported in that ward.</p>
        </div>
                {/* Budget Insights */}
        <div className="bg-white border border-[#E5EEEC] rounded-2xl p-6 mt-8">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A] mb-1">Budget Insights</h2>
          <p className="text-xs text-[#94A3B8] mb-5">Citizen participation in resource allocation</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl p-4 text-center">
              <p className="display-font text-xl font-bold text-[#0EA5A0]">{budgetInsights?.totalProposals || 0}</p>
              <p className="text-xs text-[#64748B] mt-1">Total Proposals</p>
            </div>
            <div className="bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl p-4 text-center">
              <p className="display-font text-xl font-bold text-[#0EA5A0]">{budgetInsights?.totalVotesCast || 0}</p>
              <p className="text-xs text-[#64748B] mt-1">Total Votes Cast</p>
            </div>
          </div>

          {budgetInsights?.topProposals?.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Top Proposals by Support</h3>
              <div className="space-y-2">
                {budgetInsights.topProposals.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-[#F8FAFC] rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#0B1F3A]">{p.title}</p>
                      {p.estimatedCost && (
                        <p className="text-xs text-[#94A3B8]">Est. cost: ₹{p.estimatedCost.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0EA5A0]">{p.netVotes > 0 ? '+' : ''}{p.netVotes}</p>
                      <p className="text-xs text-[#94A3B8]">{p.totalVotes} votes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8]">No budget proposals yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}