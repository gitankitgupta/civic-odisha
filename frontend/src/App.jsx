import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import PublicFeed from './pages/PublicFeed';
import IssueDetail from './pages/IssueDetail';
import ReportIssue from './pages/ReportIssue';
import BudgetProposals from './pages/BudgetProposals';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import PublicTracking from './pages/PublicTracking';
import TrackLookup from './pages/TrackLookup';
import { translations, LANGUAGES } from './i18n';
import { useLanguage } from './LanguageContext';
import AuthorityAnalytics from './pages/AuthorityAnalytics';
import CitizenLogin from './pages/CitizenLogin';
import CitizenDashboard from './pages/CitizenDashboard';
import CompleteProfile from './pages/CompleteProfile';
import ThemeToggle from './components/ThemeToggle';

function LanguageSwitcher({ lang, setLang }) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="text-xs px-2.5 py-1 border border-[#E5EEEC] rounded-full text-[#64748B] hover:border-[#0EA5A0] hover:text-[#0EA5A0] bg-white cursor-pointer transition-colors ml-2"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

// Spreads a soft circle from the exact click point
function addRipple(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  span.className = 'nav-ripple';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  el.appendChild(span);
  setTimeout(() => span.remove(), 600);
}

function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      onClick={addRipple}
      className={`nav-link${active ? ' nav-link-active' : ''}`}
    >
      {children}
    </Link>
  );
}

function Navbar({ lang, setLang }) {
  const t = translations[lang];
  const token = localStorage.getItem('civic_odisha_token');
  return (
    <nav
      className="border-b border-[#E5EEEC] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');

        .nav-link {
          position: relative;
          display: inline-block;
          overflow: hidden;
          font-weight: 500;
          color: rgba(11, 31, 58, 0.7);
          padding: 8px 12px;
          border-radius: 10px;
          transition: color .2s ease, transform .2s ease, background .2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 4px;
          height: 2px;
          background: #0EA5A0;
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .25s ease;
        }
        .nav-link:hover { color: #0EA5A0; transform: translateY(-1px); }
        .nav-link:hover::after { transform: scaleX(1); }
        .nav-link:active { transform: scale(0.95); background: rgba(14, 165, 160, 0.1); }
        .nav-link-active { color: #0EA5A0; }
        .nav-link-active::after { transform: scaleX(1); }

        .nav-cta {
          position: relative;
          display: inline-block;
          overflow: hidden;
          font-weight: 600;
          color: #fff;
          background: #0EA5A0;
          padding: 9px 18px;
          border-radius: 999px;
          margin: 0 6px;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }
        .nav-cta:hover {
          background: #0B8A85;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(14, 165, 160, 0.4);
        }
        .nav-cta:active {
          transform: translateY(0) scale(0.96);
          box-shadow: 0 2px 6px rgba(14, 165, 160, 0.3);
        }

        .nav-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(14, 165, 160, 0.35);
          transform: scale(0);
          animation: nav-ripple .6s ease-out;
          pointer-events: none;
        }
        .nav-cta .nav-ripple { background: rgba(255, 255, 255, 0.45); }
        @keyframes nav-ripple { to { transform: scale(2.4); opacity: 0; } }
      `}</style>
      <Link to="/" className="text-lg font-bold text-[#0B1F3A]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Civic <span className="text-[#0EA5A0]">Odisha</span>
      </Link>
      <div className="flex gap-1 text-sm items-center">
        <NavItem to="/feed">{t.feed}</NavItem>
        <NavItem to="/map">{t.map}</NavItem>
        <NavItem to="/track">Track</NavItem>
        <Link to="/report" onClick={addRipple} className="nav-cta">
          {t.reportIssue}
        </Link>
        <NavItem to="/budget">{t.budget}</NavItem>
        {token && <NavItem to="/dashboard">Dashboard</NavItem>}
        {token && <NavItem to="/analytics">Analytics</NavItem>}
        <NavItem to="/login">{t.staffLogin}</NavItem>
        <LanguageSwitcher lang={lang} setLang={setLang} />
                <ThemeToggle />
      </div>
    </nav>
  );
}

function App() {
  const { lang, setLang } = useLanguage();
  const location = useLocation();
  const hideAppNavbar = location.pathname === '/';

  return (
    <div className={hideAppNavbar ? '' : 'min-h-screen bg-white text-[#0B1F3A]'}>
      {!hideAppNavbar && <Navbar lang={lang} setLang={setLang} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/feed" element={<PublicFeed />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/issue/:id" element={<IssueDetail />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/budget" element={<BudgetProposals />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/track" element={<TrackLookup />} />
        <Route path="/track/:id" element={<PublicTracking />} />
        <Route path="/analytics" element={<AuthorityAnalytics />} />
        <Route path="/citizen-login" element={<CitizenLogin />} />
        <Route path="/citizen-dashboard" element={<CitizenDashboard />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
      </Routes>
    </div>
  );
}

export default App;