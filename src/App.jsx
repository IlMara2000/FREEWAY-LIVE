import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Lazy loaded pages - caricate solo quando servono
const Login = lazy(() => import('@/pages/Login'));
const Splash = lazy(() => import('@/pages/Splash'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CalendarView = lazy(() => import('@/pages/CalendarView'));
const TomatoTimer = lazy(() => import('@/pages/TomatoTimer'));
const Planner = lazy(() => import('@/pages/Planner'));
const BrainDump = lazy(() => import('@/pages/BrainDump'));
const ThemeStore = lazy(() => import('@/pages/ThemeStore'));
const Account = lazy(() => import('@/pages/Account'));
const Alarms = lazy(() => import('@/pages/Alarms'));
const Work = lazy(() => import('@/pages/Work'));
const School = lazy(() => import('@/pages/School'));
const AboutLegal = lazy(() => import('@/pages/AboutLegal'));
const Tutorial = lazy(() => import('@/components/tutorial/Tutorial'));
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const PageNotFound = lazy(() => import('@/lib/PageNotFound'));
const PersonalOnboarding = lazy(() => import('@/components/onboarding/PersonalOnboarding'));
const NotificationConsent = lazy(() => import('@/components/notifications/NotificationConsent'));
const MobileDesktopPrompt = lazy(() => import('@/components/mobile/MobileDesktopPrompt'));

import useUserProfile from '@/hooks/useUserProfile';
import { isInitialOnboardingComplete } from '@/components/onboarding/PersonalOnboarding';
import useAlarmNotifications from '@/hooks/useAlarmNotifications';

// Loading spinner per lazy loading
const PageLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#01030b' }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      className="h-8 w-8 rounded-full border-2 border-white/10 border-t-current text-primary"
    />
  </div>
);

const TUTORIAL_KEY = 'fw_tutorial_done';
const APP_ENTERED_KEY = 'fw_app_entered';
const MOBILE_DESKTOP_PROMPT_KEY = 'fw_mobile_desktop_prompt_seen';

const hasStoredAppEntry = () => {
  try {
    return sessionStorage.getItem(APP_ENTERED_KEY) === '1';
  } catch {
    return false;
  }
};

const storeAppEntry = () => {
  try {
    sessionStorage.setItem(APP_ENTERED_KEY, '1');
  } catch {
    // Some embedded/mobile browser contexts can block storage; the in-memory state still lets the user continue.
  }
};

const isMobileBrowserViewport = () => {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia?.('(max-width: 767px)').matches ?? window.innerWidth < 768;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchCapable = navigator.maxTouchPoints > 0;
  return narrow && (coarsePointer || touchCapable);
};

const hasSeenMobileDesktopPrompt = () => {
  try {
    return sessionStorage.getItem(MOBILE_DESKTOP_PROMPT_KEY) === '1';
  } catch {
    return false;
  }
};

const storeMobileDesktopPromptSeen = () => {
  try {
    sessionStorage.setItem(MOBILE_DESKTOP_PROMPT_KEY, '1');
  } catch {
    // The prompt still auto-closes if storage is unavailable.
  }
};

const AuthCallback = () => {
  const { isAuthenticated, refreshSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finishLogin = async () => {
      if (!isAuthenticated) {
        await refreshSession?.();
      }

      if (!cancelled) {
        storeAppEntry();
        navigate('/', { replace: true });
      }
    };

    finishLogin();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, refreshSession]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: '#01030b' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-white/10 border-t-current text-primary"
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/70">
        accesso in corso
      </p>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const { profile, loading: profileLoading, saveProfile } = useUserProfile();
  const [showTutorial, setShowTutorial] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(hasStoredAppEntry);
  const [showMobileDesktopPrompt, setShowMobileDesktopPrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthCallback = location.pathname === '/auth/callback';
  const urlEntered = new URLSearchParams(location.search).get('entered') === '1';
  const shouldShowSplash = location.pathname === '/' && !hasEnteredApp && !urlEntered;
  const onboardingComplete = isInitialOnboardingComplete(profile);
  const canShowAccountOverlays = Boolean(
    isAuthenticated &&
    !isAuthCallback &&
    !shouldShowSplash &&
    !profileLoading &&
    profile
  );
  const showPersonalOnboarding = canShowAccountOverlays && !onboardingComplete && location.pathname === '/account';
  useAlarmNotifications(Boolean(isAuthenticated));

  const maybeShowMobileDesktopPrompt = () => {
    if (!isMobileBrowserViewport() || hasSeenMobileDesktopPrompt()) return;
    storeMobileDesktopPromptSeen();
    setShowMobileDesktopPrompt(true);
  };

  const handleEnter = () => {
    storeAppEntry();
    setHasEnteredApp(true);
    maybeShowMobileDesktopPrompt();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (!urlEntered) return;
    storeAppEntry();
    setHasEnteredApp(true);
    maybeShowMobileDesktopPrompt();
    navigate('/', { replace: true });
  }, [navigate, urlEntered]);

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    setShowTutorial(false);
  };

  const handleOnboardingComplete = async (profilePatch) => {
    if (!profile || savingOnboarding) return;
    setSavingOnboarding(true);

    try {
      await saveProfile({
        ...profile,
        ...profilePatch,
        initial_onboarding: {
          ...(profile.initial_onboarding || {}),
          ...(profilePatch.initial_onboarding || {}),
          app_preferences: {
            ...((profile.initial_onboarding || {}).app_preferences || {}),
            ...((profilePatch.initial_onboarding || {}).app_preferences || {}),
          },
        },
        day_by_day: {
          ...(profile.day_by_day || {}),
          ...(profilePatch.day_by_day || {}),
          history: profile.day_by_day?.history || {},
        },
      });

      if (!localStorage.getItem(TUTORIAL_KEY)) {
        setShowTutorial(true);
      }
    } finally {
      setSavingOnboarding(false);
    }
  };

  useEffect(() => {
    if (!canShowAccountOverlays) return;
    if (!onboardingComplete) {
      setShowTutorial(false);
      return;
    }
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      setShowTutorial(true);
    }
  }, [canShowAccountOverlays, onboardingComplete]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoading />;
  }

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {shouldShowSplash ? (
          <motion.div
            key="splash"
            className="fixed inset-0"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Splash onEnter={handleEnter} />
          </motion.div>
        ) : !isAuthenticated ? (
          <ErrorBoundary fallbackName="Login">
            <Login />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary fallbackName="AppLayout">
            <Routes location={location}>
              <Route element={<AppLayout />}>
                <Route path="/" element={
                  <ErrorBoundary fallbackName="Dashboard">
                    <Dashboard />
                  </ErrorBoundary>
                } />
                <Route
                  path="/calendar"
                  element={
                    <ErrorBoundary fallbackName="Calendar">
                      <CalendarView
                        onStartTomato={(task) => navigate('/tomato', { state: { taskContext: task || null } })}
                      />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/tomato"
                  element={
                    <ErrorBoundary fallbackName="TomatoTimer">
                      <TomatoTimer
                        taskContext={location.state?.taskContext || null}
                        onBack={() => navigate('/calendar')}
                      />
                    </ErrorBoundary>
                  }
                />
                <Route path="/planner" element={
                  <ErrorBoundary fallbackName="Planner"><Planner /></ErrorBoundary>
                } />
                <Route path="/school" element={
                  <ErrorBoundary fallbackName="School"><School /></ErrorBoundary>
                } />
                <Route path="/work" element={
                  <ErrorBoundary fallbackName="Work"><Work /></ErrorBoundary>
                } />
                <Route path="/braindump" element={
                  <ErrorBoundary fallbackName="BrainDump"><BrainDump /></ErrorBoundary>
                } />
                <Route path="/themes" element={
                  <ErrorBoundary fallbackName="ThemeStore"><ThemeStore /></ErrorBoundary>
                } />
                <Route path="/alarms" element={
                  <ErrorBoundary fallbackName="Alarms"><Alarms /></ErrorBoundary>
                } />
                <Route path="/account" element={
                  <ErrorBoundary fallbackName="Account"><Account /></ErrorBoundary>
                } />
                <Route path="/about" element={
                  <ErrorBoundary fallbackName="AboutLegal"><AboutLegal /></ErrorBoundary>
                } />
                <Route path="/splash" element={<Navigate to="/" replace />} />
                <Route path="*" element={
                  <ErrorBoundary fallbackName="PageNotFound"><PageNotFound /></ErrorBoundary>
                } />
              </Route>
            </Routes>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showPersonalOnboarding && (
          <ErrorBoundary fallbackName="PersonalOnboarding">
            <PersonalOnboarding
              saving={savingOnboarding}
              onComplete={handleOnboardingComplete}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileDesktopPrompt && (
          <MobileDesktopPrompt onDone={() => setShowMobileDesktopPrompt(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && !showPersonalOnboarding && (
          <ErrorBoundary fallbackName="Tutorial">
            <Tutorial onComplete={handleTutorialComplete} />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {canShowAccountOverlays && !showPersonalOnboarding && <NotificationConsent />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Suspense fallback={<PageLoading />}>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
