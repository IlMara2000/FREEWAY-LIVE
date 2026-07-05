import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Send, Sparkles, Wand2 } from 'lucide-react';
import { requestAppAssistantReply } from '@/api/assistantClient';
import { applyAssistantActions, getActionLabel, normalizeAssistantActions } from '@/lib/assistant-actions';

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content: 'Dimmi pure cosa ti serve. Posso rispondere a quesiti semplici, ragionare con te, chiarire una richiesta confusa e, quando serve, preparare task, eventi, memo o sveglie dentro Freeway.',
  },
];

const QUICK_PROMPTS = [
  'Fammi una domanda libera',
  'Aiutami a capire cosa fare',
  'Trasforma caos in piano',
];

const ACTION_TYPES = [
  { value: 'create_task', label: 'Task' },
  { value: 'create_event', label: 'Evento' },
  { value: 'create_memo', label: 'Memo' },
  { value: 'create_alarm', label: 'Sveglia' },
];

const PRIORITIES = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
];

const TASK_TYPES = [
  { value: 'task', label: 'Task' },
  { value: 'study', label: 'Studio' },
  { value: 'work', label: 'Lavoro' },
  { value: 'event', label: 'Evento' },
  { value: 'memo', label: 'Memo' },
];

const fieldClassName = 'min-h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-semibold text-white/80 outline-none transition-colors [color-scheme:dark] placeholder:text-white/25 focus:border-emerald-300/45';
const labelClassName = 'font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/45';

const getTodayIso = () => new Date().toISOString().split('T')[0];

const buildContext = ({ profile, location }) => {
  const dayByDay = profile?.day_by_day || {};
  const onboarding = profile?.initial_onboarding || {};
  const answers = onboarding?.answers || {};

  return {
    page: location.pathname === '/' ? 'Home' : location.pathname,
    today: getTodayIso(),
    onboardingDone: Boolean(onboarding?.privacy?.accepted),
    dayByDayConfigured: Boolean(dayByDay.configured),
    currentEnergy: dayByDay.currentEnergy || '',
    project: dayByDay.project || answers.mainProject || '',
    obstacles: dayByDay.obstacles || answers.obstacles || [],
    mentalState: dayByDay.mentalState || answers.mentalState || '',
    routinePreference: dayByDay.routinePreference || answers.routinePreference || '',
  };
};

