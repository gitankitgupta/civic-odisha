import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CitizenLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const maskedEmail = (() => {
    if (!email.includes('@')) return email;
    const [user, domain] = email.split('@');
    const masked = user.length > 1 ? user[0] + '*'.repeat(user.length - 1) : user;
    return `${masked}@${domain}`;
  })();

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (otpError) {
      if (otpError.message.toLowerCase().includes('rate limit') || otpError.status === 429) {
        setError('Please wait a moment before requesting another OTP.');
      } else {
        setError(otpError.message || 'Failed to send OTP. Please try again.');
      }
      return;
    }

    setMessage(`OTP sent to: ${maskedEmail}`);
    setStep('otp');
  };

    const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setLoading(false);
      if (verifyError.message.toLowerCase().includes('expired')) {
        setError('OTP expired. Please request a new one.');
      } else {
        setError('Invalid OTP. Please check and try again.');
      }
      return;
    }

        if (data?.session) {
      let isNewProfile = false;
      try {
        const profileRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/citizen/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
        const profileData = await profileRes.json();
                isNewProfile = !profileData?.name;
      } catch (err) {
        console.error('Failed to create citizen profile:', err);
      }
      setLoading(false);
      navigate(isNewProfile ? '/complete-profile' : '/citizen-dashboard');
    } else {
      setLoading(false);
    }
};
  const handleResend = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (otpError) {
      setError(otpError.message || 'Failed to resend OTP.');
      return;
    }
    setMessage(`OTP resent to: ${maskedEmail}`);
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
        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3 text-center">CITIZEN LOGIN</p>
        <h1 className="display-font text-2xl font-bold text-[#0B1F3A] mb-8 text-center">
          {step === 'email' ? 'Enter your Gmail address' : 'Verify your OTP'}
        </h1>

        <div className="bg-white border border-[#E5EEEC] rounded-3xl p-6 shadow-sm">
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className={inputClass}
                autoFocus
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B1F3A] text-white font-semibold py-3 rounded-full hover:bg-[#0EA5A0] transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {message && <p className="text-sm text-[#64748B]">{message}</p>}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                className={`${inputClass} text-center text-lg tracking-[0.3em]`}
                autoFocus
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B1F3A] text-white font-semibold py-3 rounded-full hover:bg-[#0EA5A0] transition-colors disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full text-sm font-medium text-[#0EA5A0] hover:underline"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(''); setMessage(''); }}
                className="w-full text-xs text-[#94A3B8] hover:underline"
              >
                Change email address
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}