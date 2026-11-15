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
    fetch(`${API_BASE_URL}/api/grievances/${id}/public`)
      .then((res) => res.json())
      .then((data) => {
        setGrievance(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`${API_BASE_URL}/api/grievances/${id}/resolution-evidence`)
      .then((res) => res.json())
      .then((data) => setEvidence(data))
      .catch(() => {});
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
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="display-font text-lg font-bold text-[#0B1F3A] mb-6 inline-block">
          Civic <span className="text-[#0EA5A0]">Odisha</span>
        </Link>
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-4">
          PUBLIC TRACKING
        </p>

        <TrackingCard grievance={grievance} evidence={evidence} />
      </div>
    </div>
  );
}
