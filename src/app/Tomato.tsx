'use client'
import { useState, useEffect } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

export default function Tomato() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval); setIsActive(false); setScore((s) => s + 10);
      alert("Focus completato! +10 Punti. Pausa!"); setTimeLeft(25 * 60);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden border border-white/5 shadow-2xl min-h-[260px]">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
        <Trophy size={12} />
        <span className="text-[10px] font-black">{score}</span>
      </div>
      <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-4 mt-2">Focus Unit</h2>
      
      <div className="text-6xl lg:text-7xl font-black text-white tracking-tighter mb-8 tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        {minutes}:{seconds < 10 ? '0' : ''}{seconds}
      </div>

      <div className="flex gap-3 w-full justify-center">
        <button onClick={() => setIsActive(!isActive)} className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex-1 max-w-[160px] ${isActive ? 'bg-zinc-800 text-zinc-400 border border-white/5' : 'btn-emerald-loading'}`}>
          <Play size={14} className={isActive ? 'opacity-50' : ''} /> {isActive ? 'Pausa' : 'Start Focus'}
        </button>
        <button onClick={() => { setIsActive(false); setTimeLeft(25 * 60); }} className="p-4 bg-black/40 rounded-2xl text-zinc-500 hover:text-white transition-colors border border-white/5 hover:border-white/10">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}