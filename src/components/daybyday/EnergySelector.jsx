import React from 'react';
import { ENERGY_MODES } from '@/lib/day-by-day';

export default function EnergySelector({ value, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ENERGY_MODES.map((mode) => {
        const active = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(mode.value)}
            className={`min-h-[74px] rounded-xl border p-3 text-left transition-all ${
              active
                ? 'border-emerald-400/60 bg-emerald-400/15 text-white shadow-[0_0_26px_rgba(16,185,129,0.16)]'
                : 'border-white/10 bg-black/20 text-white/55 hover:border-emerald-400/30 hover:text-white'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="block font-grotesk text-sm font-semibold">
              {mode.shortLabel}
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-white/42">
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
