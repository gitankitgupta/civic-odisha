import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE_URL } from '../config';
import { translations, LANGUAGES } from '../i18n';
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

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const { lang, setLang } = useLanguage();
  const t = translations[lang].landing;

  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
  const [trackId, setTrackId] = useState('');
  const [sampleEvidence, setSampleEvidence] = useState(null);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/grievances`)
      .then((res) => res.json())
      .then((data) => {
        const open = data.filter((g) => g.status === 'submitted').length;
        const inProgress = data.filter((g) => g.status === 'in_progress').length;
        const resolved = data.filter((g) => g.status === 'resolved').length;
        setStats({ open, inProgress, resolved, total: data.length });

        const withPhoto = data.find((g) => g.status === 'resolved' && g.media?.length);
        if (withPhoto) {
          fetch(`${API_BASE_URL}/api/grievances/${withPhoto.id}/resolution-evidence`)
            .then((r) => r.json())
            .then((ev) => {
              if (ev?.length) {
                setSampleEvidence({ before: withPhoto.media[0].url, after: ev[0].mediaUrl, note: ev[0].note });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/grievances/map/all`)
      .then((res) => res.json())
      .then((data) => setMapPoints(data))
      .catch(() => {});
  }, []);

  const handleTrack = (e) => {
    e.preventDefault();
    if (trackId.trim()) window.location.href = `/track/${trackId.trim()}`;
  };

  const navLink = 'text-sm font-medium text-[#0B1F3A]/70 hover:text-[#0B1F3A] transition-colors cursor-pointer';

  return (
    <div className="bg-white text-[#0B1F3A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
        @keyframes pulse-pin { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }
        .pin-pulse { animation: pulse-pin 2.4s ease-in-out infinite; }
        .hero-map .leaflet-control-zoom { display: none; }
        .hero-map .leaflet-control-attribution { font-size: 9px; }
      `}</style>

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-[#E5EEEC]' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#home" className="display-font text-xl font-bold text-[#0B1F3A]">
            Civ<span className="text-[#0EA5A0]">i</span>que
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className={navLink}>{t.navHome}</a>
            <a href="#how-it-works" className={navLink}>{t.navHow}</a>
            <a href="#features" className={navLink}>{t.navFeatures}</a>
            <a href="#impact" className={navLink}>{t.navImpact}</a>
            <a href="#track" className={navLink}>{t.navTrack}</a>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#E5EEEC] rounded-full text-[#64748B] hover:border-[#0EA5A0] hover:text-[#0EA5A0] bg-white cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <Link
              to="/report"
              className="text-sm font-semibold bg-[#0EA5A0] text-white px-5 py-2.5 rounded-full hover:bg-[#0B8A85] transition-colors"
            >
              {t.navReportBtn}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className="relative pt-40 pb-24 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-4">{t.heroTag}</p>
            <h1 className="display-font text-5xl md:text-6xl font-bold leading-[1.05] mb-6">
              {t.heroTitle1}<br />{t.heroTitle2}<br />
              <span className="text-[#0EA5A0]">{t.heroTitle3}</span>
            </h1>
            <p className="text-lg text-[#4B5A6B] mb-8 max-w-md leading-relaxed">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/report" className="bg-[#0B1F3A] text-white px-7 py-3.5 rounded-full font-semibold hover:bg-[#0EA5A0] transition-colors">
                {t.heroCtaReport}
              </Link>
              <a href="#track" className="border-2 border-[#0B1F3A]/15 px-7 py-3.5 rounded-full font-semibold hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors">
                {t.heroCtaTrack}
              </a>
            </div>
          </div>

          {/* Live map visual */}
          <div className="relative h-96 rounded-3xl overflow-hidden border border-[#E5EEEC] shadow-sm hero-map">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapPoints.map((p) => (
                <CircleMarker
                  key={p.id}
                  center={[p.lat, p.lng]}
                  radius={8}
                  pathOptions={{
                    color: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other,
                    fillColor: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other,
                    fillOpacity: 0.75,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{p.title}</strong><br />
                      {p.category} · {p.status}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Floating status badge overlay */}
            <div className="absolute top-4 left-4 bg-white shadow-lg rounded-xl px-3 py-2 border border-[#E5EEEC] flex items-center gap-2 text-xs font-medium z-[1000]">
              <span className="w-2 h-2 rounded-full bg-amber-500 pin-pulse" />
              {stats.total} {t.issuesReported}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM -> SOLUTION */}
      <section className="px-6 py-20 bg-[#FAFBFC]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <Reveal>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#94A3B8] mb-4">{t.problemTag}</p>
            <ul className="space-y-4">
              {t.problemItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[#4B5A6B]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#CBD5E1] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-4">{t.solutionTag}</p>
            <h3 className="display-font text-2xl font-bold mb-4">{t.solutionHeading}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0B1F3A]">
              {t.solutionSteps.map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-[#F0FDFA] text-[#0EA5A0] px-3 py-1.5 rounded-full">{step}</span>
                  {i < arr.length - 1 && <span className="text-[#CBD5E1]">→</span>}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">{t.featuresTag}</p>
            <h2 className="display-font text-3xl md:text-4xl font-bold text-center mb-14">{t.featuresHeading}</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {t.features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="h-full bg-white border border-[#E5EEEC] rounded-2xl p-6 hover:border-[#0EA5A0]/40 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0EA5A0] font-bold display-font mb-4">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-6 py-24 bg-[#0B1F3A] text-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">{t.howTag}</p>
            <h2 className="display-font text-3xl md:text-4xl font-bold text-center mb-16">{t.howHeading}</h2>
          </Reveal>
          <div className="grid md:grid-cols-5 gap-8 relative">
            {t.howSteps.map((s, i) => (
              <Reveal key={s.t} delay={i * 120}>
                <div className="text-center md:text-left">
                  <p className="display-font text-4xl font-bold text-[#0EA5A0]/70 mb-3">{String(i + 1).padStart(2, '0')}</p>
                  <p className="display-font font-semibold tracking-wide mb-1">{s.t}</p>
                  <p className="text-sm text-white/60">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DASHBOARD */}
      <section className="px-6 py-24 bg-[#FAFBFC]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">{t.liveTag}</p>
            <h2 className="display-font text-3xl md:text-4xl font-bold text-center mb-14">{t.liveHeading}</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="bg-white border border-[#E5EEEC] rounded-3xl p-8 shadow-sm">
              <div className="grid grid-cols-3 gap-6 mb-8">
                {[
                  { label: t.statusOpen, value: stats.open, color: '#D97706' },
                  { label: t.statusInProgress, value: stats.inProgress, color: '#0EA5A0' },
                  { label: t.statusResolved, value: stats.resolved, color: '#16A34A' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="display-font text-4xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-sm text-[#64748B] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-center border-t border-[#E5EEEC] pt-6">
                {t.categoryChips.map((cat) => (
                  <span key={cat} className="text-xs font-medium bg-[#F0FDFA] text-[#0EA5A0] px-3 py-1.5 rounded-full">{cat}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BEFORE / AFTER EVIDENCE */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#94A3B8] mb-2">{t.beforeLabel}</p>
                <div className="aspect-square rounded-2xl overflow-hidden bg-[#F0FDFA] border border-[#E5EEEC] flex items-center justify-center">
                  {sampleEvidence && !beforeError ? (
                    <img
                      src={`${API_BASE_URL}${sampleEvidence.before}`}
                      alt="Reported issue"
                      className="w-full h-full object-cover"
                      onError={() => setBeforeError(true)}
                    />
                  ) : (
                    <span className="text-4xl">📷</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0EA5A0] mb-2">{t.afterLabel}</p>
                <div className="aspect-square rounded-2xl overflow-hidden bg-[#F0FDFA] border border-[#E5EEEC] flex items-center justify-center">
                  {sampleEvidence && !afterError ? (
                    <img
                      src={`${API_BASE_URL}${sampleEvidence.after}`}
                      alt="Resolution evidence"
                      className="w-full h-full object-cover"
                      onError={() => setAfterError(true)}
                    />
                  ) : (
                    <span className="text-4xl">✅</span>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-4">{t.evidenceTag}</p>
            <h2 className="display-font text-3xl font-bold mb-4">{t.evidenceHeading}</h2>
            <p className="text-[#64748B] leading-relaxed">
              {t.evidenceDesc}
            </p>
          </Reveal>
        </div>
      </section>

      {/* TECH STRIP */}
      <section className="px-6 py-12 border-y border-[#E5EEEC]">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-[0.2em] text-[#94A3B8] mb-6">{t.builtWithLabel}</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-[#4B5A6B]">
            {['React', 'Vite', 'Tailwind', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'AssemblyAI', 'Hugging Face'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="px-6 py-24 bg-[#FAFBFC]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">{t.impactTag}</p>
            <h2 className="display-font text-3xl md:text-4xl font-bold text-center mb-14">{t.impactHeading}</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.impactItems.map((s, i) => (
              <Reveal key={s.t} delay={i * 80}>
                <div className="text-center bg-white border border-[#E5EEEC] rounded-2xl py-8 px-4">
                  <p className="display-font font-bold text-lg text-[#0B1F3A]">{s.t}</p>
                  <p className="text-sm text-[#64748B] mt-1">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRACK ISSUE */}
      <section id="track" className="px-6 py-24">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.trackTag}</p>
            <h2 className="display-font text-3xl font-bold mb-6">{t.trackHeading}</h2>
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder={t.trackPlaceholder}
                className="flex-1 border-2 border-[#E5EEEC] rounded-full px-6 py-3.5 text-sm focus:outline-none focus:border-[#0EA5A0]"
              />
              <button type="submit" className="bg-[#0B1F3A] text-white px-7 py-3.5 rounded-full font-semibold hover:bg-[#0EA5A0] transition-colors">
                {t.trackButton}
              </button>
            </form>
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 bg-[#0B1F3A] text-white text-center">
        <Reveal>
          <h2 className="display-font text-3xl md:text-4xl font-bold mb-4">{t.finalHeading}</h2>
          <Link to="/report" className="inline-block bg-[#0EA5A0] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#0C8A85] transition-colors mt-4">
            {t.finalButton}
          </Link>
          <p className="text-sm text-white/50 mt-6">{t.finalSubtext}</p>
        </Reveal>
      </section>
    </div>
  );
}