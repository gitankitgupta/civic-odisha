import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';
import SlaBadge from '../components/SlaBadge';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

export default function Dashboard() {
  const token = localStorage.getItem('civique_token');
  const { lang } = useLanguage();
  const t = translations[lang].dashboardPage;

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/admin/queue`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([statsData, queueData]) => {
        setStats(statsData);
        const sortedQueue = [...queueData].sort((a, b) => {
          if (a.slaStatus === 'overdue' && b.slaStatus !== 'overdue') return -1;
          if (a.slaStatus !== 'overdue' && b.slaStatus === 'overdue') return 1;
          return 0;
        });
        setQueue(sortedQueue);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  const updateStatus = async (id, status, evidenceFile) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('note', `Status updated to ${status}`);
      formData.append('actor', 'Staff');
      if (evidenceFile) formData.append('evidencePhoto', evidenceFile);

      const res = await fetch(`${API_BASE_URL}/api/grievances/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update status');
        return;
      }
      setQueue((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveClick = (id) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) updateStatus(id, 'resolved', file);
    };
    fileInput.click();
  };

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loading}</div>;

  const overdueCount = queue.filter((g) => g.slaStatus === 'overdue').length;

  const statCard = (value, label, color) => (
    <div className="bg-white border border-[#E5EEEC] rounded-2xl p-5 text-center">
      <p className="display-font text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[#64748B] mt-1">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.tag}</p>
        <h1 className="display-font text-3xl font-bold text-[#0B1F3A] mb-8">{t.heading}</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {statCard(stats.totalGrievances, t.totalGrievances, '#0B1F3A')}
            {statCard(stats.statusCounts?.in_progress || 0, t.inProgress, '#D97706')}
            {statCard(stats.statusCounts?.resolved || 0, t.resolved, '#16A34A')}
            {statCard(overdueCount, t.overdue, '#DC2626')}
          </div>
        )}

        <h2 className="display-font text-lg font-bold text-[#0B1F3A] mb-4">{t.openQueue}</h2>
        {queue.length === 0 && <p className="text-[#64748B] text-sm">{t.queueEmpty}</p>}

        <div className="space-y-3">
          {queue.map((g) => (
            <div key={g.id} className="bg-white border border-[#E5EEEC] rounded-2xl p-5">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[#0B1F3A]">{g.title}</p>
                  <p className="text-xs text-[#94A3B8]">{g.category}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <SlaBadge slaStatus={g.slaStatus} slaDueAt={g.slaDueAt} />
                  <StatusBadge status={g.status} />
                  {g.status !== 'in_progress' && (
                    <button
                      onClick={() => updateStatus(g.id, 'in_progress')}
                      className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-3 py-1.5 rounded-full hover:bg-[#E0FBF7] transition-colors"
                    >
                      {t.startWork}
                    </button>
                  )}
                  {g.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveClick(g.id)}
                      className="text-xs font-semibold text-white bg-[#0B1F3A] px-3 py-1.5 rounded-full hover:bg-[#0EA5A0] transition-colors"
                    >
                      {t.resolveBtn}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}