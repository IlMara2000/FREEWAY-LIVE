import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// XP thresholds per level
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

export function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForCurrentLevel(xp) {
  const level = getLevelFromXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 2000;
  return {
    current: xp - currentThreshold,
    needed: nextThreshold - currentThreshold,
    percentage: ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
  };
}

export function getThemeForLevel(level) {
  if (level >= 8) return ['emerald', 'ruby', 'amethyst', 'solar', 'arctic'];
  if (level >= 6) return ['emerald', 'ruby', 'amethyst', 'solar'];
  if (level >= 4) return ['emerald', 'ruby', 'amethyst'];
  if (level >= 2) return ['emerald', 'ruby'];
  return ['emerald'];
}

export default function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const profiles = await base44.entities.UserProfile.list();
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    } else {
      const newProfile = await base44.entities.UserProfile.create({
        total_xp: 0,
        level: 1,
        active_theme: 'emerald',
        unlocked_themes: ['emerald'],
        total_focus_minutes: 0,
        total_tasks_completed: 0,
        streak_days: 0,
        last_active_date: new Date().toISOString().split('T')[0],
      });
      setProfile(newProfile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const addXP = useCallback(async (amount) => {
    if (!profile) return;
    const newXP = (profile.total_xp || 0) + amount;
    const newLevel = getLevelFromXP(newXP);
    const unlockedThemes = getThemeForLevel(newLevel);
    const leveledUp = newLevel > (profile.level || 1);

    const updated = await base44.entities.UserProfile.update(profile.id, {
      total_xp: newXP,
      level: newLevel,
      unlocked_themes: unlockedThemes,
      last_active_date: new Date().toISOString().split('T')[0],
    });
    setProfile(updated);
    return { leveledUp, newLevel };
  }, [profile]);

  const addFocusMinutes = useCallback(async (minutes) => {
    if (!profile) return;
    const updated = await base44.entities.UserProfile.update(profile.id, {
      total_focus_minutes: (profile.total_focus_minutes || 0) + minutes,
    });
    setProfile(updated);
  }, [profile]);

  const incrementTasksCompleted = useCallback(async () => {
    if (!profile) return;
    const updated = await base44.entities.UserProfile.update(profile.id, {
      total_tasks_completed: (profile.total_tasks_completed || 0) + 1,
    });
    setProfile(updated);
  }, [profile]);

  const setActiveTheme = useCallback(async (theme) => {
    if (!profile) return;
    const updated = await base44.entities.UserProfile.update(profile.id, {
      active_theme: theme,
    });
    setProfile(updated);
  }, [profile]);

  return {
    profile,
    loading,
    addXP,
    addFocusMinutes,
    incrementTasksCompleted,
    setActiveTheme,
    reload: loadProfile,
  };
}