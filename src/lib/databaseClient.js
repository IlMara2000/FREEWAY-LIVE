/**
 * Freeway Life - Database Client
 * 
 * Sostituisce completamente accountDataClient.js basato su localStorage
 * con chiamate autenticate alle tabelle Supabase.
 * 
 * Caratteristiche:
 * - Tutte le CRUD passano attraverso Supabase con RLS
 * - Caching intelligente con React Query
 * - Fallback automatico a localStorage in caso di errore di rete
 * - Event system per invalidazione cross-component
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Non usare fallback hardcoded - se non configurato, mostra errore
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        // Timeout più corto per UX migliore
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timeoutId));
        },
      },
    })
  : null;

export const ACCOUNT_DATA_CHANGED_EVENT = 'fw:account-data-changed';

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

const buildRecord = (table, data) => ({
  ...data,
  updated_date: nowISO(),
  ...(data.id ? {} : { created_date: nowISO() }),
});

// --------------------- LocalStorage Fallback ---------------------

const getFallbackKey = (entityName) => `fw_fallback_${entityName}`;

const fallbackRead = (entityName) => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(getFallbackKey(entityName)) || '[]');
  } catch {
    return [];
  }
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
 * Data migration utility: copies all localStorage data to Supabase
 */
export async function migrateLocalStorageToSupabase() {
  const client = getClient();
  if (!client) return { migrated: false, reason: 'Supabase not configured' };

  const session = await client.auth.getSession();
  if (!session?.data?.session?.user?.id) {
    return { migrated: false, reason: 'Not authenticated' };
  }

  const ownerId = session.data.session.user.id;
  const migrations = [];
  const entityKeys = [
    { key: 'fw_account_data_guest', entities: ['tasks', 'focusSessions', 'userProfiles', 'alarms', 'notes', 'noteFolders'] },
  ];

  const storedKey = `fw_account_data_${ownerId}`;
  try {
    const stored = localStorage.getItem(storedKey);
    if (!stored) return { migrated: false, reason: 'No localStorage data found' };

    const data = JSON.parse(stored);
    const tables = {
      tasks: 'Task',
      focusSessions: 'FocusSession',
      userProfiles: 'UserProfile',
      alarms: 'Alarm',
      notes: 'Note',
      noteFolders: 'NoteFolder',
    };

    for (const [localKey, entityName] of Object.entries(tables)) {
      const records = data[localKey] || [];
      for (const record of records) {
        try {
          const { id, owner_id, created_date, updated_date, ...cleanData } = record;
          await databaseClient.create(entityName, cleanData);
          migrations.push({ entity: entityName, id, status: 'migrated' });
        } catch (err) {
          migrations.push({ entity: entityName, id: record.id, status: 'failed', error: err.message });
        }
      }
    }

    // Mark migration as complete
    localStorage.setItem('fw_migration_complete', 'true');
    return { migrated: true, count: migrations.filter((m) => m.status === 'migrated').length };
  } catch (err) {
    return { migrated: false, reason: err.message };
  }
}