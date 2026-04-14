'use client'
import { useState, useEffect } from 'react';
import Tomato from './Tomato';
import CalendarWidget from '../app/calendar';
import Planner from './comp/Planner';
import MobileNav from './comp/MobileNav';

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Controlla se abbiamo già fatto il login in passato
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

  // SCHERMATA DI LOGIN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl w-full max-w-md text-center border-t-2 border-[#FF914D]">
          <h1 className="text-2xl font-black text-white uppercase italic tracking-widest mb-2">Freeway<span className="text-[#FF914D]">-</span>Life</h1>
          <p className="text-xs font-mono text-zinc-500 mb-8 uppercase">Accesso Operativo</p>
          
          <input 
            type="text" 
            placeholder="INSERISCI IL TUO ID..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-black/50 border border-white/10 p-4 rounded-xl font-mono text-sm uppercase text-white mb-4 outline-none focus:border-[#FF914D]"
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-[#FF914D] text-black font-black uppercase italic py-4 rounded-xl hover:bg-white transition-all"
          >
            Inizializza
          </button>
        </div>
      </div>
    );
  }

  // SCHERMATA DELL'APP (DASHBOARD)
  return (
    <div className="min-h-screen pb-24 p-4 md:p-8">
      {/* Header con Logout */}
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-widest">
            Freeway<span className="text-[#FF914D]">-</span>Life
          </h1>
          <p className="text-[10px] font-mono text-[#FF914D] uppercase mt-1">Operatore: {username}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-4 py-2 rounded-lg hover:text-red-500 hover:border-red-500 transition-all"
        >
          LOGOUT
        </button>
      </header>

      {/* Griglia della Dashboard */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Tomato />
          <CalendarWidget />
        </div>
        <div>
          <Planner />
        </div>
      </main>

      {/* Navigazione Mobile (Quella che mi hai mandato tu) */}
      <MobileNav />
    </div>
  );
}