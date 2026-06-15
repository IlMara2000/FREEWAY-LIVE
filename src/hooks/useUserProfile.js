import { useState, useEffect, useCallback, useRef } from 'react';
import { ACCOUNT_DATA_CHANGED_EVENT, accountData } from '@/api/accountDataClient';
import { useAuth } from '@/lib/AuthContext';
import { normalizeList } from '@/lib/normalize-list';
import { applyThemeToDocument, getThemeIdsForLevel, MAX_THEME_LEVEL, THEMES, writeStoredActiveThemeId, readCustomTheme } from '@/lib/themes';
import { getAppPreferences } from '@/lib/app-preferences';

// XP thresholds per level
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
const XP_PER_LEVEL_AFTER_TABLE = 2000;
const createDefaultProfile = () => ({
  total_xp: 0,
  level: 1,
  active_theme: 'emerald',
  unlocked_themes: ['emerald'],
  total_focus_minutes: 0,
  total_tasks_completed: 0,
  streak_days: 0,
  last_active_date: new Date().toISOString().split('T')[0],
});

const mergeProfilePayload = (baseProfile, nextProfile) => {
  const base = baseProfile || createDefaultProfile();
  const next = nextProfile || {};

  return {
    ...base,
    ...next,
    day_by_day: {
      ...(base.day_by_day || {}),
      ...(next.day_by_day || {}),
    },
    freeway_os: {
      ...(base.freeway_os || {}),
      ...(next.freeway_os || {}),
    },
    initial_onboarding: {
      ...(base.initial_onboarding || {}),
      ...(next.initial_onboarding || {}),
      app_preferences: {
        ...((base.initial_onboarding || {}).app_preferences || {}),
        ...((next.initial_onboarding || {}).app_preferences || {}),
      },
    },
  };
};

export function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      if (i === LEVEL_THRESHOLDS.length - 1) {
        const extraXP = xp - LEVEL_THRESHOLDS[i];
        return i + 1 + Math.floor(extraXP / XP_PER_LEVEL_AFTER_TABLE);
      }
      return i + 1;
    }
  }
  return 1;
}

export function getMinimumXPForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const maxTableLevel = LEVEL_THRESHOLDS.length;

  if (safeLevel <= maxTableLevel) {
    return LEVEL_THRESHOLDS[safeLevel - 1];
  }

  return LEVEL_THRESHOLDS[maxTableLevel - 1] + (safeLevel - maxTableLevel) * XP_PER_LEVEL_AFTER_TABLE;
}

export function getXPForCurrentLevel(xp) {
  const level = getLevelFromXP(xp);
  const maxTableLevel = LEVEL_THRESHOLDS.length;
  const currentThreshold = level <= maxTableLevel
    ? LEVEL_THRESHOLDS[level - 1]
    : LEVEL_THRESHOLDS[maxTableLevel - 1] + (level - maxTableLevel) * XP_PER_LEVEL_AFTER_TABLE;
  const nextThreshold = level < maxTableLevel
    ? LEVEL_THRESHOLDS[level]
    : currentThreshold + XP_PER_LEVEL_AFTER_TABLE;

  return {
    current: xp - currentThreshold,
    needed: nextThreshold - currentThreshold,
    percentage: ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
  };
}

export function getThemeForLevel(level) {
  return getThemeIdsForLevel(level);
}

