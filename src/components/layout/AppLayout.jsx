import React from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { Timer, ListTodo, LayoutDashboard, Palette, Brain, CalendarDays, LogOut, UserRound, BriefcaseBusiness } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Hub' },
  { path: '/calendar', icon: CalendarDays, label: 'Cal' },
  { path: '/work', icon: BriefcaseBusiness, label: 'Lavoro' },
  { path: '/tomato', icon: Timer, label: 'Tomato' },
  { path: '/planner', icon: ListTodo, label: 'Planner' },
  { path: '/braindump', icon: Brain, label: 'Dump' },
  { path: '/themes', icon: Palette, label: 'Temi' },
  { path: '/account', icon: UserRound, label: 'Me' },
];

const contentVariants = {
  initial: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, scale: 0.992, filter: 'blur(8px)' },
};

const contentTransition = {
  duration: 0.38,
  ease: [0.22, 1, 0.36, 1],
};

export default function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed left-3 right-3 top-3 z-40 md:left-6 md:right-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-2xl border border-white/10 bg-black/55 px-3 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <Link
            to="/"
            className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-primary/12 px-3 font-grotesk text-sm font-black tracking-[0.08em] text-primary glow-emerald"
            aria-label="Freeway Life"
          >
            FWL
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="topnav-indicator"
                      className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/12 shadow-[0_0_28px_rgba(16,185,129,0.14)]"
                      transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.6 }}
                    />
                  )}
                  <item.icon className="relative z-10 h-[18px] w-[18px]" />
                  <span className="relative z-10 hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden pb-6 pt-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={contentTransition}
            className="min-h-screen"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
