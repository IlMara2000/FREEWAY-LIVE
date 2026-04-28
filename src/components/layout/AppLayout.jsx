import React from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { Timer, ListTodo, LayoutDashboard, Palette, Brain, CalendarDays, LogOut, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Hub' },
  { path: '/calendar', icon: CalendarDays, label: 'Cal' },
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
      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6 md:pl-20 overflow-hidden">
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-strong border-t border-border/50">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-primary/12 rounded-xl shadow-[0_0_24px_rgba(16,185,129,0.16)]"
                    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.6 }}
                  />
                )}
                <motion.div
                  className="relative z-10"
                  animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </motion.div>
                <span
                  className={`text-[10px] font-medium relative z-10 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-6 gap-2 glass-strong border-r border-border/50 z-40">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-6 glow-emerald">
          <span className="font-grotesk font-bold text-primary text-sm">FL</span>
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-colors w-16"
            >
              {isActive && (
                <motion.div
                  layoutId="sidenav-indicator"
                  className="absolute inset-0 bg-primary/12 rounded-xl shadow-[0_0_24px_rgba(16,185,129,0.16)]"
                  transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.6 }}
                />
              )}
              <motion.div
                className="relative z-10"
                animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </motion.div>
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={logout}
          className="relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-colors w-16 mt-auto text-muted-foreground hover:text-primary"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Esci</span>
        </button>
      </nav>
    </div>
  );
}
