import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { requestTaskDescriptionSuggestion } from '@/api/groqTaskAssistant';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TaskDescriptionAssistant({
  task,
  sourceLabel = 'task',
  onSaveDescription,
  isSaving = false,
}) {
  const [draft, setDraft] = useState(task?.description || '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(task?.description || '');
  }, [task?.description, task?.id]);

  const hasChanges = useMemo(
    () => draft.trim() !== (task?.description || '').trim(),
    [draft, task?.description]
  );

  const canAskGroq = Boolean((task?.title || draft).trim()) && !isEnhancing;
  const descriptionRows = useMemo(
    () => Math.min(9, Math.max(3, Math.ceil(draft.length / 42))),
    [draft]
  );

  const saveDescription = async (nextDescription = draft) => {
    setError('');
    try {
      await onSaveDescription(task, nextDescription.trim());
    } catch (saveError) {
      setError(saveError?.message || 'Non riesco a salvare la descrizione.');
      throw saveError;
    }
  };

  const requestSuggestion = async () => {
    setConfirmOpen(false);
    setError('');
    setIsEnhancing(true);

    try {
      const result = await requestTaskDescriptionSuggestion({
        ...task,
        description: draft,
        source: sourceLabel,
      });
      setSuggestion(result.suggestion || '');
      setSuggestionOpen(true);
    } catch (requestError) {
      setError(requestError?.message || 'Groq non ha generato una descrizione.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const applySuggestion = async () => {
    await saveDescription(suggestion);
    setDraft(suggestion);
    setSuggestionOpen(false);
  };

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={descriptionRows}
        placeholder="Aggiungi una descrizione operativa..."
        aria-label={`Descrizione ${task?.title || sourceLabel}`}
        className="min-h-[116px] resize-none border-white/10 bg-white/[0.03] text-sm text-foreground placeholder:text-muted-foreground/55 focus-visible:ring-primary/40"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!hasChanges || isSaving}
          onClick={() => saveDescription()}
          className="h-8 px-3"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salva descrizione
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canAskGroq || isSaving}
          onClick={() => setConfirmOpen(true)}
          className="h-8 px-3 border-primary/35 text-primary hover:bg-primary/10"
        >
          {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Migliora con Groq
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive/90">{error}</p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-primary/20 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Inviare questa task a Groq?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno inviati a Groq titolo, descrizione, priorita e stato della task per generare una descrizione migliore.
              Il suggerimento non verra applicato finche non lo confermi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={requestSuggestion}>
              Invia a Groq
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
        <DialogContent className="border-primary/20 bg-background">
          <DialogHeader>
            <DialogTitle>Descrizione proposta</DialogTitle>
            <DialogDescription>
              Controlla il testo generato. Lo salvo nella task solo se premi Applica.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            className="min-h-[180px] resize-none border-white/10 bg-white/[0.03] text-sm leading-relaxed"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSuggestionOpen(false)}>
              Scarta
            </Button>
            <Button
              type="button"
              disabled={!suggestion.trim() || isSaving}
              onClick={applySuggestion}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Applica descrizione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
