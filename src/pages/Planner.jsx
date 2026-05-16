import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  buildPlannerTaskPayload,
  invalidateTaskViews,
  TASK_STATUS,
} from '@/lib/task-workflows';
import { getAntiChaosMessage } from '@/lib/day-by-day';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useUserProfile from '@/hooks/useUserProfile';
import XPReward from '@/components/shared/XPReward';
import TaskDescriptionAssistant from '@/components/tasks/TaskDescriptionAssistant';
import PageShell from '@/components/shared/PageShell';
import { Plus, Check, Trash2, BriefcaseBusiness, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newTaskType, setNewTaskType] = useState('task');
  const [antiChaosMessage, setAntiChaosMessage] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const { profile, addXP, incrementTasksCompleted } = useUserProfile();
  const queryClient = useQueryClient();

  const { data: taskResponse = [], isLoading } = useQuery({
    queryKey: ['tasks', activeTab],
    queryFn: () => accountData.tasks.filter({ status: activeTab }, '-created_date', 50),
  });
  const tasks = normalizeList(taskResponse);

  const createMutation = useMutation({
    mutationFn: (data) => accountData.tasks.create(data),
    onSuccess: () => {
      invalidateTaskViews(queryClient);
      setNewTitle('');
      setNewDescription('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (task) => {
      await accountData.tasks.update(task.id, { status: TASK_STATUS.done });
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
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => accountData.tasks.delete(id),
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: ({ id, description }) => accountData.tasks.update(id, { description }),
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const warning = activeTab === TASK_STATUS.today
      ? getAntiChaosMessage(tasks, {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        status: activeTab,
        task_type: newTaskType,
      })
      : '';

    if (warning) {
      setAntiChaosMessage(warning);
      return;
    }

    setAntiChaosMessage('');
    createMutation.mutate(buildPlannerTaskPayload({
      title: newTitle.trim(),
      description: newDescription.trim() || (newTaskType === 'work' ? 'Turno di lavoro' : 'Nessuna descrizione'),
      priority: newPriority,
      status: activeTab,
      start_time: newStartTime,
      end_time: newEndTime,
      task_type: newTaskType,
    }));
  };

  const mutationError = [
    createMutation.error,
    completeMutation.error,
    deleteMutation.error,
    updateDescriptionMutation.error,
  ].find(Boolean);

  return (
    <PageShell maxWidth="max-w-4xl" contentClassName="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-grotesk font-bold text-foreground">
          Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organizza le tue missioni</p>
      </motion.div>

      <div className="glass grid grid-cols-4 gap-1 rounded-2xl p-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-11 rounded-xl px-2 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === tab.value
                ? 'bg-emerald-300 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'done' && (
        <motion.form
          onSubmit={handleAdd}
          className="glass-panel p-4 md:p-5 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setAntiChaosMessage('');
              }}
              placeholder="Nuovo task..."
              className="h-11 flex-1 rounded-xl border-white/10 bg-black/25"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newTitle.trim() || createMutation.isPending}
              className="h-11 w-11 shrink-0"
              aria-label="Aggiungi task"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrizione (se vuota la compilo io)..."
            className="h-11 rounded-xl border-white/10 bg-black/25"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                value={newStartTime}
                onChange={(event) => setNewStartTime(event.target.value)}
                className="min-w-0 w-full bg-transparent font-mono text-sm text-foreground outline-none"
                aria-label="Ora inizio"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                value={newEndTime}
                onChange={(event) => setNewEndTime(event.target.value)}
                className="min-w-0 w-full bg-transparent font-mono text-sm text-foreground outline-none"
                aria-label="Ora fine"
              />
            </label>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Bassa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Critica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newTaskType} onValueChange={setNewTaskType}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="work">
                  <span className="inline-flex items-center gap-2">
                    <BriefcaseBusiness className="w-3.5 h-3.5" />
                    Lavoro
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.form>
      )}

      {antiChaosMessage && (
        <div className="rounded-xl border border-orange-300/30 bg-orange-400/10 p-3 text-sm text-orange-50/80">
          {antiChaosMessage}
        </div>
      )}

      {mutationError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mutationError.message || 'Operazione non riuscita. Riprova.'}
        </div>
      )}

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
                className="glass rounded-2xl p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </p>
                    {(task.start_time || task.end_time || task.task_type === 'work') && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate mt-1">
                        {task.start_time || '--:--'} - {task.end_time || '--:--'}
                        {task.task_type === 'work' ? ' - Lavoro' : ''}
                      </p>
                    )}
                    <TaskDescriptionAssistant
                      task={task}
                      sourceLabel="planner"
                      isSaving={updateDescriptionMutation.isPending && updateDescriptionMutation.variables?.id === task.id}
                      onSaveDescription={(currentTask, description) =>
                        updateDescriptionMutation.mutateAsync({ id: currentTask.id, description })}
                    />
                  </div>

                  <span className="pt-1 text-xs font-mono text-primary/60 shrink-0">
                    +{task.xp_value || 25}
                  </span>

                  <div className="flex items-center gap-1 opacity-100">
                    {task.status !== 'done' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        disabled={completeMutation.isPending}
                        onClick={() => completeMutation.mutate(task)}
                        title="Completa task"
                        aria-label={`Completa ${task.title}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(task.id)}
                      title="Elimina task"
                      aria-label={`Elimina ${task.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
    </PageShell>
  );
}