export default function AssistantChatSurface({
  profile,
  className = '',
  compact = false,
  expanded = false,
  initialPrompt = '',
  sourceMemo = null,
}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [editingActionMessages, setEditingActionMessages] = useState(() => new Set());
  const listRef = useRef(null);
  const context = useMemo(() => buildContext({ profile, location }), [profile, location]);

  useEffect(() => {
    if (!initialPrompt) return;
    setInput(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, loading]);

  const sendMessage = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMessage = { role: 'user', content: clean };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await requestAppAssistantReply({
        message: clean,
        history: messages.slice(-8),
        context: {
          ...context,
          sourceMemo: sourceMemo?.title || '',
          sourceMemoDescription: sourceMemo?.description || '',
        },
        allowActions: true,
      });
      const actions = normalizeAssistantActions(response.actions);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.reply,
          actions,
        },
      ]);
    } catch (err) {
      setError(err?.message || 'FreeW.A.I. non disponibile. Riprova tra poco.');
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const applyActions = async (messageIndex, actions) => {
    if (!actions?.length || applying) return;
    setApplying(true);
    setError('');

    try {
      await applyAssistantActions(actions, queryClient);
      setMessages((current) => current.map((message, index) => (
        index === messageIndex ? { ...message, applied: true } : message
      )));
      setEditingActionMessages((current) => {
        const next = new Set(current);
        next.delete(messageIndex);
        return next;
      });
    } catch (err) {
      setError(err?.message || 'Non riesco ad applicare la proposta.');
    } finally {
      setApplying(false);
    }
  };

  const updateAction = (messageIndex, actionIndex, field, value) => {
    setMessages((current) => current.map((message, index) => {
      if (index !== messageIndex || message.applied) return message;

      return {
        ...message,
        actions: message.actions.map((action, currentActionIndex) => (
          currentActionIndex === actionIndex
            ? { ...action, [field]: value }
            : action
        )),
      };
    }));
  };

  const removeAction = (messageIndex, actionIndex) => {
    setMessages((current) => current.map((message, index) => {
      if (index !== messageIndex || message.applied) return message;

      return {
        ...message,
        actions: message.actions.filter((_, currentActionIndex) => currentActionIndex !== actionIndex),
      };
    }));
  };

  const toggleActionEditor = (messageIndex) => {
    setEditingActionMessages((current) => {
      const next = new Set(current);
      if (next.has(messageIndex)) {
        next.delete(messageIndex);
      } else {
        next.add(messageIndex);
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <section className={`relative flex max-h-full flex-col overflow-hidden rounded-[1.4rem] border border-emerald-300/18 bg-[#02050c]/88 shadow-[0_28px_90px_rgba(0,0,0,0.64)] backdrop-blur-2xl ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.1),transparent_32%)]" />

      <header className="relative z-10 shrink-0 border-b border-white/10 p-3 pr-14 sm:p-5 sm:pr-20">
        <div className="flex items-start gap-3">
          <motion.div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 text-emerald-200 shadow-[0_0_36px_rgba(16,185,129,0.14)] sm:h-12 sm:w-12"
            animate={{ rotateY: [0, 10, 0], y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
          </motion.div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/60">
              FreeW.A.I. operativo
            </p>
            <h1 className={`${compact ? 'text-[1.35rem] sm:text-2xl' : 'text-[1.65rem] sm:text-5xl'} font-grotesk font-black leading-[0.96] text-white`}>
              Cosa ti serve oggi?
            </h1>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className={`relative z-10 min-h-0 space-y-3 overflow-y-auto p-3 sm:p-5 ${
          expanded ? 'flex-1' : compact ? 'h-[min(18dvh,140px)] sm:h-[min(54dvh,420px)]' : 'h-[min(26dvh,220px)] sm:h-[min(58dvh,560px)]'
        }`}
      >
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl border px-3.5 py-3 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'border-emerald-300/35 bg-emerald-400/16 text-emerald-50'
                : 'border-white/10 bg-white/[0.045] text-white/72'
            }`}
            >
              <p className="whitespace-pre-line">{message.content}</p>

              {message.actions?.length > 0 && (
                <div className="mt-3 space-y-2 rounded-2xl border border-emerald-300/16 bg-black/24 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
                      Proposta app
                    </p>
                    {!message.applied && (
                      <button
                        type="button"
                        onClick={() => toggleActionEditor(index)}
                        className="shrink-0 rounded-xl border border-emerald-200/15 bg-emerald-300/8 px-3 py-1.5 text-xs font-semibold text-emerald-50/72 transition-colors hover:border-emerald-200/35 hover:text-emerald-50"
                      >
                        {editingActionMessages.has(index) ? 'Chiudi modifica' : 'Modifica'}
                      </button>
                    )}
                  </div>

                  {!editingActionMessages.has(index) && (
                    <div className="space-y-2">
                      {message.actions.map((action, actionIndex) => {
                        const when = [action.date, action.time].filter(Boolean).join(' ');
                        const detail = action.type === 'create_alarm'
                          ? action.reminder_text
                          : action.description;

                        return (
                          <div key={`${action.type}-${actionIndex}`} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3 text-xs text-white/62">
                            <p className="font-grotesk text-sm font-semibold text-white/82">
                              {getActionLabel(action)}
                            </p>
                            {when && (
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/48">
                                {when}{action.end_time && action.type !== 'create_alarm' ? ` - ${action.end_time}` : ''}
                              </p>
                            )}
                            {detail && (
                              <p className="mt-2 line-clamp-2 text-white/48">
                                {detail}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {editingActionMessages.has(index) && message.actions.map((action, actionIndex) => (
                    <div key={`${action.type}-${actionIndex}`} className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3 text-xs text-white/62">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-grotesk text-sm font-semibold text-white/78">
                          {getActionLabel(action)}
                        </p>
                        {!message.applied && (
                          <button
                            type="button"
                            onClick={() => removeAction(index, actionIndex)}
                            className="shrink-0 rounded-lg border border-red-300/15 bg-red-400/8 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-red-100/70 transition-colors hover:border-red-300/35 hover:text-red-100"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className={labelClassName}>Tipo</span>
                          <select
                            value={action.type || 'create_task'}
                            disabled={message.applied}
                            onChange={(event) => updateAction(index, actionIndex, 'type', event.target.value)}
                            className={fieldClassName}
                          >
                            {ACTION_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className={labelClassName}>Titolo</span>
                          <input
                            value={action.title || ''}
                            disabled={message.applied}
                            onChange={(event) => updateAction(index, actionIndex, 'title', event.target.value)}
                            className={fieldClassName}
                            placeholder="Titolo"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className={labelClassName}>Data</span>
                          <input
                            type="date"
                            value={action.date || ''}
                            disabled={message.applied}
                            onChange={(event) => updateAction(index, actionIndex, 'date', event.target.value)}
                            className={fieldClassName}
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className={labelClassName}>Ora</span>
                            <input
                              type="time"
                              value={action.time || ''}
                              disabled={message.applied}
                              onChange={(event) => updateAction(index, actionIndex, 'time', event.target.value)}
                              className={fieldClassName}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className={labelClassName}>Fine</span>
                            <input
                              type="time"
                              value={action.end_time || ''}
                              disabled={message.applied || action.type === 'create_alarm'}
                              onChange={(event) => updateAction(index, actionIndex, 'end_time', event.target.value)}
                              className={fieldClassName}
                            />
                          </label>
                        </div>

                        <label className="space-y-1">
                          <span className={labelClassName}>Priorita</span>
                          <select
                            value={action.priority || 'medium'}
                            disabled={message.applied || action.type === 'create_alarm'}
                            onChange={(event) => updateAction(index, actionIndex, 'priority', event.target.value)}
                            className={fieldClassName}
                          >
                            {PRIORITIES.map((priority) => (
                              <option key={priority.value} value={priority.value}>{priority.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className={labelClassName}>Area</span>
                          <select
                            value={action.task_type || 'task'}
                            disabled={message.applied || action.type === 'create_alarm'}
                            onChange={(event) => updateAction(index, actionIndex, 'task_type', event.target.value)}
                            className={fieldClassName}
                          >
                            {TASK_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="block space-y-1">
                        <span className={labelClassName}>
                          {action.type === 'create_alarm' ? 'Promemoria' : 'Descrizione'}
                        </span>
                        <textarea
                          value={action.type === 'create_alarm' ? action.reminder_text || '' : action.description || ''}
                          disabled={message.applied}
                          onChange={(event) => updateAction(
                            index,
                            actionIndex,
                            action.type === 'create_alarm' ? 'reminder_text' : 'description',
                            event.target.value,
                          )}
                          rows={2}
                          className={`${fieldClassName} resize-none leading-relaxed`}
                          placeholder="Dettagli utili..."
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={message.applied || applying || message.actions.length === 0}
                    onClick={() => applyActions(index, message.actions)}
                    className="btn-cyber inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[11px] disabled:opacity-45"
                  >
                    {message.applied ? <CheckCircle2 className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    {message.applied ? 'APPLICATO' : applying ? 'APPLICO...' : 'APPLICA NELL APP'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/18 bg-white/[0.045] px-4 py-3 text-sm text-white/62 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
              <motion.span
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/14 to-transparent"
                animate={{ x: ['-140%', '340%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative flex items-center gap-3">
                <motion.div
                  className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-300/22 bg-emerald-400/10"
                  animate={{ rotateY: [0, 18, 0], y: [0, -2, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.span
                    className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.75)]"
                    animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
                <div>
                  <p className="font-grotesk text-sm font-semibold text-emerald-50">Sto preparando la proposta</p>
                  <div className="mt-1 flex gap-1.5">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full bg-emerald-300/70"
                        animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.12, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-5">
        {error && (
          <p className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
            {error}
          </p>
        )}

        <div className="mb-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(prompt)}
              className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-center text-[11px] font-semibold leading-tight text-white/52 transition-colors hover:border-emerald-300/25 hover:text-emerald-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_auto] items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                handleSubmit(event);
              }
            }}
            placeholder="Es: domani devo preparare una proposta, ricordami alle 9 e dividila in task..."
            rows={compact ? 2 : 3}
            className="min-w-0 resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/55 max-sm:max-h-20"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-cyber grid h-11 w-11 place-items-center rounded-xl disabled:opacity-45 sm:min-h-12 sm:w-14"
            aria-label="Invia messaggio"
          >
            {loading ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
