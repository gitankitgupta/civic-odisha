import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';
import SlaBadge from '../components/SlaBadge';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

const PER_PAGE = 10;

function getRole(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)).role || null;
  } catch (err) {
    return null;
  }
}

const isOverdue = (g) => g.slaStatus === 'overdue' && g.status !== 'resolved';

export default function Dashboard() {
  const token = localStorage.getItem('civic_odisha_token');
  const { lang } = useLanguage();
  const t = translations[lang].dashboardPage;
  const isAdmin = token ? getRole(token) === 'admin' : false;

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statFilter, setStatFilter] = useState('all');
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [sort, setSort] = useState('overdue');
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveFile, setResolveFile] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

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
        setQueue(Array.isArray(queueData) ? queueData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [statFilter, q, catFilter, sort]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setResolveTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const shiftStat = (from, to, totalDelta = 0) => {
    setStats((prev) => {
      if (!prev) return prev;
      const counts = { ...(prev.statusCounts || {}) };
      if (from) counts[from] = Math.max(0, (counts[from] || 0) - 1);
      if (to) counts[to] = (counts[to] || 0) + 1;
      return {
        ...prev,
        statusCounts: counts,
        totalGrievances: Math.max(0, (prev.totalGrievances || 0) + totalDelta),
      };
    });
  };

  const updateStatus = async (id, status, evidenceFile, note) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('note', note || `Status updated to ${status}`);
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
        return false;
      }
      const old = queue.find((g) => g.id === id)?.status;
      setQueue((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
      shiftStat(old, status);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const confirmResolve = async () => {
    if (!resolveFile || !resolveTarget) return;
    setBusy(true);
    const ok = await updateStatus(resolveTarget.id, 'resolved', resolveFile, resolveNote.trim());
    setBusy(false);
    if (ok) {
      setResolveTarget(null);
      setResolveFile(null);
      setResolveNote('');
      showToast('Marked resolved with photo proof.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/grievances/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = 'Failed to delete grievance';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch (err) {
          /* response was not JSON */
        }
        alert(msg);
      } else {
        setQueue((prev) => prev.filter((g) => g.id !== deleteTarget.id));
        shiftStat(deleteTarget.status, null, -1);
        if (selectedId === deleteTarget.id) setSelectedId(null);
        showToast('Grievance deleted.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete grievance');
    }
    setBusy(false);
    setDeleteTarget(null);
  };

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="p-8 text-[#94A3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{t.loading}</div>;

  const overdueCount = queue.filter(isOverdue).length;
  const categories = ['all', ...new Set(queue.map((g) => g.category).filter(Boolean))];

  const filtered = queue
    .filter((g) => {
      if (statFilter === 'progress' && g.status !== 'in_progress') return false;
      if (statFilter === 'resolved' && g.status !== 'resolved') return false;
      if (statFilter === 'overdue' && !isOverdue(g)) return false;
      if (catFilter !== 'all' && g.category !== catFilter) return false;
      if (q.trim()) {
        const hay = `${g.title || ''} ${g.address || ''} ${g.description || ''}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'priority') return (b.priorityScore || 0) - (a.priorityScore || 0);
      if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return (
        Number(isOverdue(b)) - Number(isOverdue(a)) ||
        (b.priorityScore || 0) - (a.priorityScore || 0)
      );
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const sel = selectedId ? queue.find((g) => g.id === selectedId) : null;

  const exportCsv = () => {
    const cols = ['id', 'title', 'category', 'status', 'priority', 'sla', 'address', 'reported'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(',')].concat(
      filtered.map((g) =>
        [g.id, g.title, g.category, g.status, g.priorityScore, g.slaStatus, g.address, g.createdAt]
          .map(esc)
          .join(',')
      )
    );
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grievances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} rows.`);
  };

  const statCard = (key, value, label, color) => (
    <button
      key={key}
      type="button"
      onClick={() => setStatFilter(statFilter === key ? 'all' : key)}
      className={`border rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#0EA5A0] active:scale-95 ${
        statFilter === key ? 'bg-[#F0FDFA] border-[#0EA5A0]' : 'bg-white border-[#E5EEEC]'
      }`}
    >
      <p className="display-font text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[#64748B] mt-1">{label}</p>
    </button>
  );

  const fmtDate = (v) =>
    v
      ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : '-';

  const selLat = sel?.location?.lat != null ? Number(sel.location.lat) : null;
  const selLng = sel?.location?.lng != null ? Number(sel.location.lng) : null;
  const hasLocation = selLat != null && selLng != null && !Number.isNaN(selLat) && !Number.isNaN(selLng);

  const inputCls =
    'bg-white border border-[#E5EEEC] rounded-full px-4 py-2 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0EA5A0]';

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
            {statCard('all', stats.totalGrievances, t.totalGrievances, '#0B1F3A')}
            {statCard('progress', stats.statusCounts?.in_progress || 0, t.inProgress, '#D97706')}
            {statCard('resolved', stats.statusCounts?.resolved || 0, t.resolved, '#16A34A')}
            {statCard('overdue', overdueCount, t.overdue, '#DC2626')}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="display-font text-lg font-bold text-[#0B1F3A]">{t.openQueue}</h2>
          <button
            type="button"
            onClick={exportCsv}
            className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-4 py-2 rounded-full hover:bg-[#E0FBF7] hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            ⬇ Export CSV
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, address or description"
            className={`${inputCls} flex-1 min-w-[180px]`}
          />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inputCls} capitalize`}>
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls}>
            <option value="overdue">Sort: Overdue first</option>
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        {statFilter !== 'all' && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#F0FDFA] text-[#0EA5A0] border border-[#CFEFEC] px-3 py-1 rounded-full">
              Showing: {statFilter === 'progress' ? t.inProgress : statFilter === 'resolved' ? t.resolved : t.overdue}
              <button type="button" onClick={() => setStatFilter('all')} className="ml-1 text-sm leading-none" aria-label="Clear filter">×</button>
            </span>
          </div>
        )}

        {filtered.length === 0 && (
          <p className="text-[#64748B] text-sm py-6">{queue.length === 0 ? t.queueEmpty : 'No grievances match these filters.'}</p>
        )}

        <div className="space-y-3">
          {rows.map((g) => {
            const overdue = isOverdue(g);
            return (
              <div
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={`border rounded-2xl p-5 cursor-pointer transition-all hover:border-[#0EA5A0] hover:-translate-y-0.5 ${
                  overdue
                    ? 'bg-red-50 border-[#E5EEEC] border-l-4 border-l-red-600'
                    : 'bg-white border-[#E5EEEC]'
                }`}
              >
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0B1F3A]">{g.title}</p>
                    <p className="text-xs text-[#94A3B8] capitalize">
                      {g.category}
                      {g.priorityScore != null && ` · priority ${g.priorityScore}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {g.duplicateOf && (
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                        Possible duplicate
                      </span>
                    )}
                    <SlaBadge slaStatus={g.slaStatus} slaDueAt={g.slaDueAt} />
                    <StatusBadge status={g.status} />
                    {g.status !== 'in_progress' && g.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(g.id, 'in_progress');
                        }}
                        className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-3 py-1.5 rounded-full hover:bg-[#E0FBF7] transition-colors"
                      >
                        {t.startWork}
                      </button>
                    )}
                    {g.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResolveFile(null);
                          setResolveNote('');
                          setResolveTarget(g);
                        }}
                        className="text-xs font-semibold text-white bg-[#0B1F3A] px-3 py-1.5 rounded-full hover:bg-[#0EA5A0] transition-colors"
                      >
                        {t.resolveBtn}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(g);
                        }}
                        title="Delete (admin only)"
                        className="text-xs font-semibold text-red-600 bg-white border border-red-200 px-2.5 py-1.5 rounded-full hover:bg-red-50 transition-colors"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-5 text-xs text-[#94A3B8]">
            <span>
              Showing {(current - 1) * PER_PAGE + 1}-{Math.min(current * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="px-4 py-1.5 rounded-full border border-[#E5EEEC] text-[#64748B] hover:border-[#0EA5A0] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
                className="px-4 py-1.5 rounded-full border border-[#E5EEEC] text-[#64748B] hover:border-[#0EA5A0] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {sel && (
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setSelectedId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm h-full overflow-y-auto bg-white border-l border-[#E5EEEC] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-[#0B1F3A]">{sel.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-xl leading-none text-[#64748B] hover:text-[#0EA5A0]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge status={sel.status} />
              <SlaBadge slaStatus={sel.slaStatus} slaDueAt={sel.slaDueAt} />
              <span className="text-xs text-[#94A3B8] capitalize">{sel.category}</span>
              {sel.priorityScore != null && (
                <span className="text-xs text-[#94A3B8]">· priority {sel.priorityScore}</span>
              )}
            </div>

            {sel.media && sel.media.length > 0 && (
              <div className="mb-4">
                {sel.media.map((m, i) => (
                  <img key={i} src={m.url} alt="Grievance" className="w-full max-h-52 object-cover rounded-xl mb-2" />
                ))}
              </div>
            )}

            {sel.description && <p className="text-sm text-[#64748B] mb-4">{sel.description}</p>}

            <p className="text-xs text-[#94A3B8] mb-1">Reported</p>
            <p className="text-sm text-[#0B1F3A] mb-4">{fmtDate(sel.createdAt)}</p>

            <p className="text-xs text-[#94A3B8] mb-1">Location</p>
            {sel.address && <p className="text-sm text-[#0B1F3A] mb-3">📍 {sel.address}</p>}

            {hasLocation ? (
              <>
                <div className="rounded-xl overflow-hidden border border-[#E5EEEC] mb-3" style={{ height: '170px' }}>
                  <MapContainer
                    key={sel.id}
                    center={[selLat, selLng]}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    dragging={false}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    doubleClickZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <CircleMarker
                      center={[selLat, selLng]}
                      radius={10}
                      pathOptions={{ color: '#e11d48', fillColor: '#e11d48', fillOpacity: 0.8 }}
                    />
                  </MapContainer>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selLat},${selLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-semibold text-white bg-[#0B1F3A] py-2.5 rounded-full hover:bg-[#0EA5A0] transition-colors mb-4"
                >
                  Open in Google Maps
                </a>
              </>
            ) : (
              <p className="text-sm text-[#94A3B8] mb-4">No location was saved for this grievance.</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {sel.status !== 'in_progress' && sel.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus(sel.id, 'in_progress')}
                  className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-4 py-2 rounded-full hover:bg-[#E0FBF7] transition-colors"
                >
                  {t.startWork}
                </button>
              )}
              {sel.status !== 'resolved' && (
                <button
                  onClick={() => {
                    setResolveFile(null);
                    setResolveNote('');
                    setResolveTarget(sel);
                  }}
                  className="text-xs font-semibold text-white bg-[#0B1F3A] px-4 py-2 rounded-full hover:bg-[#0EA5A0] transition-colors"
                >
                  {t.resolveBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve popup */}
      {resolveTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
          onClick={() => !busy && setResolveTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E5EEEC] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-base font-bold text-[#0B1F3A] mb-1">Mark as resolved</h3>
            <p className="text-sm text-[#64748B] mb-4">{resolveTarget.title}</p>

            <label className="block text-xs font-semibold text-[#0B1F3A] mb-1.5">Resolution photo (required)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setResolveFile(e.target.files[0] || null)}
              className="w-full text-sm text-[#64748B] mb-1 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-[#F0FDFA] file:text-[#0EA5A0] file:font-semibold"
            />
            {resolveFile && <p className="text-xs text-[#16A34A] mb-3">✓ {resolveFile.name}</p>}
            {!resolveFile && <p className="text-xs text-[#94A3B8] mb-3">A photo is needed to mark this resolved.</p>}

            <label className="block text-xs font-semibold text-[#0B1F3A] mb-1.5">Note for the citizen (optional)</label>
            <textarea
              rows={2}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="w-full bg-white border border-[#E5EEEC] rounded-xl px-3 py-2 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0EA5A0] mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setResolveTarget(null)}
                className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E5EEEC] text-[#64748B] hover:border-[#0EA5A0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!resolveFile || busy}
                onClick={confirmResolve}
                className="text-xs font-semibold text-white bg-[#0B1F3A] px-4 py-2 rounded-full hover:bg-[#0EA5A0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete popup */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
          onClick={() => !busy && setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E5EEEC] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-base font-bold text-[#0B1F3A] mb-2">Delete this grievance?</h3>
            <p className="text-sm text-[#64748B] mb-5">
              "{deleteTarget.title}" will be removed for good, with its photos and timeline. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E5EEEC] text-[#64748B] hover:border-[#0EA5A0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className="text-xs font-semibold text-white bg-red-600 px-4 py-2 rounded-full hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-[#0B1F3A] text-white text-xs px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}