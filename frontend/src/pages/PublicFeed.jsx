import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

export default function PublicFeed() {
  const { lang } = useLanguage();
  const t = translations[lang].feedPage;

  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances`)
      .then((res) => res.json())
      .then((data) => {
        setGrievances(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch grievances:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.tag}</p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-8">{t.heading}</h1>

        {grievances.length === 0 && (
          <p className="text-[#64748B] text-sm">{t.empty}</p>
        )}

        <div className="space-y-4">
          {grievances.map((g) => (
            <Link to={`/issue/${g.id}`} key={g.id}>
              <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 hover:border-[#0EA5A0]/40 hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-[#0B1F3A]">{g.title}</h3>
                    <p className="text-sm text-[#64748B] mt-1">{g.description}</p>
                    <p className="text-xs text-[#94A3B8] mt-3">
                      {g.category} · {g.upvotes} {t.supporters}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={g.status} />
                    <PriorityBadge score={g.priorityScore} factors={g.priorityFactors} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}