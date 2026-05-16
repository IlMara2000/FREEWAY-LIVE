import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Send, ShieldAlert, Sparkles, X } from 'lucide-react';
import { requestAppAssistantReply } from '@/api/groqTaskAssistant';

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: 'Dimmi cosa vuoi fare nell app. Ti guido su Planner, Day by Day, Tomato, Brain Dump, calendario o routine senza farti caricare troppo.',
  },
];

const QUICK_PROMPTS = [
  'Come uso Day by Day oggi?',
  'Aiutami a scegliere 3 task',
  'Come scarico il caos mentale?',
  'Spiegami il Tomato',
];

const pageLabels = {
  '/': 'Hub',
  '/calendar': 'Calendario',
  '/work': 'Lavoro',
  '/tomato': 'Tomato',
  '/planner': 'Planner',
  '/braindump': 'Brain Dump',
  '/themes': 'Temi',
  '/account': 'Account',
};

const buildAssistantContext = ({ profile, location }) => {
  const dayByDay = profile?.day_by_day || {};
  const onboarding = profile?.initial_onboarding || {};
  const answers = onboarding?.answers || {};

  return {
    page: pageLabels[location.pathname] || location.pathname,
    onboardingDone: Boolean(onboarding?.privacy?.accepted),
    dayByDayConfigured: Boolean(dayByDay.configured),
    currentEnergy: dayByDay.currentEnergy || '',
    project: dayByDay.project || answers.mainProject || '',
    obstacles: dayByDay.obstacles || answers.obstacles || [],
    mentalState: dayByDay.mentalState || answers.mentalState || '',
    routinePreference: dayByDay.routinePreference || answers.routinePreference || '',
  };
};

export default function AppAssistantChat({ open, onClose, profile, location }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const context = useMemo(() => buildAssistantContext({ profile, location }), [profile, location]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [open, messages]);

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
        context,
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.reply,
        },
      ]);
    } catch (err) {
      setError(err?.message || 'Assistente non disponibile. Riprova tra poco.');
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Chiudi assistente"
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.section
            className="relative z-10 flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-[1.35rem] border border-emerald-300/22 bg-[#02050c]/96 shadow-[0_34px_110px_rgba(0,0,0,0.86)]"
            initial={{ y: 38, opacity: 0, scale: 0.96, rotateX: -8 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ y: 38, opacity: 0, scale: 0.96, rotateX: -8 }}
            transition={{ type: 'spring', stiffness: 270, damping: 26 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <header className="border-b border-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
                    <Bot className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/65">
                      Groq assistant
                    </p>
                    <h2 className="font-grotesk text-xl font-black text-white">
                      Guida Freeway
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-white/42">
                      Ti aiuto a usare l app. Quando scrivi, il messaggio e un contesto sintetico vengono inviati a Groq.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-white/45 transition-colors hover:border-red-300/35 hover:text-red-200"
                  aria-label="Chiudi chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl border px-3.5 py-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'border-emerald-300/35 bg-emerald-400/16 text-emerald-50'
                        : 'border-white/10 bg-white/[0.045] text-white/72'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-white/55">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                    Sto ragionando...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              {error && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
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
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Chiedimi come usare l app..."
                  className="min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/55"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="btn-cyber grid h-12 w-12 place-items-center rounded-xl disabled:opacity-45"
                  aria-label="Invia messaggio"
                >
                  {loading ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
