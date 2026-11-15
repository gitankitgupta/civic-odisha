import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE_URL } from '../config';
import 'leaflet/dist/leaflet.css';
import WorkDashboard from '../components/WorkDashboard';

const CATEGORY_COLORS = {
  pothole: '#e11d48',
  garbage: '#ca8a04',
  streetlight: '#7c3aed',
  water: '#0284c7',
  drainage: '#0891b2',
  other: '#64748b',
};

const STATUS_COLORS = {
  submitted: '#ca8a04',
  in_progress: '#0284c7',
  resolved: '#0EA5A0',
};

const DEFAULT_CENTER = [25.594, 85.137];
const RADIUS_OPTIONS = [1, 2, 5, 10, 20];

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function daysSince(createdAt) {
  if (!createdAt) return null;
  return (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
}

function Chip({ active, onClick, dotColor, count, capitalize, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
        capitalize ? 'capitalize' : ''
      } ${
        active
          ? 'bg-[#0EA5A0] text-white border-[#0EA5A0]'
          : 'bg-white text-[#64748B] border-[#E5EEEC] hover:border-[#0EA5A0]'
      }`}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full mr-2 inline-block"
          style={{ background: dotColor }}
        />
      )}
      {children}
      {count !== undefined && (
        <span
          className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${
            active ? 'bg-white/25 text-white' : 'bg-[#F1F5F4] text-[#94A3B8]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#F8FAF9] rounded-xl px-4 py-3">
      <p className="text-[11px] text-[#94A3B8] mb-0.5">{label}</p>
      <p className="text-2xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export default function MapView() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [myLocation, setMyLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [activeTab, setActiveTab] = useState('category');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances/map/all`)
      .then((res) => res.json())
      .then((data) => {
        setPoints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch map data:', err);
        setLoading(false);
      });
  }, []);

  const isWithinDateFilter = (createdAt) => {
    if (dateFilter === 'all' || !createdAt) return true;
    const days = daysSince(createdAt);
    if (dateFilter === '7days') return days <= 7;
    if (dateFilter === '30days') return days <= 30;
    return true;
  };

  const captureMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setRadiusEnabled(true);
        setLocatingMe(false);
      },
      () => {
        alert('Could not get your location.');
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const filteredPoints = points.filter((p) => {
    const categoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
    const statusMatch = statusFilter === 'all' || p.status === statusFilter;
    const dateMatch = isWithinDateFilter(p.createdAt);

    let radiusMatch = true;
    if (radiusEnabled && myLocation) {
      const dist = getDistanceKm(myLocation.lat, myLocation.lng, p.lat, p.lng);
      radiusMatch = dist <= radiusKm;
    }

    return categoryMatch && statusMatch && dateMatch && radiusMatch;
  });

  const countBy = (predicate) => points.filter(predicate).length;

  const categories = ['all', ...new Set(points.map((p) => p.category))];
  const statuses = ['all', ...new Set(points.map((p) => p.status))];

  const totalCount = points.length;
  const resolvedCount = countBy((p) => p.status === 'resolved');
  const pendingCount = totalCount - resolvedCount;

  if (loading) {
    return (
      <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Loading map...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">
          GRIEVANCE MAP
        </p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-1">
          Where issues are happening
        </h1>
        <p className="text-sm text-[#64748B] mb-6">
          Live view of every reported civic issue. Filter by type, status, date or distance.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Total issues" value={totalCount} color="#0B1F3A" />
          <StatCard label="Pending" value={pendingCount} color="#ca8a04" />
          <StatCard label="Resolved" value={resolvedCount} color="#0EA5A0" />
        </div>
                <WorkDashboard points={points} />

        <div className="border border-[#E5EEEC] rounded-2xl p-3 mb-3 bg-white">
          <div className="flex gap-1 bg-[#F1F5F4] p-1 rounded-xl mb-3">
            {[
              { key: 'category', label: '🏷️ Category' },
              { key: 'status', label: '📊 Status' },
              { key: 'date', label: '📅 Date' },
              { key: 'near', label: '📍 Near me' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#0B1F3A] text-white'
                    : 'text-[#64748B] hover:text-[#0B1F3A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center" style={{ minHeight: '34px' }}>
            {activeTab === 'category' &&
              categories.map((cat) => (
                <Chip
                  key={cat}
                  capitalize
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                  dotColor={cat === 'all' ? null : CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}
                  count={cat === 'all' ? totalCount : countBy((p) => p.category === cat)}
                >
                  {cat}
                </Chip>
              ))}

            {activeTab === 'status' &&
              statuses.map((s) => (
                <Chip
                  key={s}
                  capitalize
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  dotColor={s === 'all' ? null : STATUS_COLORS[s] || '#64748b'}
                  count={s === 'all' ? totalCount : countBy((p) => p.status === s)}
                >
                  {s.replace('_', ' ')}
                </Chip>
              ))}

            {activeTab === 'date' &&
              [
                { value: 'all', label: 'All time', days: null },
                { value: '7days', label: 'Last 7 days', days: 7 },
                { value: '30days', label: 'Last 30 days', days: 30 },
              ].map((d) => (
                <Chip
                  key={d.value}
                  active={dateFilter === d.value}
                  onClick={() => setDateFilter(d.value)}
                  count={
                    d.days === null
                      ? totalCount
                      : countBy((p) => {
                          const days = daysSince(p.createdAt);
                          return days !== null && days <= d.days;
                        })
                  }
                >
                  {d.label}
                </Chip>
              ))}

            {activeTab === 'near' && (
              <>
                <button
                  onClick={captureMyLocation}
                  disabled={locatingMe}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#F0FDFA] text-[#0EA5A0] border-2 border-[#CFEFEC] hover:bg-[#E0FBF7] transition-colors disabled:opacity-60"
                >
                  {locatingMe ? 'Locating...' : '📍 Use my location'}
                </button>

                {radiusEnabled &&
                  myLocation &&
                  RADIUS_OPTIONS.map((km) => (
                    <Chip
                      key={km}
                      active={radiusKm === km}
                      onClick={() => setRadiusKm(km)}
                      count={
                        countBy(
                          (p) => getDistanceKm(myLocation.lat, myLocation.lng, p.lat, p.lng) <= km
                        )
                      }
                    >
                      Within {km} km
                    </Chip>
                  ))}

                {radiusEnabled && myLocation && (
                  <button
                    onClick={() => setRadiusEnabled(false)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] mb-4 px-1">
          Showing {filteredPoints.length} of {totalCount} grievance{totalCount !== 1 ? 's' : ''}
        </p>

        <div
          className="rounded-2xl overflow-hidden border border-[#E5EEEC] shadow-sm"
          style={{ height: '500px' }}
        >
          <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredPoints.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{
                  color: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other,
                  fillColor: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other,
                  fillOpacity: 0.7,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{p.title}</strong>
                    <br />
                    {p.category} · {p.status}
                    <br />
                    {p.description && <span>{p.description}</span>}
                    <br />
                    {p.address && <span className="text-gray-500">{p.address}</span>}
                    <br />
                    {p.createdAt && (
                      <span className="text-gray-500">
                        Reported: {new Date(p.createdAt).toLocaleString()}
                      </span>
                    )}
                    <br />
                    Priority score: {p.priorityScore}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}