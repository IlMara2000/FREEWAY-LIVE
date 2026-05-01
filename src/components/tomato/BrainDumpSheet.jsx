import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Brain } from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { useQueryClient } from '@tanstack/react-query';

export default function BrainDumpSheet({ open, onClose }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!text.trim()) return;
    await accountData.tasks.create({
      title: text.trim(),
      is_brain_dump: true,
      status: 'inbox',
      xp_value: 10,
    });
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['braindumps'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-lg glass-panel rounded-b-none p-6 space-y-4"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                <h3 className="font-grotesk font-bold text-white">Brain Dump</h3>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="font-lexend text-xs text-white/45">Scarica il pensiero qui. Poi torna a fare focus.</p>

            <div className="flex gap-2">
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Cosa ti frulla in testa?"
                className="flex-1 bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-4 py-3 font-lexend text-sm text-white outline-none transition-all placeholder:text-white/25"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!text.trim()}
                className="btn-cyber px-4 rounded-xl disabled:opacity-30"
              >
                {saved ? '✓' : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
