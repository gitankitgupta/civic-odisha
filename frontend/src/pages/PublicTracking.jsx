import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';
import EvidenceTrail from '../components/EvidenceTrail';

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

  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
  if (!grievance) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>Grievance not found.</div>;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="display-font text-lg font-bold text-[#0B1F3A] mb-6 inline-block">
          Civ<span className="text-[#0EA5A0]">i</span>que
        </Link>
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-4">PUBLIC TRACKING</p>

        <div className="bg-white border border-[#E5EEEC] rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-start mb-4 gap-4">
            <h1 className="text-xl font-bold text-[#0B1F3A]">{grievance.title}</h1>
            <StatusBadge status={grievance.status} />
          </div>
          <p className="text-[#64748B] mb-4">{grievance.description}</p>
          <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-6">
            <span>{grievance.category}</span>
            <span>·</span>
            <span>{grievance.upvotes} supporters</span>
          </div>

          {grievance.routingReason && (
            <div className="mb-6 p-3 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl text-sm text-[#4B5A6B]">
              🏢 {grievance.routingReason}
            </div>
          )}

          {evidence.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Resolution Evidence</h2>
              {evidence.map((item) => (
                <div key={item.id} className="mb-3 p-4 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
                  <img
                    src={`${API_BASE_URL}${item.mediaUrl}`}
                    alt="Resolution evidence"
                    className="w-full max-h-64 object-cover rounded-lg mb-2"
                  />
                  <p className="text-sm text-[#0B1F3A]">{item.note}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Status Timeline</h2>
          <EvidenceTrail auditTrail={grievance.auditTrail} />
        </div>
      </div>
    </div>
  );
}