export default function useUserProfile() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef(null);
  const accountId = user?.id || user?.email || 'guest';

  const normalizeProfile = useCallback((nextProfile) => {
    const merged = {
      ...createDefaultProfile(),
      ...(nextProfile || {}),
    };
    const totalXP = Math.max(0, Number(merged.total_xp) || 0);
    const derivedLevel = getLevelFromXP(totalXP);
    const normalizedLevel = Math.max(1, Number(merged.level) || derivedLevel, derivedLevel);

    return {
      ...merged,
      total_xp: totalXP,
      level: normalizedLevel,
      unlocked_themes: Array.from(new Set([
        ...(Array.isArray(merged.unlocked_themes) ? merged.unlocked_themes : []),
        ...getThemeIdsForLevel(normalizedLevel),
        'emerald',
      ])),
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    if (!isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const profiles = normalizeList(await accountData.userProfiles.list());
      if (profiles.length > 0) {
        const nextProfile = normalizeProfile(profiles[0]);
        const nextPreferences = getAppPreferences(nextProfile);
        setProfile(nextProfile);
        writeStoredActiveThemeId(nextProfile.active_theme || 'emerald');
        applyThemeToDocument(
          THEMES[nextProfile.active_theme] || THEMES.emerald,
          nextPreferences.themeCustomization || readCustomTheme(),
        );
        return nextProfile;
      }

      const newProfile = normalizeProfile(await accountData.userProfiles.create(createDefaultProfile()));
      const newPreferences = getAppPreferences(newProfile);
      setProfile(newProfile);
      writeStoredActiveThemeId(newProfile.active_theme || 'emerald');
      applyThemeToDocument(
        THEMES[newProfile.active_theme] || THEMES.emerald,
        newPreferences.themeCustomization || readCustomTheme(),
      );
      return newProfile;
    } catch (error) {
      console.warn('User profile unavailable:', error);
      const fallbackProfile = normalizeProfile(profileRef.current);
      setProfile(fallbackProfile);
      return fallbackProfile;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, normalizeProfile]);

  useEffect(() => {
    loadProfile();
  }, [accountId, loadProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleAccountDataChanged = (event) => {
      const detail = event.detail || {};
      if (detail.entityName === 'UserProfile') {
        loadProfile({ silent: true });
      }
    };

    window.addEventListener(ACCOUNT_DATA_CHANGED_EVENT, handleAccountDataChanged);
    return () => window.removeEventListener(ACCOUNT_DATA_CHANGED_EVENT, handleAccountDataChanged);
  }, [accountId, loadProfile]);

  const getLatestProfile = useCallback(async () => {
    const profiles = normalizeList(await accountData.userProfiles.list());
    if (profiles.length > 0) return normalizeProfile(profiles[0]);
    return normalizeProfile(await accountData.userProfiles.create(createDefaultProfile()));
  }, [normalizeProfile]);

  const saveProfile = useCallback(async (nextProfile) => {
    const latestProfile = profileRef.current?.id
      ? await getLatestProfile().catch(() => profileRef.current)
      : profileRef.current;
    const mergedProfile = mergeProfilePayload(latestProfile, nextProfile);
    const normalized = normalizeProfile(mergedProfile);
    const nextPreferences = getAppPreferences(normalized);
    setProfile(normalized);
    writeStoredActiveThemeId(normalized.active_theme || 'emerald');
    applyThemeToDocument(
      THEMES[normalized.active_theme] || THEMES.emerald,
      nextPreferences.themeCustomization || readCustomTheme(),
    );

    try {
      const saved = normalized.id
        ? await accountData.userProfiles.update(normalized.id, normalized)
        : await accountData.userProfiles.create(normalized);
      const savedProfile = normalizeProfile(saved);
      setProfile(savedProfile);
      return savedProfile;
    } catch (error) {
      console.warn('Profile sync unavailable:', error);
      return normalized;
    }
  }, [normalizeProfile]);

  const addXP = useCallback(async (amount) => {
    const latestProfile = await getLatestProfile();
    if (!latestProfile) return undefined;

    const newXP = (latestProfile.total_xp || 0) + amount;
    const newLevel = getLevelFromXP(newXP);
    const unlockedThemes = getThemeForLevel(newLevel);
    const leveledUp = newLevel > (latestProfile.level || 1);

    const nextProfile = {
      ...latestProfile,
      total_xp: newXP,
      level: newLevel,
      unlocked_themes: unlockedThemes,
      last_active_date: new Date().toISOString().split('T')[0],
    };

    await saveProfile(nextProfile);
    return { leveledUp, newLevel };
  }, [getLatestProfile, saveProfile]);

  const addFocusMinutes = useCallback(async (minutes) => {
    const latestProfile = await getLatestProfile();
    if (!latestProfile) return undefined;

    const nextProfile = {
      ...latestProfile,
      total_focus_minutes: (latestProfile.total_focus_minutes || 0) + minutes,
    };
    await saveProfile(nextProfile);
    return nextProfile;
  }, [getLatestProfile, saveProfile]);

  const incrementTasksCompleted = useCallback(async () => {
    const latestProfile = await getLatestProfile();
    if (!latestProfile) return undefined;

    const nextProfile = {
      ...latestProfile,
      total_tasks_completed: (latestProfile.total_tasks_completed || 0) + 1,
    };
    await saveProfile(nextProfile);
    return nextProfile;
  }, [getLatestProfile, saveProfile]);

  const setActiveTheme = useCallback(async (theme) => {
    const latestProfile = await getLatestProfile();
    if (!latestProfile) return undefined;

    const nextProfile = {
      ...latestProfile,
      active_theme: theme,
    };
    return saveProfile(nextProfile);
  }, [getLatestProfile, saveProfile]);

  const grantMaxLevel = useCallback(async () => {
    const latestProfile = await getLatestProfile();
    if (!latestProfile) return undefined;

    const targetLevel = MAX_THEME_LEVEL;
    const targetXP = getMinimumXPForLevel(targetLevel);
    const nextProfile = {
      ...latestProfile,
      total_xp: Math.max(latestProfile.total_xp || 0, targetXP),
      level: Math.max(latestProfile.level || 1, targetLevel),
      unlocked_themes: getThemeIdsForLevel(targetLevel),
      last_active_date: new Date().toISOString().split('T')[0],
    };

    return saveProfile(nextProfile);
  }, [getLatestProfile, saveProfile]);

  return {
    profile,
    loading,
    saveProfile,
    addXP,
    addFocusMinutes,
    incrementTasksCompleted,
    setActiveTheme,
    grantMaxLevel,
    reload: loadProfile,
  };
}
