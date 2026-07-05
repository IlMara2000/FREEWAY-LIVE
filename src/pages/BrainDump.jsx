// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  BRAIN_DUMP_XP,
  buildBrainDumpPayload,
  buildBrainDumpPromotionPayload,
  invalidateTaskViews,
} from '@/lib/task-workflows';
import useUserProfile from '@/hooks/useUserProfile';
import XPReward from '@/components/shared/XPReward';
import TaskDescriptionAssistant from '@/components/tasks/TaskDescriptionAssistant';
import PageShell from '@/components/shared/PageShell';
import AppAssistantChat from '@/components/assistant/AppAssistantChat';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  FolderPlus,
  Link2,
  MessageCircle,
  Paperclip,
  Send,
  StickyNote,
  Trash2,
  Zap,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NOTE_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
];

const NOTE_QUERY_KEYS = [['notes'], ['note-folders'], ['brain-note-tasks']];
const MAX_ATTACHMENT_SIZE = 1.5 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 4;

const uniqueIds = (items = []) => Array.from(new Set(items.filter(Boolean)));

const deriveNoteTitle = (text) => {
  const cleaned = String(text || '').trim();
  if (!cleaned) return 'Nota senza titolo';

  const firstLine = cleaned.split('\n').map((line) => line.trim()).find(Boolean) || cleaned;
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
};

