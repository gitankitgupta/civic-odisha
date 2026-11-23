import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    let timer;
    const goOnline = () => {
      setOnline(true);
      setShowBack(true);
      timer = setTimeout(() => setShowBack(false), 2500);
    };
    const goOffline = () => {
      setOnline(false);
      setShowBack(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearTimeout(timer);
    };
  }, []);

  if (online && !showBack) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[9999] text-center text-xs font-semibold py-2 ${
        online ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
      }`}
    >
      {online ? 'Back online' : "You're offline. Reports can't be sent until you reconnect."}
    </div>
  );
}