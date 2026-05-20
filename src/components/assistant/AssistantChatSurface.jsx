import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Loader2, Send, Sparkles, Wand2 } from 'lucide-react';
import { requestAppAssistantReply } from '@/api/assistantClient';
import { applyAssistantActions, getActionLabel, normalizeAssistantActions } from '@/lib/assistant-actions';

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content: 'Dimmi cosa devi sistemare. Posso preparare task, eventi, memo e sveglie dentro Freeway. Tu controlli la proposta prima di applicarla.',
  },
];

const QUICK_PROMPTS = [
  'Programma tre task leggeri per oggi',
  'Trasforma questo caos in calendario',
  'Creami una sveglia per domani mattina',
  'Aiutami a pianificare un progetto senza esagerare',
];

const getTodayIso = () => new Date().toISOString().split('T')[0];

const buildContext = ({ profile, location }) => {
  const dayByDay = profile?.day_by_day || {};
  const onboarding = profile?.initial_onboarding || {};
  const answers = onboarding?.answers || {};

  return {
    page: location.pathname === '/' ? 'Chat Home' : location.pathname,
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
      setError(err?.message || 'Assistente non disponibile. Riprova tra poco.');
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
    } catch (err) {
      setError(err?.message || 'Non riesco ad applicare la proposta.');
    } finally {
      setApplying(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <section className={`relative overflow-hidden rounded-[1.4rem] border border-emerald-300/18 bg-[#02050c]/88 shadow-[0_28px_90px_rgba(0,0,0,0.64)] backdrop-blur-2xl ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.1),transparent_32%)]" />

      <header className="relative z-10 border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <motion.div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 text-emerald-200 shadow-[0_0_36px_rgba(16,185,129,0.14)]"
            animate={{ rotateY: [0, 10, 0], y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Bot className="h-5 w-5" />
          </motion.div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/60">
              Assistente operativo
            </p>
            <h1 className={`${compact ? 'text-2xl' : 'text-3xl sm:text-5xl'} font-grotesk font-black leading-none text-white`}>
              Cosa ti serve oggi?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
              Scrivi il bisogno. La chat propone modifiche all app: task, eventi, memo e sveglie. Niente casino: prima vedi, poi applichi.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/34">
              Quando invii, il testo e un contesto sintetico servono solo a preparare una proposta utile dentro l app.
            </p>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className={`relative z-10 min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5 ${compact ? 'h-[min(54dvh,420px)]' : 'h-[min(58dvh,560px)]'}`}
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
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
                    Proposta app
                  </p>
                  {message.actions.map((action, actionIndex) => (
                    <div key={`${action.type}-${actionIndex}`} className="rounded-xl border border-white/8 bg-white/[0.035] p-2 text-xs text-white/62">
                      {getActionLabel(action)}
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={message.applied || applying}
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
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
              Traduco in azioni...
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 border-t border-white/10 p-4 sm:p-5">
        {error && (
          <p className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
            {error}
          </p>
        )}

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(prompt)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-white/48 transition-colors hover:border-emerald-300/25 hover:text-emerald-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_auto] gap-2">
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
            className="min-w-0 resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/55"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-cyber grid h-full min-h-12 w-14 place-items-center rounded-xl disabled:opacity-45"
            aria-label="Invia messaggio"
          >
            {loading ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
