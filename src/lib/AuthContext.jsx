import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { queryClientInstance } from '@/lib/query-client';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

const getRedirectUrl = () => `${window.location.origin}/auth/callback`;
const isInlineImage = (value) => typeof value === 'string' && value.startsWith('data:image/');

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const cleanedInlineAvatarFor = useRef(null);
  const activeAccountId = useRef(undefined);

  const setAuthSession = useCallback((nextSession) => {
    const nextAccountId = nextSession?.user?.id || null;
    if (activeAccountId.current !== undefined && activeAccountId.current !== nextAccountId) {
      queryClientInstance.clear();
    }
    activeAccountId.current = nextAccountId;
    setSession(nextSession);
    setUser(nextSession?.user || null);
  }, []);

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
        setAuthSession(data.session);
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
      setAuthSession(nextSession);
      setAuthError(null);
      setIsLoadingAuth(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setAuthSession]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || cleanedInlineAvatarFor.current === user.id) return;

    const metadata = user.user_metadata || {};
    if (!isInlineImage(metadata.avatar_url) && !isInlineImage(metadata.picture)) return;

    cleanedInlineAvatarFor.current = user.id;
    supabase.auth.updateUser({
      data: {
        ...metadata,
        avatar_url: null,
        picture: null,
      },
    });
  }, [user]);

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
      setAuthSession(data.session);
      setAuthError(null);
    }

    return { data, error };
  }, [setAuthSession]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    queryClientInstance.clear();
    activeAccountId.current = null;
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
      setAuthSession(sessionData.session);
    }

    return { data, error };
  }, [setAuthSession, user?.user_metadata]);

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
