import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

const INFO_BLOCKS = [
  {
    icon: Sparkles,
    title: 'Perche esiste',
    text: "Freeway Life nasce per tenere insieme task, tempo, memo, routine, lavoro e sveglie senza trasformare la vita in una gabbia. L'obiettivo e ridurre caos, overthinking e dispersione con strumenti semplici.",
  },
  {
    icon: CalendarDays,
    title: 'Come funziona',
    text: 'Home, Calendario, Planner, Timer, Note, Lavoro, Sveglie e Temi lavorano come un unico spazio operativo. Scrivi, organizzi, programmi, completi e misuri senza dover saltare tra mille app.',
  },
  {
    icon: Bot,
    title: 'FreeW.A.I.',
    text: "FreeW.A.I. puo aiutarti a trasformare un bisogno in proposte concrete dentro l'app: task, eventi, memo e sveglie. Prima vedi la proposta, poi decidi se modificarla o applicarla.",
  },
  {
    icon: HeartHandshake,
    title: 'Gratis per tutti',
    text: "L'app e gratuita perche deve restare uno strumento accessibile. Non promette risultati magici, non vende scorciatoie e non chiede pagamenti per usare le funzioni base.",
  },
];

const TERMS = [
  "Usando Freeway Life dichiari di aver letto e accettato questi termini di utilizzo per uso continuato dell'app.",
  "L'app non e un servizio medico, psicologico, legale, finanziario o clinico. Non sostituisce professionisti, diagnosi, terapie, consulenze o decisioni urgenti.",
  'Le informazioni inserite servono a personalizzare esperienza, routine, task, memo e suggerimenti. Non inserire dati sanitari, documenti, password, codici o informazioni troppo sensibili.',
  "L'utente resta responsabile di cio che salva, modifica, elimina, programma o applica tramite la chat e le altre funzioni.",
  "Le notifiche e le sveglie dipendono dal consenso del browser, dal dispositivo e dalle impostazioni dell'utente. Non sono garantite per emergenze o scadenze critiche.",
  'Le funzioni con AI possono sbagliare, semplificare troppo o proporre azioni non perfette. Controlla sempre prima di applicare.',
  "I dati possono essere salvati nel profilo dell'app e/o nel browser in base alla funzione usata. Se fai logout, reset, cancelli cache o cambi dispositivo alcune informazioni locali potrebbero non essere disponibili.",
  "E vietato usare l'app per attivita illegali, molestie, automazioni dannose, spam, raccolta abusiva di dati o contenuti che violano diritti di altri.",
  "L'app puo cambiare, migliorare o rimuovere funzioni nel tempo per stabilita, sicurezza o manutenzione.",
];

export default function AboutLegal() {
  return (
    <PageShell maxWidth="max-w-5xl" contentClassName="space-y-6">
      <section className="glass-panel overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/60">
              Freeway Life
            </p>
            <h1 className="mt-2 font-grotesk text-4xl font-black leading-none text-white sm:text-5xl">
              Una base operativa per vivere meno sparso.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
              Questa pagina riassume cosa fa l'app, perche e gratuita e quali regole accetti quando la usi.
              Niente promesse strane: solo chiarezza prima di costruire abitudini, lavoro e progetti giorno per giorno.
            </p>
          </div>
          <Link
            to="/"
            className="btn-cyber inline-flex h-11 items-center justify-center rounded-xl px-5 text-xs"
          >
            Torna alla Home
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {INFO_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <article key={block.title} className="glass-panel p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-emerald-400/10 text-emerald-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-grotesk text-xl font-bold text-white">{block.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/52">{block.text}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300/60">
                Termini e condizioni
              </p>
              <h2 className="font-grotesk text-2xl font-bold text-white">
                Contratto di utilizzo accettato con l'uso dell'app
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {TERMS.map((term, index) => (
              <div key={term} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-300/12 font-mono text-[10px] text-emerald-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm leading-relaxed text-white/58">{term}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-emerald-300" />
              <h2 className="font-grotesk text-xl font-bold text-white">Privacy semplice</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/54">
              Freeway Life non e costruita per rivendere informazioni personali. I dati servono a far funzionare
              le tue routine e le tue funzioni. Inserisci solo cio che vuoi davvero usare nell'app.
            </p>
          </div>

          <div className="glass-panel p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <h2 className="font-grotesk text-xl font-bold text-white">Regola base</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/54">
              Prima stabilita, poi grandezza. L'app aiuta a scegliere meglio, non a caricare altra pressione.
            </p>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
