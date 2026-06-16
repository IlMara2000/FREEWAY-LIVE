/**
 * Freeway Life - Database Client
 *
 * Tutto il layer dati usa lo stesso client Supabase dell'auth.
 * In questo modo evitiamo sessioni duplicate, warning di GoTrueClient
 * e race condition tra login e lettura/scrittura dati.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export const ACCOUNT_DATA_CHANGED_EVENT = 'fw:account-data-changed';
const MIGRATION_VERSION = 'v2';

// --------------------- Types & Constants ---------------------

const ENTITY_COLLECTIONS = {
  Task: { table: 'tasks', orderBy: { column: 'created_date', ascending: false } },
  FocusSession: { table: 'focus_sessions', orderBy: { column: 'created_date', ascending: false } },
  UserProfile: { table: 'profiles', orderBy: { column: 'updated_date', ascending: false } },
  Alarm: { table: 'alarms', orderBy: { column: 'time', ascending: true } },
  Note: { table: 'notes', orderBy: { column: 'updated_date', ascending: false } },
  NoteFolder: { table: 'note_folders', orderBy: { column: 'name', ascending: true } },
};

// --------------------- Helpers ---------------------

const emitDataChanged = (entityName) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACCOUNT_DATA_CHANGED_EVENT, {
    detail: { entityName },
  }));
};

const nowISO = () => new Date().toISOString();
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const toNumeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const pickLatestDate = (...values) =>
  values
    .filter((value) => typeof value === 'string' && value.trim())
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
const mergeNested = (baseValue, nextValue) => {
  if (!isPlainObject(baseValue) || !isPlainObject(nextValue)) {
    return nextValue ?? baseValue;
  }

  return Object.entries(nextValue).reduce((acc, [key, value]) => {
    acc[key] = mergeNested(baseValue[key], value);
    return acc;
  }, { ...baseValue });
};
const pickLatestProfileRecord = (records = []) =>
  [...records]
    .filter((record) => record && typeof record === 'object')
    .sort((left, right) => {
      const rightTimestamp = new Date(right.updated_date || right.created_date || 0).getTime();
      const leftTimestamp = new Date(left.updated_date || left.created_date || 0).getTime();
      return rightTimestamp - leftTimestamp;
    })[0] || null;
const mergeProfileRecord = (remoteProfile, localProfile, ownerId) => {
  const remote = remoteProfile || {};
  const local = localProfile || {};

  return {
    ...remote,
    ...local,
    owner_id: ownerId,
    active_theme: local.active_theme || remote.active_theme || 'emerald',
    unlocked_themes: Array.from(new Set([
      ...(Array.isArray(remote.unlocked_themes) ? remote.unlocked_themes : []),
      ...(Array.isArray(local.unlocked_themes) ? local.unlocked_themes : []),
      'emerald',
    ])),
    total_xp: Math.max(toNumeric(remote.total_xp), toNumeric(local.total_xp)),
    level: Math.max(toNumeric(remote.level, 1), toNumeric(local.level, 1), 1),
    total_focus_minutes: Math.max(toNumeric(remote.total_focus_minutes), toNumeric(local.total_focus_minutes)),
    total_tasks_completed: Math.max(toNumeric(remote.total_tasks_completed), toNumeric(local.total_tasks_completed)),
    streak_days: Math.max(toNumeric(remote.streak_days), toNumeric(local.streak_days)),
    day_by_day: mergeNested(remote.day_by_day || {}, local.day_by_day || {}),
    freeway_os: mergeNested(remote.freeway_os || {}, local.freeway_os || {}),
    initial_onboarding: mergeNested(remote.initial_onboarding || {}, local.initial_onboarding || {}),
    last_active_date: pickLatestDate(remote.last_active_date, local.last_active_date),
    created_date: remote.created_date || local.created_date || nowISO(),
    updated_date: nowISO(),
  };
};

const buildRecord = (table, data) => ({
  ...data,
  updated_date: nowISO(),
  ...(data.id ? {} : { created_date: nowISO() }),
});

// --------------------- LocalStorage Fallback ---------------------

const getFallbackKey = (entityName) => `fw_fallback_${entityName}`;
const getMigrationMarkerKey = (ownerId) => `fw_migration_complete_${ownerId}_${MIGRATION_VERSION}`;
const getLegacyAccountStorageKeys = (ownerId) => [`fw_account_data_${ownerId}`, 'fw_account_data_guest'];

const fallbackRead = (entityName) => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(getFallbackKey(entityName)) || '[]');
  } catch {
    return [];
  }
};

const fallbackClear = (entityName) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getFallbackKey(entityName));
  } catch {
    // offline fallback
  }
};

const collectLocalBuckets = (ownerId) => {
  const entityMap = {
    Task: 'tasks',
    FocusSession: 'focusSessions',
    UserProfile: 'userProfiles',
    Alarm: 'alarms',
    Note: 'notes',
    NoteFolder: 'noteFolders',
  };

  const localBuckets = Object.keys(entityMap).reduce((acc, entityName) => {
    acc[entityName] = [];
    return acc;
  }, {});

  Object.keys(entityMap).forEach((entityName) => {
    localBuckets[entityName].push(...fallbackRead(entityName));
  });

  getLegacyAccountStorageKeys(ownerId).forEach((storageKey) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      Object.entries(entityMap).forEach(([entityName, legacyKey]) => {
        if (Array.isArray(parsed?.[legacyKey])) {
          localBuckets[entityName].push(...parsed[legacyKey]);
        }
      });
    } catch {
      // Ignore malformed legacy payloads.
    }
  });

  return localBuckets;
};

const fallbackWrite = (entityName, records) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getFallbackKey(entityName), JSON.stringify(records));
  } catch {
    // offline fallback
  }
};

// --------------------- Main Database Client ---------------------

const getClient = () => {
  if (!supabase) return null;
  return supabase;
};

export const databaseClient = {
  /**
   * Esegue una query di SELECT con supporto per filtri, ordinamento e limit
   */
  async list(entityName, { filters = {}, orderBy, limit } = {}) {
    const client = getClient();
    if (!client) {
      const records = fallbackRead(entityName);
      return filterRecords(records, filters).slice(0, limit || 999);
    }

    const config = ENTITY_COLLECTIONS[entityName];
    if (!config) throw new Error(`Unknown entity: ${entityName}`);

    const session = await client.auth.getSession();
    const ownerId = session?.data?.session?.user?.id;
    if (!ownerId) return [];

    let query = client
      .from(config.table)
      .select('*')
      .eq('owner_id', ownerId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply ordering
    const sort = orderBy || config.orderBy;
    query = query.order(sort.column, { ascending: sort.ascending });

    // Apply limit
    if (limit) query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.warn(`Supabase query error for ${entityName}:`, error.message);
      const records = fallbackRead(entityName);
      return filterRecords(records, filters).slice(0, limit || 999);
    }

    return data || [];
  },

  /**
   * Crea un nuovo record
   */
  async create(entityName, data) {
    const client = getClient();
    if (!client) {
      const records = fallbackRead(entityName);
      const newRecord = {
        ...data,
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        created_date: nowISO(),
        updated_date: nowISO(),
      };
      records.push(newRecord);
      fallbackWrite(entityName, records);
      emitDataChanged(entityName);
      return newRecord;
    }

    const config = ENTITY_COLLECTIONS[entityName];
    const session = await client.auth.getSession();
    const ownerId = session?.data?.session?.user?.id;
    if (!ownerId) throw new Error('Not authenticated');

    const record = buildRecord(config.table, {
      ...data,
      owner_id: ownerId,
    });

    const { data: result, error } = await client
      .from(config.table)
      .insert(record)
      .select()
      .single();

    if (error) {
      // Fallback to localStorage
      const records = fallbackRead(entityName);
      const localRecord = { ...record, id: record.id || `local_${Date.now()}` };
      records.push(localRecord);
      fallbackWrite(entityName, records);
      emitDataChanged(entityName);
      return localRecord;
    }

    emitDataChanged(entityName);
    return result;
  },

  /**
   * Aggiorna un record esistente
   */
  async update(entityName, id, data) {
    const client = getClient();
    if (!client) {
      const records = fallbackRead(entityName);
      const index = records.findIndex((r) => r.id === id);
      if (index >= 0) {
        records[index] = { ...records[index], ...data, updated_date: nowISO() };
        fallbackWrite(entityName, records);
      }
      emitDataChanged(entityName);
      return records[index] || { ...data, id, updated_date: nowISO() };
    }

    const config = ENTITY_COLLECTIONS[entityName];

    const { data: result, error } = await client
      .from(config.table)
      .update({ ...data, updated_date: nowISO() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Update fallback
      const records = fallbackRead(entityName);
      const index = records.findIndex((r) => r.id === id);
      if (index >= 0) {
        records[index] = { ...records[index], ...data, updated_date: nowISO() };
        fallbackWrite(entityName, records);
        emitDataChanged(entityName);
        return records[index];
      }
      throw error;
    }

    emitDataChanged(entityName);
    return result;
  },

  /**
   * Elimina un record
   */
  async remove(entityName, id) {
    const client = getClient();
    if (!client) {
      const records = fallbackRead(entityName);
      fallbackWrite(entityName, records.filter((r) => r.id !== id));
      emitDataChanged(entityName);
      return { success: true };
    }

    const config = ENTITY_COLLECTIONS[entityName];

    const { error } = await client
      .from(config.table)
      .delete()
      .eq('id', id);

    if (error) {
      // Remove from fallback
      const records = fallbackRead(entityName);
      fallbackWrite(entityName, records.filter((r) => r.id !== id));
    }

    emitDataChanged(entityName);
    return { success: true };
  },

  /**
   * Ottiene o crea il profilo utente
   */
  async ensureProfile() {
    const client = getClient();
    if (!client) return null;

    const session = await client.auth.getSession();
    const ownerId = session?.data?.session?.user?.id;
    if (!ownerId) return null;

    // Try to get existing profile
    const { data: existing } = await client
      .from('profiles')
      .select('*')
      .eq('owner_id', ownerId)
      .single();

    if (existing) return existing;

    // Create new profile
    const { data: newProfile, error } = await client
      .from('profiles')
      .insert({
        owner_id: ownerId,
        total_xp: 0,
        level: 1,
        active_theme: 'emerald',
        unlocked_themes: ['emerald'],
      })
      .select()
      .single();

    if (error) {
      // Try localStorage fallback
      const profiles = fallbackRead('UserProfile');
      const existingLocal = profiles.find((p) => p.owner_id === ownerId);
      if (existingLocal) return existingLocal;

      const newLocal = {
        id: `local_${Date.now()}`,
        owner_id: ownerId,
        total_xp: 0,
        level: 1,
        active_theme: 'emerald',
        unlocked_themes: ['emerald'],
      };
      profiles.push(newLocal);
      fallbackWrite('UserProfile', profiles);
      return newLocal;
    }

    return newProfile;
  },
};

