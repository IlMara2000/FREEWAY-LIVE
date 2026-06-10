/**
 * Freeway Life - Account Data Client
 * 
 * Adapter layer che usa databaseClient (Supabase + localStorage fallback).
 * Mantiene la stessa API pubblica per backward compatibility con tutti i componenti.
 * 
 * Le funzioni list/filter/create/update/delete ora usano il database remoto
 * con fallback automatico a localStorage se offline.
 */

import { databaseClient, ACCOUNT_DATA_CHANGED_EVENT } from '@/lib/databaseClient';

// Re-export per backward compatibility
export { ACCOUNT_DATA_CHANGED_EVENT };

const ENTITY_DEFAULTS = {
  Task: () => ({
    status: 'inbox',
    priority: 'medium',
    xp_value: 25,
    is_brain_dump: false,
  }),
  FocusSession: () => ({
    completed: false,
    xp_earned: 0,
  }),
  UserProfile: () => ({
    total_xp: 0,
    level: 1,
    active_theme: 'emerald',
    unlocked_themes: ['emerald'],
    total_focus_minutes: 0,
    total_tasks_completed: 0,
    streak_days: 0,
    last_active_date: new Date().toISOString().split('T')[0],
  }),
  Alarm: () => ({
    title: 'Sveglia',
    time: '09:00',
    date: '',
    repeat: 'none',
    enabled: true,
    linked_task_id: '',
    reminder_text: '',
    last_notified_key: '',
  }),
  Note: () => ({
    title: 'Nuova nota',
    content: '',
    priority: 'medium',
    source: 'brain_dump_note',
    due_date: '',
    folder_id: '',
    attachments: [],
    linked_task_ids: [],
  }),
  NoteFolder: () => ({
    name: 'Nuova cartella',
  }),
};

const createEntityClient = (entityName) => ({
  /**
   * Lista tutti i record con ordinamento opzionale
   */
  list: async (sort, limit) => {
    const orderBy = typeof sort === 'string'
      ? { column: sort.replace(/^-/, ''), ascending: !sort.startsWith('-') }
      : undefined;

    return databaseClient.list(entityName, { orderBy, limit });
  },

  /**
   * Filtra record per campo/valore
   */
  filter: async (filters = {}, sort, limit) => {
    const orderBy = typeof sort === 'string'
      ? { column: sort.replace(/^-/, ''), ascending: !sort.startsWith('-') }
      : undefined;

    return databaseClient.list(entityName, { filters, orderBy, limit });
  },

  /**
   * Crea un nuovo record con defaults
   */
  create: async (data) => {
    const defaults = ENTITY_DEFAULTS[entityName]?.() || {};
    return databaseClient.create(entityName, {
      ...defaults,
      ...data,
    });
  },

  /**
   * Aggiorna un record esistente
   */
  update: async (id, data) => {
    return databaseClient.update(entityName, id, data);
  },

  /**
   * Elimina un record
   */
  delete: async (id) => {
    return databaseClient.remove(entityName, id);
  },
});

export const accountData = {
  tasks: createEntityClient('Task'),
  focusSessions: createEntityClient('FocusSession'),
  userProfiles: createEntityClient('UserProfile'),
  alarms: createEntityClient('Alarm'),
  notes: createEntityClient('Note'),
  noteFolders: createEntityClient('NoteFolder'),
};