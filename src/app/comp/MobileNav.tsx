'use client'
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Rss, FlaskConical, ArrowLeft, Menu, X } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isCollapsed = !isOpen;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <motion.nav layout className={`pointer-events-auto rounded-full flex items-center justify-center ${isCollapsed ? 'bg-[#FF914D]' : 'glass-panel p-2 bg-black/80'}`}>
        <AnimatePresence mode="popLayout">
          {isCollapsed ? (
            <motion.button key="hamburger" onClick={() => setIsOpen(true)} className="w-14 h-14 flex items-center justify-center text-white"><Menu size={24} /></motion.button>
          ) : (
            <motion.div key="expanded" className="flex items-center gap-1">
              <button onClick={() => router.back()} className="p-4 text-zinc-500"><ArrowLeft size={22} /></button>
              <Link href="/" className="p-4 text-white bg-orange-600 rounded-full"><Home size={22} /></Link>
              <button onClick={() => setIsOpen(false)} className="p-4 text-[#FF914D]"><X size={22} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}