import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/citizen-login');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/api/citizen/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      navigate('/citizen-dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to save your name. Please try again.');
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white border-2 border-[#E5EEEC] rounded-xl px-4 py-3 text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5A0] transition-colors';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">ONE LAST STEP</p>
        <h1 className="display-font text-2xl font-bold text-[#0B1F3A] mb-8 text-center">What should we call you?</h1>

        <div className="bg-white border border-[#E5EEEC] rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
              autoFocus
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B1F3A] text-white font-semibold py-3 rounded-full hover:bg-[#0EA5A0] transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}