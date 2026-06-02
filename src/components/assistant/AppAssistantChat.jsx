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
          className="fixed inset-0 z-[90] flex items-end justify-center px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:items-center sm:p-6"
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
            className={`relative z-10 w-full overflow-hidden rounded-[1.4rem] transition-[max-width,height,max-height] duration-300 ${
              expanded
                ? 'h-[calc(100dvh_-_5.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] max-w-6xl sm:h-[min(92dvh,860px)]'
                : 'h-[min(74dvh,42rem)] max-w-2xl sm:h-auto sm:max-h-[min(86dvh,48rem)]'
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
              className="absolute right-12 top-2.5 z-20 hidden h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/55 text-white/55 transition-colors hover:border-emerald-300/35 hover:text-emerald-100 sm:grid"
              aria-label={expanded ? 'Riduci chat' : 'Ingrandisci chat'}
              title={expanded ? 'Riduci chat' : 'Ingrandisci chat'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/55 text-white/55 transition-colors hover:border-red-300/35 hover:text-red-200 sm:right-3 sm:top-3 sm:h-10 sm:w-10"
              aria-label="Chiudi chat"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
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
