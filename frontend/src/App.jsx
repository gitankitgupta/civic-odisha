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
import { translations, LANGUAGES } from './i18n';
import { useLanguage } from './LanguageContext';
import AuthorityAnalytics from './pages/AuthorityAnalytics';
import CitizenLogin from './pages/CitizenLogin';
import CitizenDashboard from './pages/CitizenDashboard';
import CompleteProfile from './pages/CompleteProfile';

function LanguageSwitcher({ lang, setLang }) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="text-xs px-2.5 py-1 border border-[#E5EEEC] rounded-full text-[#64748B] hover:border-[#0EA5A0] hover:text-[#0EA5A0] bg-white cursor-pointer"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

function Navbar({ lang, setLang }) {
  const t = translations[lang];
  const token = localStorage.getItem('civic_odisha_token');
  const navLink = 'text-sm font-medium text-[#0B1F3A]/70 hover:text-[#0EA5A0] transition-colors';
  return (
    <nav
      className="border-b border-[#E5EEEC] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
      `}</style>
      <Link to="/" className="text-lg font-bold text-[#0B1F3A]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Civic <span className="text-[#0EA5A0]">Odisha</span>
      </Link>
      <div className="flex gap-5 text-sm items-center">
        <Link to="/feed" className={navLink}>{t.feed}</Link>
        <Link to="/map" className={navLink}>{t.map}</Link>
        <Link to="/report" className="text-sm font-semibold bg-[#0EA5A0] text-white px-4 py-2 rounded-full hover:bg-[#0B8A85] transition-colors">
          {t.reportIssue}
        </Link>
        <Link to="/budget" className={navLink}>{t.budget}</Link>
        {token && <Link to="/dashboard" className={navLink}>Dashboard</Link>}
        {token && <Link to="/analytics" className={navLink}>Analytics</Link>}
        <Link to="/login" className={navLink}>{t.staffLogin}</Link>
        <LanguageSwitcher lang={lang} setLang={setLang} />
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