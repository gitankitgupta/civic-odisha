import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { translations } from '../i18n';
import { useLanguage } from '../LanguageContext';

export default function Login() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang].loginPage;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('civic_odisha_token', data.token);
      localStorage.setItem('civic_odisha_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white border-2 border-[#E5EEEC] rounded-xl px-4 py-3 text-[#0B1F3A] focus:outline-none focus:border-[#0EA5A0] transition-colors';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-sm w-full">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">{t.tag}</p>
        <h1 className="display-font text-2xl font-bold text-[#0B1F3A] mb-8 text-center">{t.heading}</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E5EEEC] rounded-3xl p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-2">{t.emailLabel}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-2">{t.passwordLabel}</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B1F3A] text-white font-semibold py-3.5 rounded-full hover:bg-[#0EA5A0] transition-colors disabled:opacity-60"
          >
            {loading ? t.loggingIn : t.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
}