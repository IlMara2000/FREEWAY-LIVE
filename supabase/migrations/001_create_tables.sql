-- Freeway Life - Database Schema
-- Migration 001: Core tables

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  active_theme TEXT NOT NULL DEFAULT 'emerald',
  unlocked_themes TEXT[] NOT NULL DEFAULT ARRAY['emerald'],
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_by_day JSONB DEFAULT NULL,
  freeway_os JSONB DEFAULT NULL,
  initial_onboarding JSONB DEFAULT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id)
);

CREATE INDEX idx_profiles_owner_id ON profiles(owner_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('today', 'inbox', 'scheduled', 'done')),
  due_date TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'work', 'study', 'event', 'memo')),
  is_brain_dump BOOLEAN NOT NULL DEFAULT FALSE,
  xp_value INTEGER NOT NULL DEFAULT 25,
  day_by_day BOOLEAN NOT NULL DEFAULT FALSE,
  day_by_day_date TEXT DEFAULT '',
  day_by_day_section TEXT DEFAULT '',
  day_by_day_area TEXT DEFAULT '',
  day_by_day_weight TEXT DEFAULT '',
  source TEXT DEFAULT '',
  recurrence_rule TEXT DEFAULT '',
  recurrence_group_id TEXT DEFAULT '',
  recurrence_index INTEGER DEFAULT 0,
  recurrence_total INTEGER DEFAULT 0,
  copied_from_title TEXT DEFAULT '',
  linked_note_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_brain_dump ON tasks(is_brain_dump) WHERE is_brain_dump = TRUE;

-- Focus Sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  task_id TEXT DEFAULT '',
  task_title TEXT DEFAULT '',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_focus_sessions_owner_id ON focus_sessions(owner_id);

-- Alarms
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sveglia',
  time TEXT NOT NULL DEFAULT '09:00',
  date TEXT DEFAULT '',
  repeat TEXT NOT NULL DEFAULT 'none',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_text TEXT DEFAULT '',
  linked_task_id TEXT DEFAULT '',
  last_notified_key TEXT DEFAULT '',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alarms_owner_id ON alarms(owner_id);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nuova nota',
  content TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  source TEXT DEFAULT 'brain_dump_note',
  due_date TEXT DEFAULT '',
  folder_id TEXT DEFAULT '',
  attachments JSONB DEFAULT '[]'::JSONB,
  linked_task_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_owner_id ON notes(owner_id);

-- Note Folders
CREATE TABLE IF NOT EXISTS note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_folders_owner_id ON note_folders(owner_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage their own tasks"
  ON tasks FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage their own focus_sessions"
  ON focus_sessions FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage their own alarms"
  ON alarms FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage their own notes"
  ON notes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage their own note_folders"
  ON note_folders FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());