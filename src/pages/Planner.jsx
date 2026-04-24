import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useUserProfile from '@/hooks/useUserProfile';
import XPReward from '@/components/shared/XPReward';
import { Plus, Check, Trash2, ChevronDown, Calendar, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIORITY_COLORS = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-chart-5',
  critical: 'bg-destructive',
};

const STATUS_TABS = [
  { value: 'today', label: 'Oggi' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'scheduled', label: 'Pianificati' },
  { value: 'done', label: 'Fatti' },
];

export default function Planner() {
  const [activeTab, setActiveTab] = useState('today');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const { profile, addXP, incrementTasksCompleted } = useUserProfile();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', activeTab],
    queryFn: () => base44.entities.Task.filter({ status: activeTab }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (task) => {
      await base44.entities.Task.update(task.id, { status: 'done' });
      const xp = task.xp_value || 25;
      const result = await addXP(xp);
      await incrementTasksCompleted();
      setRewardData({
        amount: xp,
        levelUp: result?.leveledUp || false,
        newLevel: result?.newLevel || (profile?.level || 1),
      });
      setShowReward(true);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      priority: newPriority,
      status: activeTab === 'done' ? 'today' : activeTab,
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-grotesk font-bold text-foreground">
          Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organizza le tue missioni</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add task form */}
      {activeTab !== 'done' && (
        <motion.form
          onSubmit={handleAdd}
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nuovo task..."
            className="flex-1 bg-secondary border-none h-11"
          />
          <Select value={newPriority} onValueChange={setNewPriority}>
            <SelectTrigger className="w-28 bg-secondary border-none h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Bassa</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Critica</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0">
            <Plus className="w-5 h-5" />
          </Button>
        </motion.form>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {activeTab === 'done' ? 'Nessun task completato ancora' : 'Nessun task qui. Aggiungine uno!'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="glass rounded-xl p-4 flex items-center gap-3 group"
              >
                {/* Priority dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                  )}
                </div>

                {/* XP badge */}
                <span className="text-xs font-mono text-primary/60 shrink-0">
                  +{task.xp_value || 25}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status !== 'done' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => completeMutation.mutate(task)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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