import React from 'react';
import { motion } from 'framer-motion';
import DriveBackdrop from '@/components/shared/DriveBackdrop';

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, scale: 0.992, transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] } },
};

export default function PageShell({
  children,
  className = '',
  contentClassName = '',
  maxWidth = 'max-w-6xl',
  tone = 'emerald',
}) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`relative min-h-dvh overflow-x-hidden bg-[#02050c] ${className}`}
    >
      <DriveBackdrop tone={tone} />
      <div aria-hidden="true" className="motion-ambient motion-ambient-one" />
      <div aria-hidden="true" className="motion-ambient motion-ambient-two" />
      <div aria-hidden="true" className="scanline-field" />

      <div className="relative z-20 min-h-dvh w-full px-3.5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.65rem+env(safe-area-inset-top))] sm:px-5 md:px-8 md:pb-12 md:pt-8">
        <div className={`app-content mx-auto w-full ${maxWidth} ${contentClassName}`}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
