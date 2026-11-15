import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrackLookup() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = id.trim();
    if (!cleaned) {
      setError('Please enter your grievance ID.');
      return;
    }
    navigate(`/track/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-xl mx-auto px-6 py-16">
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">
          TRACK YOUR COMPLAINT
        </p>
        <h1 className="display-font text-3xl md:text-4xl font-bold text-[#0B1F3A] mb-2">
          Where does my issue stand?
        </h1>
        <p className="text-[#64748B] mb-8">
          Enter the grievance ID you received after submitting your report to see its current status.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E5EEEC] rounded-3xl p-6 md:p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-2">Grievance ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError('');
              }}
              placeholder="Paste your grievance ID here"
              className="w-full bg-white border-2 border-[#E5EEEC] rounded-xl px-4 py-3 text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5A0] transition-colors"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#0B1F3A] text-white font-semibold py-3.5 rounded-full hover:bg-[#0EA5A0] transition-colors"
          >
            Check status
          </button>
        </form>
      </div>
    </div>
  );
}