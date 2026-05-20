import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Brain } from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { useQueryClient } from '@tanstack/react-query';
import { buildBrainDumpPayload, invalidateTaskViews } from '@/lib/task-workflows';

export default function BrainDumpSheet({ open, onClose }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError('');

    try {
      await accountData.tasks.create(buildBrainDumpPayload(text, 'Memo rapido nato dal Tomato. Puoi riprenderlo nel calendario o nel Brain Dump.'));
      invalidateTaskViews(queryClient);
      setText('');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch (sendError) {
      setError(sendError?.message || 'Non riesco a salvare il brain dump.');
    } finally {
      setSaving(false);
    }
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
            <p className="font-lexend text-xs text-white/45">Scarica il pensiero qui. Finisce come MEMO sotto calendario.</p>

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
                disabled={!text.trim() || saving}
                className="btn-cyber px-4 rounded-xl disabled:opacity-30"
              >
                {saved ? '✓' : saving ? '...' : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 font-mono text-[11px] text-red-200">
                {error}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