const formatAttachmentSize = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const readFilesAsAttachments = async (fileList) => {
  const files = Array.from(fileList || []).slice(0, MAX_ATTACHMENT_COUNT);

  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      reject(new Error(`${file.name} supera 1.5 MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      data_url: reader.result,
    });
    reader.onerror = () => reject(new Error(`Non riesco a leggere ${file.name}.`));
    reader.readAsDataURL(file);
  })));
};

const invalidateBrainDumpViews = (queryClient) => {
  invalidateTaskViews(queryClient);
  NOTE_QUERY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

export default function BrainDump() {
  const [searchParams, setSearchParams] = useSearchParams();
  const noteTargetId = searchParams.get('note');
  const [text, setText] = useState('');
  const [destination, setDestination] = useState('note');
  const [notePriority, setNotePriority] = useState('medium');
  const [noteDueDate, setNoteDueDate] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('unfiled');
  const [draftAttachments, setDraftAttachments] = useState([]);
  const [createFolderName, setCreateFolderName] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [taskSelectionByNote, setTaskSelectionByNote] = useState({});
  const [feedbackError, setFeedbackError] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const [assistantMemo, setAssistantMemo] = useState(null);
  const noteRefs = useRef({});
  const createAttachmentRef = useRef(null);
  const { profile, addXP } = useUserProfile();
  const queryClient = useQueryClient();

  const { data: dumpResponse = [] } = useQuery({
    queryKey: ['braindumps'],
    queryFn: () => accountData.tasks.filter({ is_brain_dump: true }, '-created_date', 30),
  });
  const dumps = normalizeList(dumpResponse);

  const { data: noteResponse = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => accountData.notes.list('-updated_date', 200),
  });
  const notes = normalizeList(noteResponse);

  const { data: folderResponse = [] } = useQuery({
    queryKey: ['note-folders'],
    queryFn: () => accountData.noteFolders.list('name', 80),
  });
  const folders = normalizeList(folderResponse);

  const { data: taskCatalogResponse = [] } = useQuery({
    queryKey: ['brain-note-tasks'],
    queryFn: () => accountData.tasks.list('-updated_date', 300),
  });
  const taskCatalog = normalizeList(taskCatalogResponse).filter((task) => !task.is_brain_dump);

  const folderMap = useMemo(
    () => Object.fromEntries(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const visibleNotes = useMemo(() => (
    notes.filter((note) => {
      if (folderFilter === 'all') return true;
      if (folderFilter === 'unfiled') return !note.folder_id;
      return note.folder_id === folderFilter;
    })
  ), [folderFilter, notes]);

  useEffect(() => {
    if (!noteTargetId) return;
    setDestination('note');
    setFolderFilter('all');
    setExpandedNoteId(noteTargetId);
  }, [noteTargetId]);

  useEffect(() => {
    if (!noteTargetId || !notes.length) return;
    const target = noteRefs.current[noteTargetId];
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [noteTargetId, notes.length]);

  const setDraftValue = (noteId, patch) => {
    setNoteDrafts((current) => ({
      ...current,
      [noteId]: {
        ...(current[noteId] || notes.find((item) => item.id === noteId) || {}),
        ...patch,
      },
    }));
  };

  const getDraftForNote = (note) => ({
    ...note,
    ...(noteDrafts[note.id] || {}),
    attachments: noteDrafts[note.id]?.attachments || note.attachments || [],
    linked_task_ids: noteDrafts[note.id]?.linked_task_ids || note.linked_task_ids || [],
  });

  const awardBrainDumpXP = async () => {
    const result = await addXP(BRAIN_DUMP_XP);
    setRewardData({
      amount: BRAIN_DUMP_XP,
      levelUp: result?.leveledUp || false,
      newLevel: result?.newLevel || (profile?.level || 1),
    });
    setShowReward(true);
  };

  const createTaskMutation = useMutation({
    mutationFn: async (title) => {
      await accountData.tasks.create(
        buildBrainDumpPayload(
          title,
          'Memo nato da Sfogo. Puoi inviarlo alla chat per trasformarlo in piano, task o sveglia.',
        ),
      );
      await awardBrainDumpXP();
    },
    onSuccess: () => {
      invalidateBrainDumpViews(queryClient);
      setText('');
      setDraftAttachments([]);
      setFeedbackError('');
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (payload) => {
      await accountData.notes.create(payload);
      await awardBrainDumpXP();
    },
    onSuccess: () => {
      invalidateBrainDumpViews(queryClient);
      setText('');
      setDraftAttachments([]);
      setFeedbackError('');
      setExpandedNoteId(null);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name) => accountData.noteFolders.create({ name }),
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['note-folders'] });
      setCreateFolderName('');
      setSelectedFolderId(folder.id);
      setFolderFilter(folder.id);
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (task) => accountData.tasks.update(task.id, buildBrainDumpPromotionPayload(task)),
    onSuccess: () => invalidateBrainDumpViews(queryClient),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => accountData.tasks.delete(id),
    onSuccess: () => invalidateBrainDumpViews(queryClient),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: ({ id, description }) => accountData.tasks.update(id, { description }),
    onSuccess: () => invalidateBrainDumpViews(queryClient),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => accountData.notes.update(id, data),
    onSuccess: () => invalidateBrainDumpViews(queryClient),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (note) => {
      const linkedTaskIds = uniqueIds(note.linked_task_ids || []);
      const linkedTasks = taskCatalog.filter((task) => linkedTaskIds.includes(task.id));

      await Promise.all(linkedTasks.map((task) => accountData.tasks.update(task.id, {
        linked_note_ids: uniqueIds((task.linked_note_ids || []).filter((linkedId) => linkedId !== note.id)),
      })));

      return accountData.notes.delete(note.id);
    },
    onSuccess: () => {
      invalidateBrainDumpViews(queryClient);
      if (noteTargetId) {
        const next = new URLSearchParams(searchParams);
        next.delete('note');
        setSearchParams(next);
      }
    },
  });

  const linkTaskMutation = useMutation({
    mutationFn: async ({ note, taskId }) => {
      const task = taskCatalog.find((item) => item.id === taskId);
      if (!task) throw new Error('Task non trovata.');

      const linkedNoteIds = uniqueIds([...(task.linked_note_ids || []), note.id]);
      const linkedTaskIds = uniqueIds([...(note.linked_task_ids || []), task.id]);

      await Promise.all([
        accountData.tasks.update(task.id, { linked_note_ids: linkedNoteIds }),
        accountData.notes.update(note.id, { linked_task_ids: linkedTaskIds }),
      ]);
    },
    onSuccess: (_, variables) => {
      setTaskSelectionByNote((current) => ({ ...current, [variables.note.id]: '' }));
      setDraftValue(variables.note.id, {
        linked_task_ids: uniqueIds([...(variables.note.linked_task_ids || []), variables.taskId]),
      });
      invalidateBrainDumpViews(queryClient);
    },
  });

  const unlinkTaskMutation = useMutation({
    mutationFn: async ({ note, taskId }) => {
      const task = taskCatalog.find((item) => item.id === taskId);
      if (!task) throw new Error('Task non trovata.');

      const linkedNoteIds = uniqueIds((task.linked_note_ids || []).filter((id) => id !== note.id));
      const linkedTaskIds = uniqueIds((note.linked_task_ids || []).filter((id) => id !== task.id));

      await Promise.all([
        accountData.tasks.update(task.id, { linked_note_ids: linkedNoteIds }),
        accountData.notes.update(note.id, { linked_task_ids: linkedTaskIds }),
      ]);
    },
    onSuccess: (_, variables) => {
      setDraftValue(variables.note.id, {
        linked_task_ids: uniqueIds((variables.note.linked_task_ids || []).filter((id) => id !== variables.taskId)),
      });
      invalidateBrainDumpViews(queryClient);
    },
  });

  const loadCreateAttachments = async (event) => {
    try {
      const attachments = await readFilesAsAttachments(event.target.files);
      setDraftAttachments((current) => [...current, ...attachments].slice(0, MAX_ATTACHMENT_COUNT));
      setFeedbackError('');
    } catch (error) {
      setFeedbackError(error?.message || 'Allegato non disponibile.');
    } finally {
      event.target.value = '';
    }
  };

  const loadNoteAttachments = async (noteId, event) => {
    try {
      const attachments = await readFilesAsAttachments(event.target.files);
      const currentNote = notes.find((item) => item.id === noteId);
      const draft = getDraftForNote(currentNote);
      setDraftValue(noteId, {
        attachments: [...(draft.attachments || []), ...attachments].slice(0, MAX_ATTACHMENT_COUNT),
      });
      setFeedbackError('');
    } catch (error) {
      setFeedbackError(error?.message || 'Allegato non disponibile.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateFolder = () => {
    const folderName = createFolderName.trim();
    if (!folderName) return;

    const duplicate = folders.find((folder) => folder.name?.toLowerCase() === folderName.toLowerCase());
    if (duplicate) {
      setSelectedFolderId(duplicate.id);
      setFolderFilter(duplicate.id);
      setCreateFolderName('');
      return;
    }

    createFolderMutation.mutate(folderName);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;

    setFeedbackError('');

    if (destination === 'task') {
      createTaskMutation.mutate(text.trim());
      return;
    }

    createNoteMutation.mutate({
      title: deriveNoteTitle(text),
      content: text.trim(),
      priority: notePriority,
      due_date: noteDueDate,
      folder_id: selectedFolderId === 'unfiled' ? '' : selectedFolderId,
      attachments: draftAttachments,
      linked_task_ids: [],
      source: 'brain_dump_note',
    });
  };

  const saveNote = (note) => {
    const draft = getDraftForNote(note);
    updateNoteMutation.mutate({
      id: note.id,
      data: {
        title: deriveNoteTitle(draft.title || draft.content),
        content: String(draft.content || '').trim(),
        priority: draft.priority || 'medium',
        due_date: draft.due_date || '',
        folder_id: draft.folder_id || '',
        attachments: draft.attachments || [],
      },
    });
  };

  const removeDraftAttachment = (attachmentId) => {
    setDraftAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const removeNoteAttachment = (note, attachmentId) => {
    const draft = getDraftForNote(note);
    setDraftValue(note.id, {
      attachments: (draft.attachments || []).filter((attachment) => attachment.id !== attachmentId),
    });
  };

  const mutationError = [
    createTaskMutation.error,
    createNoteMutation.error,
    createFolderMutation.error,
    promoteMutation.error,
    deleteMutation.error,
    updateDescriptionMutation.error,
    updateNoteMutation.error,
    deleteNoteMutation.error,
    linkTaskMutation.error,
    unlinkTaskMutation.error,
  ].find(Boolean);

  const showNotesSection = destination === 'note' || notes.length > 0 || Boolean(noteTargetId);

  return (
    <PageShell maxWidth="max-w-5xl" contentClassName="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-3 text-3xl font-grotesk font-bold text-foreground">
          <Brain className="h-8 w-8 text-primary" />
          Sfogo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scarica ogni pensiero. Da qui puoi creare note vere o mandare il caos dentro le task.
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel space-y-4 p-4 md:p-5"
      >
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Cosa ti frulla in testa? Scrivi tutto qui..."
          className="min-h-[130px] resize-none rounded-2xl border-white/10 bg-black/20 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) handleSubmit(event);
          }}
        />

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-[auto_auto_minmax(0,1fr)] md:items-end">
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Invia come</p>
            <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
              {[
                { value: 'note', label: 'Nota' },
                { value: 'task', label: 'Task' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDestination(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    destination === option.value
                      ? 'bg-emerald-400 text-black'
                      : 'text-white/58 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {destination === 'note' && (
            <>
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Priorita</span>
                <Select value={notePriority} onValueChange={setNotePriority}>
                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Scadenza</span>
                  <Input
                    type="date"
                    value={noteDueDate}
                    onChange={(event) => setNoteDueDate(event.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-black/25"
                  />
                </label>
                <label className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cartella</span>
                  <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/25">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfiled">Senza cartella</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </>
          )}
        </div>

        {destination === 'note' && (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={() => createAttachmentRef.current?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Allega file
                </Button>
                <input
                  ref={createAttachmentRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={loadCreateAttachments}
                />
                <span className="text-xs text-white/40">Fino a {MAX_ATTACHMENT_COUNT} file da 1.5 MB.</span>
              </div>

              {draftAttachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {draftAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white/80">{attachment.name}</p>
                        <p className="text-[11px] text-white/40">{formatAttachmentSize(attachment.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraftAttachment(attachment.id)}
                        className="text-white/35 transition-colors hover:text-red-200"
                        aria-label={`Rimuovi ${attachment.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 self-start md:w-[220px]">
              <Input
                value={createFolderName}
                onChange={(event) => setCreateFolderName(event.target.value)}
                placeholder="Nuova cartella"
                className="h-10 rounded-xl border-white/10 bg-black/25"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleCreateFolder}
                disabled={!createFolderName.trim() || createFolderMutation.isPending}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Crea cartella
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            +10 XP collegati al profilo
          </span>
          <Button
            type="submit"
            disabled={!text.trim() || createTaskMutation.isPending || createNoteMutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {destination === 'note' ? 'Salva nota' : 'Salva task'}
          </Button>
        </div>
      </motion.form>

      {(feedbackError || mutationError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {feedbackError || mutationError?.message || 'Operazione non riuscita. Riprova.'}
        </div>
      )}

      {showNotesSection && (
        <section className="glass-panel space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Note</p>
              <h2 className="mt-1 flex items-center gap-2 font-grotesk text-2xl font-bold text-white">
                <StickyNote className="h-5 w-5 text-emerald-300/70" />
                Archivio note
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setFolderFilter('all')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  folderFilter === 'all' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white/55'
                }`}
              >
                Tutte
              </button>
              <button
                type="button"
                onClick={() => setFolderFilter('unfiled')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  folderFilter === 'unfiled' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white/55'
                }`}
              >
                Senza cartella
              </button>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/25">
                  <SelectValue placeholder="Cartella" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="unfiled">Senza cartella</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visibleNotes.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/42">
              Nessuna nota qui. Seleziona "Nota" sopra e salva il primo brain dump come nota strutturata.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleNotes.map((note) => {
                const expanded = expandedNoteId === note.id;
                const draft = getDraftForNote(note);
                const linkedTasks = taskCatalog.filter((task) => (draft.linked_task_ids || []).includes(task.id));
                const availableTasks = taskCatalog.filter((task) => !(draft.linked_task_ids || []).includes(task.id));
                const currentFolderName = draft.folder_id ? folderMap[draft.folder_id]?.name : '';
                const isTargetNote = noteTargetId === note.id;

                return (
                  <motion.article
                    key={note.id}
                    ref={(element) => {
                      if (element) noteRefs.current[note.id] = element;
                    }}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`overflow-hidden rounded-2xl border bg-white/[0.02] ${
                      isTargetNote ? 'border-emerald-300/35 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]' : 'border-white/8'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedNoteId(expanded ? null : note.id);
                        if (!expanded) {
                          setDraftValue(note.id, {
                            title: note.title,
                            content: note.content,
                            priority: note.priority || 'medium',
                            due_date: note.due_date || '',
                            folder_id: note.folder_id || '',
                            attachments: note.attachments || [],
                            linked_task_ids: note.linked_task_ids || [],
                          });
                        }
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-400/10 text-emerald-200">
                        <StickyNote className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/84">{note.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                          <span>{NOTE_PRIORITY_OPTIONS.find((option) => option.value === note.priority)?.label || 'Media'}</span>
                          {note.due_date && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {note.due_date}
                            </span>
                          )}
                          {currentFolderName && (
                            <span className="inline-flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {currentFolderName}
                            </span>
                          )}
                          {note.attachments?.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {note.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {expanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/8"
                        >
                          <div className="space-y-4 p-4">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                              <label className="space-y-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Titolo</span>
                                <Input
                                  value={draft.title || ''}
                                  onChange={(event) => setDraftValue(note.id, { title: event.target.value })}
                                  className="h-10 rounded-xl border-white/10 bg-black/20"
                                />
                              </label>
                              <label className="space-y-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Priorita</span>
                                <Select
                                  value={draft.priority || 'medium'}
                                  onValueChange={(value) => setDraftValue(note.id, { priority: value })}
                                >
                                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {NOTE_PRIORITY_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>
                              <label className="space-y-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Scadenza</span>
                                <Input
                                  type="date"
                                  value={draft.due_date || ''}
                                  onChange={(event) => setDraftValue(note.id, { due_date: event.target.value })}
                                  className="h-10 rounded-xl border-white/10 bg-black/20"
                                />
                              </label>
                            </div>

                            <label className="space-y-2">
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Contenuto</span>
                              <Textarea
                                value={draft.content || ''}
                                onChange={(event) => setDraftValue(note.id, { content: event.target.value })}
                                className="min-h-[130px] rounded-2xl border-white/10 bg-black/20"
                              />
                            </label>

                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="space-y-3 rounded-2xl border border-white/8 bg-black/15 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-200/55">Cartella e file</p>
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    Aggiungi file
                                    <input
                                      type="file"
                                      multiple
                                      className="hidden"
                                      onChange={(event) => loadNoteAttachments(note.id, event)}
                                    />
                                  </label>
                                </div>

                                <Select
                                  value={draft.folder_id || 'unfiled'}
                                  onValueChange={(value) => setDraftValue(note.id, { folder_id: value === 'unfiled' ? '' : value })}
                                >
                                  <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unfiled">Senza cartella</SelectItem>
                                    {folders.map((folder) => (
                                      <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {(draft.attachments || []).length === 0 ? (
                                  <p className="text-xs text-white/38">Nessun file allegato.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {(draft.attachments || []).map((attachment) => (
                                      <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-white/80">{attachment.name}</p>
                                          <p className="text-[11px] text-white/38">{formatAttachmentSize(attachment.size)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <a
                                            href={attachment.data_url}
                                            download={attachment.name}
                                            className="text-white/45 transition-colors hover:text-cyan-100"
                                            aria-label={`Scarica ${attachment.name}`}
                                          >
                                            <FileText className="h-4 w-4" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => removeNoteAttachment(note, attachment.id)}
                                            className="text-white/35 transition-colors hover:text-red-200"
                                            aria-label={`Rimuovi ${attachment.name}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3 rounded-2xl border border-white/8 bg-black/15 p-3">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/55">Task collegate</p>

                                {linkedTasks.length === 0 ? (
                                  <p className="text-xs text-white/38">Ancora nessuna task collegata a questa nota.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {linkedTasks.map((task) => (
                                      <div key={`${note.id}-${task.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-white/82">{task.title}</p>
                                          <p className="text-[11px] text-white/38">{task.due_date || task.status}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => unlinkTaskMutation.mutate({ note, taskId: task.id })}
                                            className="text-white/35 transition-colors hover:text-red-200"
                                            aria-label={`Scollega ${task.title}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                                <Select
                                    value={taskSelectionByNote[note.id] || undefined}
                                    onValueChange={(value) => setTaskSelectionByNote((current) => ({ ...current, [note.id]: value }))}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/20">
                                      <SelectValue placeholder="Scegli una task" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableTasks.length === 0 ? (
                                        <SelectItem value="__empty__" disabled>Nessuna task disponibile</SelectItem>
                                      ) : availableTasks.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
                                    disabled={!taskSelectionByNote[note.id] || linkTaskMutation.isPending}
                                    onClick={() => linkTaskMutation.mutate({
                                      note,
                                      taskId: taskSelectionByNote[note.id],
                                    })}
                                  >
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Collega
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
                                onClick={() => saveNote(note)}
                                disabled={updateNoteMutation.isPending}
                              >
                                Salva nota
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 rounded-xl text-red-200 hover:bg-red-500/10"
                                onClick={() => deleteNoteMutation.mutate(note)}
                                disabled={deleteNoteMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina nota
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Memo task</p>
            <h2 className="font-grotesk text-xl font-bold text-white">Memo attuali</h2>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {dumps.map((dump) => (
            <motion.div
              key={dump.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="glass rounded-2xl p-4 group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{dump.title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300/50">MEMO</p>
                  <TaskDescriptionAssistant
                    task={dump}
                    sourceLabel="brain dump"
                    isSaving={updateDescriptionMutation.isPending && updateDescriptionMutation.variables?.id === dump.id}
                    onSaveDescription={(currentTask, description) =>
                      updateDescriptionMutation.mutateAsync({ id: currentTask.id, description })}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-cyan-200 hover:bg-cyan-300/10"
                    onClick={() => setAssistantMemo(dump)}
                    title="Invia memo alla chat"
                    aria-label={`Invia memo alla chat ${dump.title}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:bg-primary/10"
                    disabled={promoteMutation.isPending}
                    onClick={() => promoteMutation.mutate(dump)}
                    title="Promuovi a task"
                    aria-label={`Promuovi a task ${dump.title}`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(dump.id)}
                    title="Elimina dump"
                    aria-label={`Elimina dump ${dump.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <span className="ml-4 text-[10px] font-mono text-muted-foreground">
                {new Date(dump.created_date).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {dumps.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Brain className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="text-sm">Spazio pulito. Scrivi il primo pensiero quando arriva.</p>
          </div>
        )}
      </section>

      <XPReward
        amount={rewardData.amount}
        show={showReward}
        onComplete={() => setShowReward(false)}
        levelUp={rewardData.levelUp}
        newLevel={rewardData.newLevel}
      />
      <AppAssistantChat
        open={Boolean(assistantMemo)}
        onClose={() => setAssistantMemo(null)}
        profile={profile}
        sourceMemo={assistantMemo}
      />
    </PageShell>
  );
}
