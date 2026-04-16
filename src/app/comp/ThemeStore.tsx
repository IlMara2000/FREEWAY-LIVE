'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Lock, X, Check } from 'lucide-react';

const THEMES = [
  { id: 'emerald', name: 'Smeraldo', levelRequired: 1, colorBg: 'bg-emerald-500', desc: 'Focus puro. Tema base.' },
  { id: 'ruby', name: 'Rubino', levelRequired: 2, colorBg: 'bg-red-500', desc: 'Energia e urgenza. Sblocco al Lvl 2.' },
  { id: 'amethyst', name: 'Ametista', levelRequired: 4, colorBg: 'bg-purple-500', desc: 'Flusso profondo. Sblocco al Lvl 4.' },
];

export default function ThemeStore({ level }: { level: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('emerald');

  // Carica il tema salvato all'avvio
  useEffect(() => {
    const saved = localStorage.getItem('freeway_theme') || 'emerald';
    setActiveTheme(saved);
    document.body.setAttribute('data-theme', saved);
  }, []);

  const handleSelectTheme = (themeId: string, reqLvl: number) => {
    if (level < reqLvl) return; // Bloccato!
    
    setActiveTheme(themeId);
    localStorage.setItem('freeway_theme', themeId);
    document.body.setAttribute('data-theme', themeId);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-emerald-400 hover:text-white transition-colors group cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded-md"
        title="Apri l'Armeria Temi"
      >
        <Gem size={12} className="group-hover:animate-pulse" />
        <span className="text-[9px]">Sblocca Temi</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel w-full max-w-md rounded-3xl p-6 border-t border-white/20 shadow-2xl relative"
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Gem size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-widest text-white">Armeria Core</h2>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase">Livello attuale: <span className="text-emerald-400 font-bold">{level}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                {THEMES.map((t) => {
                  const isLocked = level < t.levelRequired;
                  const isActive = activeTheme === t.id;

                  return (
                    <div 
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id, t.levelRequired)}
                      className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isLocked ? 'border-white/5 opacity-50 grayscale cursor-not-allowed' : 
                        isActive ? 'border-white/40 bg-white/10 shadow-lg cursor-default' : 
                        'border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full shadow-[0_0_10px_currentColor] ${t.colorBg}`} />
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t.name}</h3>
                          <p className="text-[9px] font-mono text-zinc-400">{t.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isLocked ? (
                          <div className="flex items-center gap-1 text-zinc-500 bg-black/40 px-2 py-1 rounded-md">
                            <Lock size={12} /> <span className="text-[9px] font-bold">LVL {t.levelRequired}</span>
                          </div>
                        ) : isActive ? (
                          <div className="text-emerald-400 bg-emerald-500/20 p-1.5 rounded-full">
                            <Check size={14} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}