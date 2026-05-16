import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import Login from '@/pages/Login';
import Splash from '@/pages/Splash';
import Dashboard from '@/pages/Dashboard';
import CalendarView from '@/pages/CalendarView';
import TomatoTimer from '@/pages/TomatoTimer';
import Planner from '@/pages/Planner';
import BrainDump from '@/pages/BrainDump';
import ThemeStore from '@/pages/ThemeStore';
import Account from '@/pages/Account';
import Work from '@/pages/Work';
import Tutorial from '@/components/tutorial/Tutorial';
import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';
import useUserProfile from '@/hooks/useUserProfile';
import PersonalOnboarding, { isInitialOnboardingComplete } from '@/components/onboarding/PersonalOnboarding';

const TUTORIAL_KEY = 'fw_tutorial_done';
const APP_ENTERED_KEY = 'fw_app_entered';

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
        navigate('/calendar', { replace: true });
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
        className="w-8 h-8 rounded-full border-2 border-white/10 border-t-emerald-400"
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-400/70">
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
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthCallback = location.pathname === '/auth/callback';
  const shouldShowSplash = location.pathname === '/' && !hasEnteredApp;
  const onboardingComplete = isInitialOnboardingComplete(profile);
  const canShowAccountOverlays = Boolean(
    isAuthenticated &&
    !isAuthCallback &&
    !shouldShowSplash &&
    !profileLoading &&
    profile
  );
  const showPersonalOnboarding = canShowAccountOverlays && !onboardingComplete;

  const handleEnter = () => {
    storeAppEntry();
    setHasEnteredApp(true);
    if (isAuthenticated) {
      navigate('/calendar');
    }
  };

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
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#01030b' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-white/10 border-t-emerald-400"
        />
      </div>
    );
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
          <Login />
        ) : (
          <Routes location={location}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/calendar"
                element={
                  <CalendarView
                    onStartTomato={(task) => navigate('/tomato', { state: { taskContext: task || null } })}
                  />
                }
              />
              <Route
                path="/tomato"
                element={
                  <TomatoTimer
                    taskContext={location.state?.taskContext || null}
                    onBack={() => navigate('/calendar')}
                  />
                }
              />
              <Route path="/planner" element={<Planner />} />
              <Route path="/work" element={<Work />} />
              <Route path="/braindump" element={<BrainDump />} />
              <Route path="/themes" element={<ThemeStore />} />
              <Route path="/account" element={<Account />} />
              <Route path="/splash" element={<Navigate to="/" replace />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        )}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showPersonalOnboarding && (
          <PersonalOnboarding
            saving={savingOnboarding}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && !showPersonalOnboarding && (
          <Tutorial onComplete={handleTutorialComplete} />
        )}
      </AnimatePresence>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
