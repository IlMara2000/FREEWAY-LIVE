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
      clearInterval(interval);
      setIsActive(false);
      setScore((s) => s + 10);
      alert("Focus completato! +10 Punti. Pausa!");
      setTimeLeft(25 * 60);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#FF914D]/20 text-[#FF914D] px-3 py-1 rounded-full border border-[#FF914D]/30">
        <Trophy size={14} />
        <span className="text-[10px] font-black">{score}</span>
      </div>

      <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Focus Unit</h2>
      
      <div className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 tabular-nums">
        {minutes}:{seconds < 10 ? '0' : ''}{seconds}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-xs transition-all ${
            isActive ? 'bg-zinc-800 text-zinc-400' : 'bg-[#FF914D] text-black hover:scale-105'
          }`}
        >
          <Play size={16} /> {isActive ? 'Pausa' : 'Start Focus'}
        </button>
        <button 
          onClick={() => { setIsActive(false); setTimeLeft(25 * 60); }}
          className="p-3 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}