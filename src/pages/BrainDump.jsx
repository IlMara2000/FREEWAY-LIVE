import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useUserProfile from '@/hooks/useUserProfile';
import XPReward from '@/components/shared/XPReward';
import { Brain, Send, Trash2, ArrowRight, Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function BrainDump() {
  const [text, setText] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const { profile, addXP } = useUserProfile();
  const queryClient = useQueryClient();

  const { data: dumpResponse = [] } = useQuery({
    queryKey: ['braindumps'],
    queryFn: () => accountData.tasks.filter({ is_brain_dump: true }, '-created_date', 30),
  });
  const dumps = normalizeList(dumpResponse);

  const createMutation = useMutation({
    mutationFn: async (title) => {
      await accountData.tasks.create({
        title,
        is_brain_dump: true,
        status: 'inbox',
        xp_value: 10,
      });
      // Small XP reward for brain dumping
      const result = await addXP(10);
      setRewardData({
        amount: 10,
        levelUp: result?.leveledUp || false,
        newLevel: result?.newLevel || (profile?.level || 1),
      });
      setShowReward(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['braindumps'] });
      setText('');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (id) => accountData.tasks.update(id, { status: 'today', is_brain_dump: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['braindumps'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => accountData.tasks.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['braindumps'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    createMutation.mutate(text.trim());
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-grotesk font-bold text-foreground flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          Brain Dump
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scarica ogni pensiero. Non giudicare, scrivi e basta.
        </p>
      </motion.div>

      {/* Input area */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 space-y-3"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cosa ti frulla in testa? Scrivi tutto qui..."
          className="bg-transparent border-none resize-none text-foreground placeholder:text-muted-foreground/50 min-h-[100px] focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            +10 XP per ogni dump
          </span>
          <Button type="submit" disabled={!text.trim()} className="gap-2">
            <Send className="w-4 h-4" />
            Dump
          </Button>
        </div>
      </motion.form>

      {/* Dump list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {dumps.map((dump) => (
            <motion.div
              key={dump.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="glass rounded-xl p-4 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-sm text-foreground flex-1">{dump.title}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:bg-primary/10"
                    onClick={() => promoteMutation.mutate(dump.id)}
                    title="Promuovi a task"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(dump.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono ml-4">
                {new Date(dump.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {dumps.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Il tuo cervello è vuoto? Impossibile. Dump something!</p>
          </div>
        )}
      </div>

      <XPReward
        amount={rewardData.amount}
        show={showReward}
        onComplete={() => setShowReward(false)}
        levelUp={rewardData.levelUp}
        newLevel={rewardData.newLevel}
      />
    </div>
  );
}
