'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Trash2 } from 'lucide-react';

export default function BrainDump() {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [thoughts, setThoughts] = useState<{id: string, text: string}[]>([]);

  // Carica i pensieri salvati
  useEffect(() => {
    const saved = localStorage.getItem('freeway_braindump');
    if (saved) setThoughts(JSON.parse(saved));
  }, []);

  // Salva un nuovo pensiero
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!note.trim()) return;

    const newThought = { id: Date.now().toString(), text: note };
    const updated = [newThought, ...thoughts];
    
    setThoughts(updated);
    localStorage.setItem('freeway_braindump', JSON.stringify(updated));
    setNote('');
  };

  // Elimina un pensiero
  const handleDelete = (id: string) => {
    const updated = thoughts.filter(t => t.id !== id);
    setThoughts(updated);
    localStorage.setItem('freeway_braindump', JSON.stringify(updated));
  };

  return (
    <>
      {/* PULSANTE FLUTTUANTE (Sempre visibile) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[150] p-4 bg-emerald-500 text-black rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 hover:bg-emerald-400 transition-all group"
      >
        <Brain size={24} className="group-hover:animate-pulse" />
      </button>

      {/* MODALE DI VETRO PER SCRIVERE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-8 z-[150] w-[350px] glass-panel rounded-3xl p-6 border-t border-emerald-500/50 shadow-2xl flex flex-col max-h-[60vh]"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Brain size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Svuota Mente</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="relative mb-4 flex-shrink-0">
              <input
                type="text"
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Scrivi qui il pensiero intrusivo..."
                className="w-full bg-black/60 border border-white/10 p-4 pr-12 rounded-xl font-mono text-[10px] text-white outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-hide">
              {thoughts.length === 0 ? (
                <p className="text-[10px] font-mono text-zinc-600 text-center py-4 uppercase tracking-widest">Nessun pensiero in sospeso</p>
              ) : (
                thoughts.map(t => (
                  <motion.div layout key={t.id} className="group flex items-start justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] font-sans text-zinc-300 leading-relaxed">{t.text}</p>
                    <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}