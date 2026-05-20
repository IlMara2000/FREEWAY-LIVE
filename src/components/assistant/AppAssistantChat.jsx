import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import AssistantChatSurface from '@/components/assistant/AssistantChatSurface';

export default function AppAssistantChat({ open, onClose, profile, sourceMemo = null }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Chiudi assistente"
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-2xl"
            initial={{ y: 34, opacity: 0, scale: 0.96, rotateX: -7 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ y: 34, opacity: 0, scale: 0.96, rotateX: -7 }}
            transition={{ type: 'spring', stiffness: 280, damping: 27 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/40 text-white/45 transition-colors hover:border-red-300/35 hover:text-red-200"
              aria-label="Chiudi chat"
            >
              <X className="h-5 w-5" />
            </button>
            <AssistantChatSurface
              profile={profile}
              compact
              sourceMemo={sourceMemo}
              initialPrompt={sourceMemo ? `Analizza questo memo e aiutami a programmarlo: ${sourceMemo.title}` : ''}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
