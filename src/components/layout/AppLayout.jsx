import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { Timer, ListTodo, MessageCircle, Palette, Brain, CalendarDays, LogOut, AlarmClock, BriefcaseBusiness, Menu, Settings, X, LayoutDashboard, BookOpen, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import FreewayLogo from '@/components/brand/FreewayLogo';
import useUserProfile from '@/hooks/useUserProfile';
import { applyThemeToDocument, CUSTOM_THEME_KEY, readStoredActiveThemeId, THEMES } from '@/lib/themes';
import {
  applyProfilePreferencesToClient,
  buildProfileWithAppPreferences,
  collectLegacyPreferencePatch,
  getAppPreferences,
} from '@/lib/app-preferences';
import { migrateLocalDataToAccount } from '@/lib/databaseClient';

const AppAssistantChat = lazy(() => import('@/components/assistant/AppAssistantChat'));

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { action: 'assistant', icon: MessageCircle, label: 'FreeW.A.I.' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendario' },
  { path: '/planner', icon: ListTodo, label: 'Piano' },
  { path: '/tomato', icon: Timer, label: 'Timer' },
  { path: '/braindump', icon: Brain, label: 'Sfogo' },
  { path: '/school', icon: BookOpen, label: 'Scuola' },
  { path: '/work', icon: BriefcaseBusiness, label: 'Lavoro' },
  { path: '/alarms', icon: AlarmClock, label: 'Sveglie' },
  { path: '/themes', icon: Palette, label: 'Temi' },
];

const MOBILE_NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/planner', icon: ListTodo, label: 'Piano' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendario' },
  { path: '/tomato', icon: Timer, label: 'Timer' },
  { action: 'menu', icon: MoreHorizontal, label: 'Menu' },
];

const isRouteActive = (pathname, path) => {
  if (!path) return false;
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
};

const contentVariants = {
  initial: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, scale: 0.992, filter: 'blur(8px)' },
};

const contentTransition = {
  duration: 0.38,
  ease: [0.22, 1, 0.36, 1],
};

const drawerVariants = {
  closed: { x: '-104%', opacity: 0.6, filter: 'blur(8px)' },
  open: { x: 0, opacity: 1, filter: 'blur(0px)' },
};

