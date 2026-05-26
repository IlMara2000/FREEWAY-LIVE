import React, { useId } from 'react';

export default function FreewayLogo({ className = '', iconClassName = '', showWordmark = false }) {
  const id = useId().replace(/:/g, '');
  const surfaceId = `freeway-surface-${id}`;
  const accentId = `freeway-accent-${id}`;
  const rimId = `freeway-rim-${id}`;
  const shineId = `freeway-shine-${id}`;

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={`h-10 w-10 shrink-0 drop-shadow-[0_0_18px_rgba(52,211,153,0.24)] ${iconClassName}`}
      >
        <defs>
          <linearGradient id={surfaceId} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#17231f" />
            <stop offset="0.46" stopColor="#06090c" />
            <stop offset="1" stopColor="#04130f" />
          </linearGradient>
          <linearGradient id={accentId} x1="15" y1="49" x2="50" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff914d" />
            <stop offset="0.52" stopColor="#34d399" />
            <stop offset="1" stopColor="#d9fff1" />
          </linearGradient>
          <linearGradient id={rimId} x1="9" y1="6" x2="55" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="0.42" stopColor="#34d399" stopOpacity="0.68" />
            <stop offset="1" stopColor="#ff914d" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={shineId} cx="0" cy="0" r="1" gradientTransform="matrix(26 -18 18 26 17 11)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="5" y="5" width="54" height="54" rx="17" fill={`url(#${surfaceId})`} />
        <rect x="5" y="5" width="54" height="54" rx="17" fill={`url(#${shineId})`} />
        <rect x="6.25" y="6.25" width="51.5" height="51.5" rx="15.75" fill="none" stroke={`url(#${rimId})`} strokeWidth="1.5" />
        <path d="M20 48V17h25" fill="none" stroke="#f8fffb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 32h19" fill="none" stroke="#f8fffb" strokeWidth="8" strokeLinecap="round" />
        <path d="M20 48C28 43 35 36 40 27c2.5-4.5 5.8-8.1 10-10.5" fill="none" stroke={`url(#${accentId})`} strokeWidth="6" strokeLinecap="round" />
        <path d="M45 16.5h5v5" fill="none" stroke="#f8fffb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 43.5c5.2-4.1 9.3-9.1 12.3-15" fill="none" stroke="#06100d" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3.2 3.2" opacity="0.76" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-grotesk text-sm font-black tracking-[0.08em] text-white">FREEWAY</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/75">Life</span>
        </span>
      )}
    </span>
  );
}
