'use client'
import { useState, useEffect } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

interface TomatoProps {
  onFocusChange?: (isActive: boolean) => void;
}

export default function Tomato({ onFocusChange }: TomatoProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      toggleFocus(false);
      setScore((s) => s + 10);
      alert("Focus completato! +10 Punti. Pausa!");
      setTimeLeft(25 * 60);
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

  return (
    <div className={`glass-panel p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden border transition-all duration-700 shadow-2xl min-h-[250px] ${
      isActive ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'border-white/5'
    }`}>
      
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
        <Trophy size={12} />
        <span className="text-[10px] font-black">{score}</span>
      </div>

      <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-4 mt-2 transition-colors ${isActive ? 'text-emerald-500 font-bold animate-pulse' : 'text-zinc-500'}`}>
        {isActive ? 'Hyper-Focus Attivo' : 'Focus Unit'}
      </h2>
      
      <div className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-8 tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        {minutes}:{seconds < 10 ? '0' : ''}{seconds}
      </div>

      <div className="flex gap-3 w-full justify-center">
        <button 
          onClick={() => toggleFocus()}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex-1 max-w-[180px] ${
            isActive ? 'bg-zinc-900 text-red-400 border border-red-500/30 hover:bg-red-500/10' : 'btn-emerald-loading'
          }`}
        >
          <Play size={14} className={isActive ? 'opacity-50 hidden' : ''} /> {isActive ? 'Interrompi' : 'Start Focus'}
        </button>
        <button 
          onClick={() => { toggleFocus(false); setTimeLeft(25 * 60); }}
          className="p-4 bg-black/40 rounded-2xl text-zinc-500 hover:text-white transition-colors border border-white/5 hover:border-white/10"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}