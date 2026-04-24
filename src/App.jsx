import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import Splash from '@/pages/Splash';
import CalendarView from '@/pages/CalendarView';
import TomatoTimer from '@/pages/TomatoTimer';
import Tutorial from '@/components/tutorial/Tutorial';

const TUTORIAL_KEY = 'fw_tutorial_done';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [screen, setScreen] = useState('splash'); // splash | calendar | tomato
  const [taskContext, setTaskContext] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleEnter = () => {
    const tutorialDone = localStorage.getItem(TUTORIAL_KEY);
    if (!tutorialDone) {
      setShowTutorial(true);
    }
    setScreen('calendar');
  };

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    setShowTutorial(false);
  };

  const handleStartTomato = (task) => {
    setTaskContext(task || null);
    setScreen('tomato');
  };

  const handleBackToCalendar = () => {
    setTaskContext(null);
    setScreen('calendar');
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

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div key="splash" className="fixed inset-0">
            <Splash onEnter={handleEnter} />
          </motion.div>
        )}

        {screen === 'calendar' && (
          <motion.div key="calendar"
            initial={{ opacity: 0, scale: 0, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0, rotate: 90 }}
            transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="min-h-screen"
          >
            <CalendarView onStartTomato={handleStartTomato} />
          </motion.div>
        )}

        {screen === 'tomato' && (
          <motion.div key="tomato"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-screen"
          >
            <TomatoTimer taskContext={taskContext} onBack={handleBackToCalendar} />
          </motion.div>
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