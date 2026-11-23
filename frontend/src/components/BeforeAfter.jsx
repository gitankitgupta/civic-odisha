import { useState } from 'react';

export default function BeforeAfter({ before, after }) {
  const [pos, setPos] = useState(50);

  if (!before || !after) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
        Before and after
      </h2>

      <div className="relative w-full h-64 rounded-xl overflow-hidden select-none bg-[#F8FAF9]">
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        <img
          src={before}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-0 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-[#0B1F3A] text-xs font-bold">
            ↔
          </div>
        </div>

        <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wide bg-black/60 text-white px-2 py-0.5 rounded-full">
          BEFORE
        </span>
        <span className="absolute top-2 right-2 text-[10px] font-semibold tracking-wide bg-black/60 text-white px-2 py-0.5 rounded-full">
          AFTER
        </span>

        <input
          type="range"
          min="0"
          max="100"
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Compare before and after photos"
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>
    </div>
  );
}