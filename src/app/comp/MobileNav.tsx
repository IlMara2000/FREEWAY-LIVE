'use client'
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Menu, X } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNav() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <motion.nav 
        layout 
        // Aggiunta la "molla" per un effetto di ridimensionamento fluido e organico
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`pointer-events-auto rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md overflow-hidden ${
          !isOpen ? 'bg-[#FF914D]' : 'glass-panel p-1.5 bg-black/80 border border-white/10'
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isOpen ? (
            // STATO CHIUSO (HAMBURGER)
            <motion.button 
              key="hamburger" 
              onClick={() => setIsOpen(true)}
              // Animazione di rotazione e comparsa
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="w-14 h-14 flex items-center justify-center text-black hover:scale-110 transition-transform"
            >
              <Menu size={24} />
            </motion.button>
          ) : (
            // STATO APERTO (MENU ESTESO)
            <motion.div 
              key="expanded" 
              // Animazione di espansione morbida
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 px-2"
            >
              {/* Tasto Indietro */}
              <button 
                onClick={() => router.back()} 
                className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <ArrowLeft size={22} />
              </button>

              {/* Tasto Home */}
              <Link 
                href="/" 
                onClick={() => setIsOpen(false)} 
                className="p-3 text-black bg-[#FF914D] hover:bg-white hover:scale-105 rounded-full transition-all shadow-lg shadow-[#FF914D]/20"
              >
                <Home size={22} />
              </Link>

              {/* Tasto Chiudi */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-3 text-[#FF914D] hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X size={22} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}