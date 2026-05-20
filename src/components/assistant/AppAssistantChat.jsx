import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2, X } from 'lucide-react';
import AssistantChatSurface from '@/components/assistant/AssistantChatSurface';

export default function AppAssistantChat({ open, onClose, profile, sourceMemo = null }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-2 sm:items-center sm:p-6"
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
            className={`relative z-10 w-full transition-[max-width] duration-300 ${
              expanded
                ? 'h-[calc(100dvh_-_1rem)] max-w-6xl sm:h-[min(92dvh,860px)]'
                : 'max-w-2xl'
            }`}
            initial={{ y: 34, opacity: 0, scale: 0.96, rotateX: -7 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ y: 34, opacity: 0, scale: 0.96, rotateX: -7 }}
            transition={{ type: 'spring', stiffness: 280, damping: 27 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="absolute right-14 top-3 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/40 text-white/45 transition-colors hover:border-emerald-300/35 hover:text-emerald-100"
              aria-label={expanded ? 'Riduci chat' : 'Ingrandisci chat'}
              title={expanded ? 'Riduci chat' : 'Ingrandisci chat'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
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
              compact={!expanded}
              expanded={expanded}
              className={expanded ? 'h-full' : ''}
              sourceMemo={sourceMemo}
              initialPrompt={sourceMemo ? `Analizza questo memo e aiutami a programmarlo: ${sourceMemo.title}` : ''}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
