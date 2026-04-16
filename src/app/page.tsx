'use client'
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; 
import Tomato from './Tomato';
import CalendarWidget from './Calendar';
import Planner from './comp/Planner';
import MobileNav from './comp/MobileNav';
import BrainDump from './comp/BrainDump'; 
import ThemeStore from './comp/ThemeStore';
import { motion, AnimatePresence } from 'framer-motion';
// Importazione tipi per blindare il build su Vercel
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); 
  
  const [isHyperFocus, setIsHyperFocus] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const loadUserData = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', userId)
          .single();

        if (data && !error) {
          const cloudXp = data.xp || 0;
          setXp(cloudXp);
          setLevel(Math.floor(cloudXp / 100) + 1);
        }
      } catch (e) {
        console.error("Recupero dati fallito:", e);
      }
    };

    // 1. Inizializzazione Sessione (Tipizzata per Vercel)
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;
      if (currentUser) loadUserData(currentUser.id);
      setAuthChecking(false);
    });

    // 2. Listener Cambiamenti Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;
      if (currentUser) loadUserData(currentUser.id);
    });

    // 3. Gestore Globale XP
    const handleAddXp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const points = customEvent.detail || 0;
      
      setXp(prev => {
        const newXp = prev + points;
        setLevel(Math.floor(newXp / 100) + 1);
        
        if (userRef.current) {
          supabase.from('profiles')
            .update({ xp: newXp })
            .eq('id', userRef.current.id)
            .then();
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
    if (!email || !password) return alert("Inserisci credenziali!");
    
    setAuthLoading(true);
    try {
      const { error } = isLoginMode 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      
      if (error) throw error;
      if (!isLoginMode) alert("Controlla l'email per confermare l'accesso.");
    } catch (err: any) {
      alert(`ERRORE: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const xpInCurrentLevel = xp % 100;

  if (authChecking) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="font-mono text-xs text-emerald-500 animate-pulse tracking-[0.4em]">INIT_CORE_SYSTEM...</div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#01030b]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 rounded-[2.5rem] w-full max-w-md text-center">
          <h1 className="text-4xl font-display font-black text-white tracking-tighter mb-2 uppercase">
            Freeway<span className="text-emerald-500">.</span>life
          </h1>
          <p className="font-mono text-[9px] text-emerald-400/60 mb-8 uppercase tracking-[0.3em]">Protocollo di Accesso</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-xs text-white outline-none focus:border-emerald-500/50 transition-all text-center"
            />
            <input 
              type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-xs text-white outline-none focus:border-emerald-500/50 transition-all text-center"
            />
            <button disabled={authLoading} className="btn-emerald-loading w-full py-4 rounded-2xl font-display font-black uppercase text-sm">
              {authLoading ? 'SINCRO...' : (isLoginMode ? 'INIZIALIZZA' : 'REGISTRATI')}
            </button>
          </form>

          <button onClick={() => setIsLoginMode(!isLoginMode)} className="mt-6 font-mono text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-wider">
            {isLoginMode ? 'Crea nuovo ID Operatore' : 'Torna al Login'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 p-4 md:p-8 overflow-x-hidden bg-[#01030b]">
      
      <header className={`max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6 transition-all duration-700 ${isHyperFocus ? 'opacity-10 blur-xl scale-95' : 'opacity-100'}`}>
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl font-display font-black text-white tracking-tighter">FREEWAY<span className="text-emerald-500">.</span>LIFE</h1>
          <p className="font-mono text-[10px] text-emerald-500/80 uppercase mt-1">OPERATORE: <span className="text-zinc-400">{user.email?.split('@')[0]}</span></p>
        </div>

        <div className="flex-1 w-full max-w-md px-4">
          <div className="flex justify-between items-center font-mono text-[10px] text-zinc-400 mb-2 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span>LVL <span className="text-white">{level}</span></span>
              <ThemeStore level={level} /> 
            </div>
            <span className="text-emerald-400 font-bold">{xp} XP</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div 
              className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${xpInCurrentLevel}%` }}
              transition={{ duration: 1, type: "spring" }}
            />
          </div>
        </div>

        <button onClick={() => supabase.auth.signOut()} className="font-mono text-[10px] text-zinc-500 hover:text-red-400 transition-colors tracking-widest uppercase">Logout</button>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <div className="md:col-span-1 z-10">
          <Tomato onFocusChange={setIsHyperFocus} />
          <AnimatePresence>
            {!isHyperFocus && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <CalendarWidget />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className={`md:col-span-2 transition-all duration-700 ${isHyperFocus ? 'opacity-5 blur-3xl scale-95' : 'opacity-100'}`}>
          <Planner />
        </div>
      </main>

      {!isHyperFocus && <MobileNav />}
      <BrainDump />
    </div>
  );
}