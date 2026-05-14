import React from 'react';

export default function FreewayLogo({ className = '', showWordmark = false }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="h-10 w-10 shrink-0 drop-shadow-[0_0_18px_rgba(45,212,191,0.42)]"
      >
        <defs>
          <linearGradient id="freeway-logo-bg" x1="9" y1="5" x2="55" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0f2130" />
            <stop offset="0.48" stopColor="#02050c" />
            <stop offset="1" stopColor="#04141d" />
          </linearGradient>
          <linearGradient id="freeway-logo-lane" x1="16" y1="52" x2="50" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="0.34" stopColor="#34d399" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="54" height="54" rx="17" fill="url(#freeway-logo-bg)" />
        <rect x="6.5" y="6.5" width="51" height="51" rx="15.5" fill="none" stroke="#67e8f9" strokeOpacity="0.32" />
        <path
          d="M18 50L31 15"
          stroke="url(#freeway-logo-lane)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M35 50L48 15"
          stroke="url(#freeway-logo-lane)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M25 39L41 20"
          stroke="#02050c"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 5"
          opacity="0.9"
        />
        <path
          d="M19 24H43"
          stroke="#f8fafc"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 24V45"
          stroke="#f8fafc"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M20 34H36"
          stroke="#f8fafc"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <circle cx="48" cy="16" r="4" fill="#a7f3d0" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-grotesk text-sm font-black tracking-[0.16em] text-white">FREEWAY</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.32em] text-primary/70">Life</span>
        </span>
      )}
    </span>
  );
}
