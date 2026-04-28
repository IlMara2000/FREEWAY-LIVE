import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import Login from '@/pages/Login';
import Splash from '@/pages/Splash';
import Dashboard from '@/pages/Dashboard';
import CalendarView from '@/pages/CalendarView';
import TomatoTimer from '@/pages/TomatoTimer';
import Planner from '@/pages/Planner';
import BrainDump from '@/pages/BrainDump';
import ThemeStore from '@/pages/ThemeStore';
import Tutorial from '@/components/tutorial/Tutorial';
import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';

const TUTORIAL_KEY = 'fw_tutorial_done';
const APP_ENTERED_KEY = 'fw_app_entered';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthCallback = location.pathname === '/auth/callback';
  const shouldShowSplash = location.pathname === '/' && sessionStorage.getItem(APP_ENTERED_KEY) !== '1';

  const handleEnter = () => {
    sessionStorage.setItem(APP_ENTERED_KEY, '1');
    const tutorialDone = localStorage.getItem(TUTORIAL_KEY);
    if (!tutorialDone) {
      setShowTutorial(true);
    }
    navigate('/calendar');
  };

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    setShowTutorial(false);
  };

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

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isAuthCallback) {
    return <Navigate to="/calendar" replace />;
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
              <Route path="/braindump" element={<BrainDump />} />
              <Route path="/themes" element={<ThemeStore />} />
              <Route path="/splash" element={<Navigate to="/" replace />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        )}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showTutorial && (
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
