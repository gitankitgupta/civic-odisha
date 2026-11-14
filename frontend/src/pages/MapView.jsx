import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE_URL } from '../config';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
  pothole: '#e11d48',
  garbage: '#ca8a04',
  streetlight: '#7c3aed',
  water: '#0284c7',
  drainage: '#0891b2',
  other: '#64748b',
};

const DEFAULT_CENTER = [25.594, 85.137];

export default function MapView() {
  const { lang } = useLanguage();
  const t = translations[lang].mapPage;
  const tc = translations[lang].categories;

  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  const filteredPoints =
    categoryFilter === 'all'
      ? points
      : points.filter((p) => p.category === categoryFilter);

  const categories = ['all', ...new Set(points.map((p) => p.category))];

  if (loading) {
    return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.tag}</p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-6">{t.heading}</h1>

        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs font-medium px-4 py-1.5 rounded-full border transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                  : 'bg-white text-[#64748B] border-[#E5EEEC] hover:border-[#0EA5A0]'
              }`}
            >
              {cat === 'all' ? t.all : (tc[cat] || cat)}
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#E5EEEC] shadow-sm" style={{ height: '500px' }}>
          <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
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
                    {tc[p.category] || p.category} · {p.status}
                    <br />
                    {t.priorityScore}: {p.priorityScore}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <p className="text-xs text-[#94A3B8] mt-3">
          {filteredPoints.length} {filteredPoints.length !== 1 ? t.grievances : t.grievance} {t.shown}
        </p>
      </div>
    </div>
  );
}