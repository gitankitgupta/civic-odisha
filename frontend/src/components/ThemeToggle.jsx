import { useState, useEffect } from 'react';

function getInitialTheme() {
  const saved = localStorage.getItem('civic_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('civic_theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <>
      <style>{`
        .theme-btn {
          width: 38px;
          height: 38px;
          margin-left: 6px;
          border-radius: 50%;
          border: 1px solid #E5EEEC;
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease;
        }
        .theme-btn:hover {
          border-color: #0EA5A0;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(14, 165, 160, 0.35);
        }
        .theme-btn:active {
          transform: translateY(0) scale(0.88);
          box-shadow: 0 2px 6px rgba(14, 165, 160, 0.3);
        }
        .theme-btn:focus-visible {
          outline: 2px solid #0EA5A0;
          outline-offset: 2px;
        }
        .theme-icon {
          display: inline-block;
          transition: transform .3s ease;
          animation: theme-pop .45s ease;
        }
        .theme-btn:hover .theme-icon {
          transform: rotate(20deg) scale(1.15);
        }
        @keyframes theme-pop {
          from { transform: rotate(-120deg) scale(0.4); opacity: 0; }
          to { transform: rotate(0) scale(1); opacity: 1; }
        }
        [data-theme="dark"] .theme-btn {
          background: #162236;
          border-color: #223049;
        }
        [data-theme="dark"] .theme-btn:hover {
          border-color: #0EA5A0;
          background: #1b2940;
        }
      `}</style>

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Light theme' : 'Dark theme'}
        className="theme-btn"
      >
        <span key={theme} className="theme-icon">
          {isDark ? '☀️' : '🌙'}
        </span>
      </button>
    </>
  );
}