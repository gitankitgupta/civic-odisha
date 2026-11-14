import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';
import EvidenceTrail from '../components/EvidenceTrail';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

export default function IssueDetail() {
  const { id } = useParams();
  const { lang } = useLanguage();
  const t = translations[lang].issuePage;

  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState([]);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setGrievance(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch grievance:', err);
        setLoading(false);
      });

    fetch(`${API_BASE_URL}/api/grievances/${id}/resolution-evidence`)
      .then((res) => res.json())
      .then((data) => setEvidence(data))
      .catch((err) => console.error('Failed to fetch resolution evidence:', err));
  }, [id]);

  const handleUpvote = () => {
    setUpvoting(true);
    fetch(`${API_BASE_URL}/api/grievances/${id}/upvote`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setGrievance(data);
        setUpvoting(false);
      })
      .catch(() => setUpvoting(false));
  };

  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loading}</div>;
  if (!grievance) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.notFound}</div>;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/feed" className="text-sm font-medium text-[#0EA5A0] hover:underline">{t.backToFeed}</Link>

        <div className="bg-white border border-[#E5EEEC] rounded-3xl p-6 md:p-8 shadow-sm mt-4">
          <div className="flex justify-between items-start mb-4 gap-4">
            <h1 className="text-xl font-bold text-[#0B1F3A]">{grievance.title}</h1>
            <StatusBadge status={grievance.status} />
          </div>
          <p className="text-[#64748B] mb-4">{grievance.description}</p>
          <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-6 flex-wrap">
            <span>{grievance.category}</span>
            <span>·</span>
            <span>{grievance.upvotes} {t.supporters}</span>
            <button
              onClick={handleUpvote}
              className="ml-auto text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-4 py-2 rounded-full hover:bg-[#E0FBF7] transition-colors"
            >
              {upvoting ? t.supporting : t.supportBtn}
            </button>
          </div>

          {grievance.media && grievance.media.length > 0 && (
            <div className="mb-6">
              {grievance.media.map((m, i) => (
                <img
                  key={i}
                  src={m.url}
                  alt="Grievance photo"
                  className="w-full max-h-80 object-cover rounded-xl mb-2"
                />
              ))}
            </div>
          )}

          {grievance.routingReason && (
            <div className="mb-6 p-3 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl text-sm text-[#4B5A6B]">
              🏢 {grievance.routingReason}
            </div>
          )}

          {evidence.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">{t.resolutionEvidence}</h2>
              {evidence.map((item) => (
                <div key={item.id} className="mb-3 p-4 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
                  <img
                    src={item.mediaUrl.startsWith('http') ? item.mediaUrl : `${API_BASE_URL}${item.mediaUrl}`}
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

          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">{t.evidenceTrail}</h2>
          <EvidenceTrail auditTrail={grievance.auditTrail} />
        </div>
      </div>
    </div>
  );
}