import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

const getRedirectUrl = () => `${window.location.origin}/auth/callback`;

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setAuthError({
          type: 'supabase_not_configured',
          message: 'Supabase non configurato',
        });
        setIsLoadingAuth(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthError({ type: 'session_error', message: error.message });
      } else {
        setSession(data.session);
        setUser(data.session?.user || null);
        setAuthError(null);
      }
      setIsLoadingAuth(false);
    }

    loadSession();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setAuthError(null);
      setIsLoadingAuth(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = useCallback(async (provider) => {
    if (!isSupabaseConfigured) {
      setAuthError({
        type: 'supabase_not_configured',
        message: 'Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      });
      return { error: new Error('Supabase non configurato') };
    }

    setAuthError(null);
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: provider === 'google'
          ? { access_type: 'offline', prompt: 'select_account' }
          : undefined,
      },
    });
  }, []);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return { data: { session: null }, error: new Error('Supabase non configurato') };
    }

    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthError(null);
    }

    return { data, error };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  }, []);

  const updateAccount = useCallback(async (metadata) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase non configurato') };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user?.user_metadata || {}),
        ...metadata,
      },
    });

    if (!error && data.user) {
      setUser(data.user);
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
    }

    return { data, error };
  }, [user?.user_metadata]);

  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: Boolean(session),
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authChecked: !isLoadingAuth,
    authError,
    signInWithProvider,
    refreshSession,
    updateAccount,
    logout,
    checkUserAuth: async () => supabase?.auth.getUser(),
    checkAppState: async () => supabase?.auth.getSession(),
  }), [authError, isLoadingAuth, logout, refreshSession, session, signInWithProvider, updateAccount, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