// Internal filter helper
function filterRecords(records, filters) {
  return records.filter((record) =>
    Object.entries(filters).every(([key, value]) => record[key] === value)
  );
}

/**
 * Data migration utility: copies legacy local data to the authenticated account.
 */
export async function migrateLocalDataToAccount() {
  const client = getClient();
  if (!client) return { migrated: false, reason: 'Supabase not configured' };
  if (typeof window === 'undefined') return { migrated: false, reason: 'No browser storage available' };

  const session = await client.auth.getSession();
  if (!session?.data?.session?.user?.id) {
    return { migrated: false, reason: 'Not authenticated' };
  }

  const ownerId = session.data.session.user.id;
  const markerKey = getMigrationMarkerKey(ownerId);

  try {
    const localBuckets = collectLocalBuckets(ownerId);

    if (!Object.values(localBuckets).some((records) => records.length > 0)) {
      localStorage.setItem(markerKey, '1');
      return { migrated: false, reason: 'No local data found' };
    }

    const remoteIdsByEntity = {};
    await Promise.all(Object.keys(ENTITY_COLLECTIONS).filter((entityName) => entityName !== 'UserProfile').map(async (entityName) => {
      const { data, error } = await client
        .from(ENTITY_COLLECTIONS[entityName].table)
        .select('id')
        .eq('owner_id', ownerId)
        .limit(5000);

      if (error) {
        throw error;
      }

      remoteIdsByEntity[entityName] = new Set((data || []).map((record) => record.id).filter(Boolean));
    }));

    const migrations = [];

    const localProfileRecord = pickLatestProfileRecord(localBuckets.UserProfile);
    if (localProfileRecord) {
      try {
        const { data: existingProfile, error: existingProfileError } = await client
          .from('profiles')
          .select('*')
          .eq('owner_id', ownerId)
          .maybeSingle();

        if (existingProfileError) throw existingProfileError;

        const mergedProfile = mergeProfileRecord(existingProfile, localProfileRecord, ownerId);
        const { id: localProfileId, savedAt, ...profilePayload } = mergedProfile;

        const profileQuery = existingProfile?.id
          ? client.from('profiles').update(profilePayload).eq('id', existingProfile.id).select('id').single()
          : client.from('profiles').insert(profilePayload).select('id').single();

        const { error: profileError } = await profileQuery;
        if (profileError) throw profileError;

        migrations.push({ entity: 'UserProfile', id: localProfileId || existingProfile?.id, status: 'migrated' });
      } catch (err) {
        migrations.push({ entity: 'UserProfile', id: localProfileRecord.id, status: 'failed', error: err.message });
      }
    }

    for (const entityName of Object.keys(localBuckets).filter((key) => key !== 'UserProfile')) {
      const seenLocalKeys = new Set();
      const records = localBuckets[entityName];
      for (const record of records) {
        if (!record || typeof record !== 'object') continue;

        const localIdentity = record.id || JSON.stringify(record);
        if (seenLocalKeys.has(localIdentity)) continue;
        seenLocalKeys.add(localIdentity);

        if (record.id && remoteIdsByEntity[entityName]?.has(record.id)) {
          migrations.push({ entity: entityName, id: record.id, status: 'skipped' });
          continue;
        }

        try {
          const { owner_id, savedAt, ...payload } = record;
          const table = ENTITY_COLLECTIONS[entityName].table;
          const remoteRecord = buildRecord(table, {
            ...payload,
            owner_id: ownerId,
          });

          const query = remoteRecord.id
            ? client.from(table).upsert(remoteRecord, { onConflict: 'id' }).select('id').single()
            : client.from(table).insert(remoteRecord).select('id').single();

          const { data, error } = await query;
          if (error) throw error;
          if (data?.id) remoteIdsByEntity[entityName]?.add(data.id);
          migrations.push({ entity: entityName, id: record.id, status: 'migrated' });
        } catch (err) {
          migrations.push({ entity: entityName, id: record.id, status: 'failed', error: err.message });
        }
      }
    }

    const failedCount = migrations.filter((migration) => migration.status === 'failed').length;
    const migratedEntities = Array.from(new Set(
      migrations
        .filter((migration) => migration.status === 'migrated')
        .map((migration) => migration.entity),
    ));

    migratedEntities.forEach((entityName) => emitDataChanged(entityName));

    if (failedCount === 0) {
      Object.keys(localBuckets).forEach((entityName) => fallbackClear(entityName));
      getLegacyAccountStorageKeys(ownerId).forEach((storageKey) => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Ignore local storage cleanup failures.
        }
      });
      localStorage.setItem(markerKey, '1');
    }

    return {
      migrated: migrations.some((migration) => migration.status === 'migrated'),
      count: migrations.filter((migration) => migration.status === 'migrated').length,
      failedCount,
    };
  } catch (err) {
    return { migrated: false, reason: err.message };
  }
}

export const migrateLocalStorageToSupabase = migrateLocalDataToAccount;
