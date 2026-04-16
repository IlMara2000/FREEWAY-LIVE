'use client'
import { useState, useEffect } from 'react';
import Tomato from './Tomato';
import CalendarWidget from './Calendar';
import Planner from './comp/Planner';
import MobileNav from './comp/MobileNav';
import { motion } from 'framer-motion';

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // NUOVO: Stato che controlla se siamo in Hyper-Focus
  const [isHyperFocus, setIsHyperFocus] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('freeway_user');
    if (savedName) {
      setUsername(savedName);
      setIsLoggedIn(true);
    }
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 rounded-[2rem] w-full max-w-md text-center border-t border-emerald-500/50 shadow-2xl shadow-emerald-500/10"
        >
          <h1 className="text-3xl font-black text-white tracking-widest mb-2">FREEWAY<span className="text-emerald-500 text-4xl">.</span>LIFE</h1>
          <p className="text-[10px] font-mono text-emerald-400 mb-10 uppercase tracking-[0.3em]">Accesso Operativo</p>
          
          <input 
            type="text" 
            placeholder="INSERISCI IL TUO ID..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-sm uppercase text-white mb-6 outline-none focus:border-emerald-500/50 transition-colors text-center"
          />
          <button 
            onClick={handleLogin}
            className="btn-emerald-loading w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm"
          >
            Inizializza
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 p-4 md:p-8 overflow-x-hidden">
      
      {/* HEADER - Si sfoca in Hyper-Focus */}
      <header className={`flex justify-between items-center mb-8 max-w-[1400px] mx-auto px-2 transition-all duration-700 ease-in-out ${isHyperFocus ? 'opacity-10 blur-md pointer-events-none scale-95' : 'opacity-100'}`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest">
            FREEWAY<span className="text-emerald-500 text-4xl leading-none">.</span>LIFE
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Operatore: <span className="text-emerald-400">{username}</span></p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors tracking-widest uppercase"
        >
          Disconnetti
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 px-2 relative">
        
        {/* COLONNA SINISTRA */}
        <div className="flex flex-col gap-6 lg:gap-8 md:col-span-1 z-10">
          {/* Il Timer riceve la funzione che cambia lo stato di Hyper-Focus */}
          <Tomato onFocusChange={setIsHyperFocus} />
          
          {/* CALENDARIO - Si sfoca in Hyper-Focus */}
          <div className={`transition-all duration-700 ease-in-out ${isHyperFocus ? 'opacity-10 blur-xl pointer-events-none scale-95 translate-y-4' : 'opacity-100'}`}>
            <CalendarWidget />
          </div>
        </div>
        
        {/* COLONNA DESTRA (PLANNER) - Si sfoca in Hyper-Focus */}
        <div className={`flex flex-col gap-6 lg:gap-8 md:col-span-2 h-full transition-all duration-700 ease-in-out origin-top-right ${isHyperFocus ? 'opacity-5 blur-2xl pointer-events-none scale-95 translate-x-4' : 'opacity-100'}`}>
          <Planner />
        </div>

      </main>

      {/* NASCONDI LA NAVBAR MOBILE IN HYPER FOCUS */}
      <div className={`transition-opacity duration-700 ${isHyperFocus ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <MobileNav />
      </div>

    </div>
  );
}