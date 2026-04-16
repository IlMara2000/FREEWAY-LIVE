'use client'
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; 
import Tomato from './Tomato';
import CalendarWidget from './Calendar';
import Planner from './comp/Planner';
import MobileNav from './comp/MobileNav';
import BrainDump from './comp/BrainDump'; 
import ThemeStore from './comp/ThemeStore';
import { motion } from 'framer-motion';
// Importiamo il tipo Session per garantire che il build su Vercel vada a buon fine
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null); // Riferimento persistente per l'utente (necessario per gli event listener)
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); 
  
  const [isHyperFocus, setIsHyperFocus] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    // Funzione per caricare i dati del profilo dal Cloud
    const loadUserData = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('xp').eq('id', userId).single();
      if (data) {
        const cloudXp = data.xp || 0;
        setXp(cloudXp);
        setLevel(Math.floor(cloudXp / 100) + 1);
      }
    };

    // 1. Controlla sessione all'avvio (Tipizzato per evitare errori di build)
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;
      if (currentUser) loadUserData(currentUser.id);
      setAuthChecking(false);
    });

    // 2. Ascolta i cambiamenti di stato autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;
      if (currentUser) loadUserData(currentUser.id);
    });

    // 3. Gestore globale per l'accredito XP (connesso al Cloud)
    const handleAddXp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const points = customEvent.detail || 0;
      
      setXp(prev => {
        const newXp = prev + points;
        setLevel(Math.floor(newXp / 100) + 1);
        
        // Sincronizzazione Cloud istantanea
        if (userRef.current) {
          supabase.from('profiles').update({ xp: newXp }).eq('id', userRef.current.id).then();
        }
        
        return newXp;
      });
    };

    window.addEventListener('addXp', handleAddXp);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('addXp', handleAddXp);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Inserisci email e password!");
    
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Operatore registrato! Controlla l'email per la conferma (se richiesto).");
      }
    } catch (err: any) {
      alert(`ERRORE DI ACCESSO: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const xpInCurrentLevel = xp % 100;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-emerald-500 animate-pulse font-mono text-xs uppercase tracking-[0.3em]">
          Inizializzazione Core...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
          className="glass-panel p-10 rounded-[2rem] w-full max-w-md text-center border-t border-emerald-500/50 shadow-2xl shadow-emerald-500/10"
        >
          <h1 className="text-3xl font-black text-white tracking-widest mb-2">FREEWAY<span className="text-emerald-500 text-4xl">.</span>LIFE</h1>
          <p className="text-[10px] font-mono text-emerald-400 mb-8 uppercase tracking-[0.3em]">Accesso Operativo</p>
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input 
              type="email" placeholder="EMAIL OPERATORE" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-sm text-white outline-none focus:border-emerald-500/50 transition-colors text-center"
            />
            <input 
              type="password" placeholder="PASSWORD SICURA" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-sm text-white mb-2 outline-none focus:border-emerald-500/50 transition-colors text-center tracking-widest"
            />
            
            <button type="submit" disabled={authLoading} className="btn-emerald-loading w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm">
              {authLoading ? 'Sincronizzazione...' : (isLoginMode ? 'Inizializza' : 'Crea Account')}
            </button>
          </form>

          <button onClick={() => setIsLoginMode(!isLoginMode)} className="mt-6 text-[10px] font-mono text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-wider">
            {isLoginMode ? 'Nuova Recluta? Registrati qui' : 'Hai già gli accessi? Entra'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 p-4 md:p-8 overflow-x-hidden">
      
      {/* HEADER + REATTORE XP CLOUD */}
      <header className={`flex flex-col md:flex-row justify-between items-center gap-6 mb-8 max-w-[1400px] mx-auto px-2 transition-all duration-700 ease-in-out ${isHyperFocus ? 'opacity-10 blur-md pointer-events-none scale-95' : 'opacity-100'}`}>
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest">
            FREEWAY<span className="text-emerald-500 text-4xl leading-none">.</span>LIFE
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            Operatore: <span className="text-emerald-400">{user.email?.split('@')[0]}</span>
          </p>
        </div>

        <div className="flex-1 w-full max-w-md px-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-2 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span>Livello {level}</span>
              <ThemeStore level={level} /> 
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{xp} XP</span>
            </div>
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

      <BrainDump />

    </div>
  );
}