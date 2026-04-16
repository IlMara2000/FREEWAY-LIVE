'use client'
import { useState, useEffect } from 'react';
import Tomato from './Tomato';
import CalendarWidget from './Calendar';
import Planner from './comp/Planner';
import MobileNav from './comp/MobileNav';
import BrainDump from './comp/BrainDump'; 
import ThemeStore from './comp/ThemeStore'; // IMPORTIAMO IL NEGOZIO DELLE GEMME
import { motion } from 'framer-motion';

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Stato che controlla se siamo in Hyper-Focus
  const [isHyperFocus, setIsHyperFocus] = useState(false);
  
  // Stati per la Gamification
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const savedName = localStorage.getItem('freeway_user');
    const savedXp = parseInt(localStorage.getItem('freeway_xp') || '0');
    
    if (savedName) {
      setUsername(savedName);
      setIsLoggedIn(true);
      setXp(savedXp);
      setLevel(Math.floor(savedXp / 100) + 1); // Si sale di livello ogni 100 XP
    }

    // Ascoltatore globale per i punti XP
    const handleAddXp = (e: any) => {
      setXp(prev => {
        const newXp = prev + e.detail;
        localStorage.setItem('freeway_xp', newXp.toString());
        setLevel(Math.floor(newXp / 100) + 1);
        return newXp;
      });
    };

    window.addEventListener('addXp', handleAddXp);
    return () => window.removeEventListener('addXp', handleAddXp);
  }, []);

  const handleLogin = () => {
    if (inputValue.trim()) {
      localStorage.setItem('freeway_user', inputValue);
      setUsername(inputValue);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('freeway_user');
    setIsLoggedIn(false);
    setUsername('');
  };

  // Calcolo per la percentuale della barra (da 0 a 100 per il livello corrente)
  const xpInCurrentLevel = xp % 100;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-10 rounded-[2rem] w-full max-w-md text-center border-t border-emerald-500/50 shadow-2xl shadow-emerald-500/10">
          <h1 className="text-3xl font-black text-white tracking-widest mb-2">FREEWAY<span className="text-emerald-500 text-4xl">.</span>LIFE</h1>
          <p className="text-[10px] font-mono text-emerald-400 mb-10 uppercase tracking-[0.3em]">Accesso Operativo</p>
          <input 
            type="text" placeholder="INSERISCI IL TUO ID..." value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-sm uppercase text-white mb-6 outline-none focus:border-emerald-500/50 transition-colors text-center"
          />
          <button onClick={handleLogin} className="btn-emerald-loading w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm">
            Inizializza
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 p-4 md:p-8 overflow-x-hidden">
      
      {/* HEADER + REATTORE XP */}
      <header className={`flex flex-col md:flex-row justify-between items-center gap-6 mb-8 max-w-[1400px] mx-auto px-2 transition-all duration-700 ease-in-out ${isHyperFocus ? 'opacity-10 blur-md pointer-events-none scale-95' : 'opacity-100'}`}>
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest">
            FREEWAY<span className="text-emerald-500 text-4xl leading-none">.</span>LIFE
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            Operatore: <span className="text-emerald-400">{username}</span>
          </p>
        </div>

        {/* REATTORE CORE (Barra Livello) */}
        <div className="flex-1 w-full max-w-md px-4">
          
          {/* QUI ABBIAMO INSERITO IL THEME STORE */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-2 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span>Livello {level}</span>
              <ThemeStore level={level} /> 
            </div>
            <span className="text-emerald-400 font-bold">{xp} XP</span>
          </div>
          
          <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
            <motion.div 
              className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${xpInCurrentLevel}%` }}
              transition={{ duration: 1, type: "spring" }}
            />
          </div>
        </div>

        <button onClick={handleLogout} className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors tracking-widest uppercase">
          Disconnetti
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 px-2 relative">
        <div className="flex flex-col gap-6 lg:gap-8 md:col-span-1 z-10">
          <Tomato onFocusChange={setIsHyperFocus} />
          <div className={`transition-all duration-700 ease-in-out ${isHyperFocus ? 'opacity-10 blur-xl pointer-events-none scale-95 translate-y-4' : 'opacity-100'}`}>
            <CalendarWidget />
          </div>
        </div>
        
        <div className={`flex flex-col gap-6 lg:gap-8 md:col-span-2 h-full transition-all duration-700 ease-in-out origin-top-right ${isHyperFocus ? 'opacity-5 blur-2xl pointer-events-none scale-95 translate-x-4' : 'opacity-100'}`}>
          <Planner />
        </div>
      </main>

      <div className={`transition-opacity duration-700 ${isHyperFocus ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <MobileNav />
      </div>

      {/* LA CAMERA DI COMPENSAZIONE (Sempre visibile, anche in Hyper-Focus) */}
      <BrainDump />

    </div>
  );
}