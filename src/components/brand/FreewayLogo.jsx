import React, { useId } from 'react';

export default function FreewayLogo({ className = '', iconClassName = '', showWordmark = false }) {
  const id = useId().replace(/:/g, '');
  const surfaceId = `freeway-logo-surface-${id}`;
  const rimId = `freeway-logo-rim-${id}`;
  const routeId = `freeway-logo-route-${id}`;
  const sparkId = `freeway-logo-spark-${id}`;
  const depthId = `freeway-logo-depth-${id}`;
  const glowId = `freeway-logo-glow-${id}`;
  const clipId = `freeway-logo-clip-${id}`;
  const roadMaskId = `freeway-logo-road-mask-${id}`;

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={`h-10 w-10 shrink-0 drop-shadow-[0_0_20px_rgba(34,211,238,0.35)] ${iconClassName}`}
      >
        <defs>
          <linearGradient id={surfaceId} x1="8" y1="4" x2="58" y2="61" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#13263a" />
            <stop offset="0.48" stopColor="#02050c" />
            <stop offset="1" stopColor="#001b18" />
          </linearGradient>
          <linearGradient id={rimId} x1="10" y1="6" x2="55" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f8fafc" stopOpacity="0.7" />
            <stop offset="0.42" stopColor="#22d3ee" stopOpacity="0.38" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0.62" />
          </linearGradient>
          <linearGradient id={routeId} x1="12" y1="51" x2="54" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff914d" />
            <stop offset="0.42" stopColor="#34d399" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
          <radialGradient
            id={sparkId}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(23 -26 26 23 45 14)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ecfeff" />
            <stop offset="0.42" stopColor="#67e8f9" stopOpacity="0.55" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
          </radialGradient>
          <filter id={depthId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
          </filter>
          <filter id={glowId} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={clipId}>
            <rect x="5" y="5" width="54" height="54" rx="17" />
          </clipPath>
          <mask id={roadMaskId}>
            <rect width="64" height="64" fill="black" />
            <path
              d="M18.8 50.2V21.4c0-5 4-9 9-9h20.6c2.8 0 5 2.2 5 5s-2.2 5-5 5H30.6c-1.2 0-2.1 0.9-2.1 2.1v5.6h15c2.7 0 4.8 2.1 4.8 4.8s-2.1 4.8-4.8 4.8h-15v10.5c0 2.7-2.2 5-4.9 5s-4.8-2.3-4.8-5Z"
              fill="white"
            />
          </mask>
        </defs>
        <rect x="5" y="5" width="54" height="54" rx="17" fill={`url(#${surfaceId})`} />
        <g clipPath={`url(#${clipId})`}>
          <circle cx="46" cy="14" r="23" fill={`url(#${sparkId})`} opacity="0.85" />
          <path d="M-2 49C16 41 30 47 66 29" stroke="#34d399" strokeWidth="9" strokeOpacity="0.08" />
          <path d="M10 63C23 47 38 39 59 37" stroke="#67e8f9" strokeWidth="4" strokeOpacity="0.12" />
        </g>
        <rect x="6.5" y="6.5" width="51" height="51" rx="15.5" fill="none" stroke={`url(#${rimId})`} strokeWidth="1.4" />
        <path
          d="M18.8 50.2V21.4c0-5 4-9 9-9h20.6c2.8 0 5 2.2 5 5s-2.2 5-5 5H30.6c-1.2 0-2.1 0.9-2.1 2.1v5.6h15c2.7 0 4.8 2.1 4.8 4.8s-2.1 4.8-4.8 4.8h-15v10.5c0 2.7-2.2 5-4.9 5s-4.8-2.3-4.8-5Z"
          fill="#f8feff"
          filter={`url(#${depthId})`}
        />
        <path
          d="M14 48C24.5 46 33.8 39.8 39.6 30.2C44.9 21.4 49 16.4 55 14"
          stroke={`url(#${routeId})`}
          strokeWidth="4.4"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />
        <path
          d="M16 48.4C27.4 43 35.2 35.6 40.4 23.4"
          stroke="#02050c"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeDasharray="4.5 4.5"
          opacity="0.78"
          mask={`url(#${roadMaskId})`}
        />
        <path
          d="M49.2 12.4L55 14L51.7 19"
          fill="none"
          stroke="#ecfeff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="13" cy="51" r="2.2" fill="#ff914d" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-grotesk text-sm font-black tracking-[0.12em] text-white">FREEWAY</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-primary/70">Life</span>
        </span>
      )}
    </span>
  );
}