function MobileBottomNavigation({ pathname, menuOpen, onOpenMenu }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] md:hidden"
      aria-label="Navigazione principale mobile"
    >
      <div className="mx-auto grid max-w-[430px] grid-cols-5 gap-1 rounded-[1.55rem] border border-primary/18 bg-[#02050c]/88 p-1.5 shadow-[0_20px_70px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
        {MOBILE_NAV_ITEMS.map((item) => {
          const ItemIcon = item.icon;
          const active = item.action === 'menu' ? menuOpen : isRouteActive(pathname, item.path);
          const className = `group relative flex min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 text-[10px] font-semibold transition-all ${
            active
              ? 'bg-primary/14 text-primary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]'
              : 'text-white/48 hover:bg-white/[0.045] hover:text-white/80'
          }`;

          const content = (
            <>
              <ItemIcon className={`h-5 w-5 transition-transform ${active ? '-translate-y-0.5' : 'group-hover:-translate-y-0.5'}`} />
              <span className="leading-none">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute left-1/2 top-1 h-1 w-4 -translate-x-1/2 rounded-full bg-primary/80 shadow-[0_0_18px_rgba(16,185,129,0.55)]"
                />
              )}
            </>
          );

          if (item.action === 'menu') {
            return (
              <button
                key={item.action}
                type="button"
                onClick={onOpenMenu}
                className={className}
                aria-label="Apri menu completo"
                aria-expanded={menuOpen}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={className}
              aria-current={active ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const { logout, user } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const migrationInFlightRef = useRef(false);
  const hasProfile = Boolean(profile);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const activeThemeId = profile?.active_theme || readStoredActiveThemeId();
    const theme = THEMES[activeThemeId] || THEMES.emerald;
    const preferences = applyProfilePreferencesToClient(profile, user?.id);
    const applyCurrentTheme = () => applyThemeToDocument(theme, getAppPreferences(profile).themeCustomization || preferences.themeCustomization);

    applyCurrentTheme();

    const handleStorage = (event) => {
      if (!event.key || event.key === CUSTOM_THEME_KEY) {
        applyCurrentTheme();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [profile, user?.id]);

  useEffect(() => {
    if (!profile || !saveProfile) return;

    const localThemeId = readStoredActiveThemeId();
    const legacyPatch = collectLegacyPreferencePatch(profile, user?.id);
    const shouldSyncThemeId = localThemeId && localThemeId !== 'emerald' && localThemeId !== profile.active_theme;

    if (!shouldSyncThemeId && Object.keys(legacyPatch).length === 0) return;

    const nextProfile = buildProfileWithAppPreferences(
      shouldSyncThemeId ? { ...profile, active_theme: localThemeId } : profile,
      legacyPatch,
    );

    saveProfile(nextProfile).catch((error) => {
      console.warn('Preference sync unavailable:', error);
    });
  }, [profile, saveProfile, user?.id]);

  const runAccountMigration = useCallback(async () => {
    if (!user?.id || !hasProfile || migrationInFlightRef.current) return;

    migrationInFlightRef.current = true;
    try {
      await migrateLocalDataToAccount();
    } catch (error) {
      console.warn('Local account migration unavailable:', error);
    } finally {
      migrationInFlightRef.current = false;
    }
  }, [hasProfile, user?.id]);

  useEffect(() => {
    runAccountMigration();
  }, [hasProfile, profile?.id, runAccountMigration, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const handleOnline = () => {
      runAccountMigration();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [runAccountMigration, user?.id]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <motion.button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className={`fixed left-[calc(0.85rem+env(safe-area-inset-left))] top-[calc(0.85rem+env(safe-area-inset-top))] z-[80] grid h-11 w-11 place-items-center overflow-hidden rounded-[1rem] border backdrop-blur-xl transition-colors sm:left-[calc(1rem+env(safe-area-inset-left))] sm:top-[calc(1rem+env(safe-area-inset-top))] sm:h-14 sm:w-14 ${
          menuOpen
            ? 'border-red-200/45 bg-red-500/90 text-white shadow-[0_14px_34px_rgba(239,68,68,0.24)]'
            : 'border-primary/20 bg-[#02050c]/78 text-primary shadow-[0_14px_32px_rgba(0,0,0,0.42)] hover:border-primary/42 hover:bg-primary/10'
        }`}
        aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
        animate={{
          rotateX: menuOpen ? [0, -9, 0] : 0,
          rotateY: menuOpen ? [0, 9, 0] : 0,
          scale: menuOpen ? [1, 1.04, 1] : 1,
        }}
        whileTap={{ scale: 0.92 }}
        transition={menuOpen ? { duration: 1.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.28 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.span
          className={`absolute inset-1 rounded-[0.85rem] border ${
            menuOpen ? 'border-white/25 bg-white/10' : 'border-primary/10 bg-white/[0.035]'
          }`}
          animate={{ rotate: menuOpen ? 360 : 0 }}
          transition={menuOpen ? { duration: 5, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
        />
        <span
          className={`absolute -inset-4 rounded-full ${menuOpen ? 'bg-red-200/12' : 'bg-primary/10'} blur-lg`}
        />
        <motion.span
          className="relative z-10"
          animate={{ rotateZ: menuOpen ? [0, 90, 0] : 0 }}
          transition={menuOpen ? { duration: 1.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Chiudi menu"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />

            <motion.aside
              className="fixed left-0 top-0 z-50 flex h-dvh w-[min(92vw,380px)] flex-col overflow-y-auto overscroll-contain border-r border-primary/20 bg-[#030806]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-[35px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              variants={drawerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.75 }}
            >
              <div className="flex items-center justify-between gap-3 pb-6 pl-20">
                <Link
                  to="/about"
                  onClick={closeMenu}
                  className="group flex h-14 items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-2.5 pr-4 glow-emerald transition-colors hover:border-cyan-200/35 hover:bg-primary/15"
                >
                  <FreewayLogo showWordmark />
                </Link>
                <Link
                  to="/account"
                  onClick={closeMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors hover:border-primary/45 hover:bg-primary/15 hover:text-primary"
                  aria-label="Impostazioni profilo"
                  title="Profilo"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </div>

              <nav className="space-y-2">
                {NAV_ITEMS.map((item, index) => {
                  const isActive = item.path && isRouteActive(location.pathname, item.path);
                  const itemKey = item.path || item.action;
                  const ItemIcon = item.icon;
                  const commonClassName = `relative flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    isActive
                      ? 'border-primary/35 bg-primary/12 text-primary shadow-[0_0_30px_rgba(16,185,129,0.12)]'
                      : 'border-white/8 bg-white/[0.035] text-white/62 hover:border-primary/25 hover:text-white'
                  }`;

                  return (
                    <motion.div
                      key={itemKey}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + index * 0.035, duration: 0.22 }}
                    >
                      {item.action === 'assistant' ? (
                        <button
                          type="button"
                          onClick={() => {
                            closeMenu();
                            setAssistantOpen(true);
                          }}
                          className={commonClassName}
                        >
                          <ItemIcon className="h-5 w-5 shrink-0" />
                          <span className="font-grotesk text-base font-semibold">{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          onClick={closeMenu}
                          className={commonClassName}
                        >
                          <ItemIcon className="h-5 w-5 shrink-0" />
                          <span className="font-grotesk text-base font-semibold">{item.label}</span>
                          {isActive && (
                            <motion.span
                              layoutId="drawer-active-dot"
                              className="ml-auto h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(16,185,129,0.7)]"
                            />
                          )}
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/45">
                  Freeway Life
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] text-sm font-semibold text-white/60 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <LogOut className="h-4 w-4" />
                  Esci
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {assistantOpen && (
        <Suspense fallback={null}>
          <AppAssistantChat
            open={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            profile={profile}
          />
        </Suspense>
      )}

      {!menuOpen && (
        <MobileBottomNavigation
          pathname={location.pathname}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
        />
      )}

      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={contentTransition}
            className="min-h-dvh"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
