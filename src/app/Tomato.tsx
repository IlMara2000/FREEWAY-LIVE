'use client'
import { useState, useEffect } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

interface TomatoProps {
  onFocusChange?: (isActive: boolean) => void;
}

// 25 minuti standard
const FOCUS_TIME = 25 * 60;

export default function Tomato({ onFocusChange }: TomatoProps) {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      toggleFocus(false);
      
      // SPARA IL SEGNALE DEI PUNTI GLOBALI (DOPAMINA!)
      window.dispatchEvent(new CustomEvent('addXp', { detail: 15 }));
      
      alert("Focus completato! +15 XP Guadagnati. Fai una pausa!");
      setTimeLeft(FOCUS_TIME);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Funzione magica che accende/spegne il timer e avvisa il resto dell'app
  const toggleFocus = (forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !isActive;
    setIsActive(newState);
    if (onFocusChange) {
      onFocusChange(newState);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // --- MATEMATICA DELL'ANELLO DEL TEMPO ---
  const radius = 100; // Raggio del cerchio
  const circumference = 2 * Math.PI * radius; // Circonferenza totale
  // Calcola quanto cerchio "cancellare" in base al tempo passato
  const strokeDashoffset = circumference - (timeLeft / FOCUS_TIME) * circumference;

  return (
    <div className={`glass-panel p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden border transition-all duration-700 shadow-2xl ${
      isActive ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'border-white/5'
    }`}>
      
      {/* Reminder visivo della ricompensa */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 opacity-80 z-10">
        <Trophy size={12} />
        <span className="text-[10px] font-black">+15 XP</span>
      </div>

      <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 transition-colors z-10 ${isActive ? 'text-emerald-500 font-bold animate-pulse' : 'text-zinc-500'}`}>
        {isActive ? 'Hyper-Focus Attivo' : 'Focus Unit'}
      </h2>
      
      {/* ANELLO DEL TEMPO & NUMERI */}
      <div className="relative flex items-center justify-center w-56 h-56 mb-6">
        {/* SVG dell'anello */}
        <svg className="absolute w-full h-full transform -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
          <defs>
            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" /> {/* Verde più chiaro */}
              <stop offset="100%" stopColor="#059669" /> {/* Verde scuro */}
            </linearGradient>
          </defs>
          
          {/* Cerchio di sfondo (fantasma) */}
          <circle 
            cx="112" cy="112" r={radius} 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth="6" 
            fill="none" 
          />
          
          {/* Cerchio del tempo (Neon) */}
          <circle 
            cx="112" cy="112" r={radius} 
            stroke="url(#emeraldGradient)" 
            strokeWidth="8" 
            fill="none" 
            strokeLinecap="round"
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Numeri al centro esatto */}
        <div className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] absolute">
          {minutes}:{seconds < 10 ? '0' : ''}{seconds}
        </div>
      </div>

      {/* BOTTONI */}
      <div className="flex gap-3 w-full justify-center z-10">
        <button 
          onClick={() => toggleFocus()}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex-1 max-w-[180px] ${
            isActive ? 'bg-zinc-900 text-red-400 border border-red-500/30 hover:bg-red-500/10' : 'btn-emerald-loading'
          }`}
        >
          <Play size={14} className={isActive ? 'opacity-50 hidden' : ''} /> {isActive ? 'Interrompi' : 'Start Focus'}
        </button>
        <button 
          onClick={() => { toggleFocus(false); setTimeLeft(FOCUS_TIME); }}
          className="p-4 bg-black/40 rounded-2xl text-zinc-500 hover:text-white transition-colors border border-white/5 hover:border-white/10"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}