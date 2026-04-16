'use client'
import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Trophy, CloudRain, Waves, Headphones, VolumeX } from 'lucide-react';

interface TomatoProps {
  onFocusChange?: (isActive: boolean) => void;
}

// 25 minuti standard
const FOCUS_TIME = 25 * 60;

// Tracce audio pubbliche per l'Oasi Sonora
const SOUNDS = {
  rain: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3',
  waves: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_75f14e7a83.mp3',
  lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf7ea.mp3'
};

export default function Tomato({ onFocusChange }: TomatoProps) {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  
  // Stati per l'Oasi Sonora
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSound, setActiveSound] = useState<'rain' | 'waves' | 'lofi' | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      toggleFocus(false);
      window.dispatchEvent(new CustomEvent('addXp', { detail: 15 }));
      alert("Focus completato! +15 XP Guadagnati. Fai una pausa!");
      setTimeLeft(FOCUS_TIME);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleFocus = (forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !isActive;
    setIsActive(newState);
    if (onFocusChange) onFocusChange(newState);
  };

  // Funzione magica per il Mini-Player
  const toggleSound = (sound: 'rain' | 'waves' | 'lofi') => {
    if (!audioRef.current) return;
    
    if (activeSound === sound) {
      // Se clicco quello già attivo, metto in pausa
      audioRef.current.pause();
      setActiveSound(null);
    } else {
      // Cambio traccia e faccio partire
      audioRef.current.src = SOUNDS[sound];
      audioRef.current.play();
      setActiveSound(sound);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setActiveSound(null);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / FOCUS_TIME) * circumference;

  return (
    <div className={`glass-panel p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden border transition-all duration-700 shadow-2xl ${
      isActive ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'border-white/5'
    }`}>
      
      {/* Player Audio Nascosto */}
      <audio ref={audioRef} loop />

      {/* Reminder visivo della ricompensa */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 opacity-80 z-10">
        <Trophy size={12} />
        <span className="text-[10px] font-black">+15 XP</span>
      </div>

      <h2 className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 transition-colors z-10 ${isActive ? 'text-emerald-500 font-bold animate-pulse' : 'text-zinc-500'}`}>
        {isActive ? 'Hyper-Focus Attivo' : 'Focus Unit'}
      </h2>
      
      {/* ANELLO DEL TEMPO */}
      <div className="relative flex items-center justify-center w-56 h-56 mb-6">
        <svg className="absolute w-full h-full transform -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
          <defs>
            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="112" cy="112" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
          <circle cx="112" cy="112" r={radius} stroke="url(#emeraldGradient)" strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] absolute">
          {minutes}:{seconds < 10 ? '0' : ''}{seconds}
        </div>
      </div>

      {/* BOTTONI TIMER */}
      <div className="flex gap-3 w-full justify-center z-10 mb-6">
        <button 
          onClick={() => toggleFocus()}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex-1 max-w-[180px] ${
            isActive ? 'bg-zinc-900 text-red-400 border border-red-500/30 hover:bg-red-500/10' : 'btn-emerald-loading'
          }`}
        >
          <Play size={14} className={isActive ? 'opacity-50 hidden' : ''} /> {isActive ? 'Interrompi' : 'Start Focus'}
        </button>
        <button onClick={() => { toggleFocus(false); setTimeLeft(FOCUS_TIME); }} className="p-4 bg-black/40 rounded-2xl text-zinc-500 hover:text-white transition-colors border border-white/5 hover:border-white/10">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* OASI SONORA (Mini-Player) */}
      <div className="flex items-center justify-center gap-2 bg-black/50 p-2 rounded-2xl border border-white/5 z-10 w-full max-w-[240px]">
        <button 
          onClick={() => toggleSound('rain')} 
          className={`p-3 rounded-xl transition-all ${activeSound === 'rain' ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          title="Pioggia"
        >
          <CloudRain size={16} />
        </button>
        <button 
          onClick={() => toggleSound('waves')} 
          className={`p-3 rounded-xl transition-all ${activeSound === 'waves' ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          title="Oceano"
        >
          <Waves size={16} />
        </button>
        <button 
          onClick={() => toggleSound('lofi')} 
          className={`p-3 rounded-xl transition-all ${activeSound === 'lofi' ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          title="Lo-Fi Beats"
        >
          <Headphones size={16} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button 
          onClick={stopAudio} 
          className={`p-3 rounded-xl transition-all ${activeSound === null ? 'text-zinc-700 pointer-events-none' : 'text-red-400 hover:bg-red-500/10'}`}
          title="Muto"
        >
          <VolumeX size={16} />
        </button>
      </div>

    </div>
  );
}