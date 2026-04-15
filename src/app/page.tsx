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

  // SCHERMATA LOGIN PREMIUM
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

  // DASHBOARD
  return (
    <div className="min-h-screen pb-32 p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto px-2">
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

      {/* GRIGLIA SISTEMATA: 1 colonna su mobile, 3 colonne su PC */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 px-2">
        
        {/* Colonna Sinistra (Occupa 1 spazio su 3) */}
        <div className="flex flex-col gap-6 lg:gap-8 lg:col-span-1">
          <Tomato />
          <CalendarWidget />
        </div>
        
        {/* Colonna Destra (Occupa 2 spazi su 3) */}
        <div className="flex flex-col gap-6 lg:gap-8 lg:col-span-2 h-full">
          <Planner />
        </div>

      </main>

      <MobileNav />
    </div>
  );
}