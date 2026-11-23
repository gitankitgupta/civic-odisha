import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import TrackingCard from '../components/TrackingCard';

export default function PublicTracking() {
  const { id } = useParams();
  const [grievance, setGrievance] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`${API_BASE_URL}/api/grievances/${id}/public`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data && data.id) setGrievance(data);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });

      fetch(`${API_BASE_URL}/api/grievances/${id}/resolution-evidence`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setEvidence(data);
        })
        .catch(() => {});
    };

    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Grievance not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
        @keyframes civic-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="display-font text-lg font-bold text-[#0B1F3A] mb-6 inline-block">
          Civic <span className="text-[#0EA5A0]">Odisha</span>
        </Link>

        <div className="flex items-center justify-between mb-4">
          <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0]">
            PUBLIC TRACKING
          </p>
          <span className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
            <span
              className="w-2 h-2 rounded-full bg-[#22C55E]"
              style={{ animation: 'civic-pulse 2s ease-in-out infinite' }}
            />
            Live, updates every 10s
          </span>
        </div>

        <TrackingCard grievance={grievance} evidence={evidence} />
      </div>
    </div>
  );
}