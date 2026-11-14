import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

export default function BudgetProposals() {
  const { lang } = useLanguage();
  const t = translations[lang].budgetPage;

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = () => {
    fetch(`${API_BASE_URL}/api/budget/proposals`)
      .then((res) => res.json())
      .then((data) => {
        setProposals(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch proposals:', err);
        setLoading(false);
      });
  };

  const handleVote = async (id, voteType) => {
    setVotingId(id);
    const voterId = localStorage.getItem('civic_odisha_voter_id') || `anon-${Date.now()}`;
    localStorage.setItem('civic_odisha_voter_id', voterId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/budget/proposals/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId, voteType }),
      });
      const data = await res.json();
      if (res.ok) {
        setProposals((prev) => prev.map((p) => (p.id === id ? data : p)));
      } else {
        alert(data.error || 'Vote failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVotingId(null);
    }
  };

  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loadingProposals}</div>;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.tag}</p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-2">{t.heading}</h1>
        <p className="text-[#64748B] text-sm mb-8">{t.subtitle}</p>

        {proposals.length === 0 && (
          <p className="text-[#64748B] text-sm">{t.empty}</p>
        )}

        <div className="space-y-4">
          {proposals.map((p) => (
            <div key={p.id} className="bg-white border border-[#E5EEEC] rounded-2xl p-6">
              <div className="flex justify-between items-start mb-2 gap-4">
                <h3 className="font-semibold text-[#0B1F3A]">{p.title}</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-[#F0FDFA] text-[#0EA5A0] font-medium capitalize shrink-0">{p.status}</span>
              </div>
              <p className="text-sm text-[#64748B] mb-4">{p.description}</p>
              <div className="flex items-center justify-between text-sm flex-wrap gap-3">
                <div className="text-[#94A3B8]">
                  {t.estimatedCost}: ₹{p.estimatedCost?.toLocaleString('en-IN')}
                  {p.sourceGrievanceIds?.length > 0 && (
                    <span> · {t.fromGrievances} {p.sourceGrievanceIds.length} {t.grievancesSuffix}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#0EA5A0] font-medium">👍 {p.votes?.up || 0}</span>
                  <span className="text-red-500 font-medium">👎 {p.votes?.down || 0}</span>
                  <button
                    onClick={() => handleVote(p.id, 'up')}
                    className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-4 py-2 rounded-full hover:bg-[#E0FBF7] transition-colors"
                  >
                    {votingId === p.id ? t.voting : t.voteBtn}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}