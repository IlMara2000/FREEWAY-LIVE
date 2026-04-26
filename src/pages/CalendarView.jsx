import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TaskModal from '@/components/calendar/TaskModal';
import CreateTaskModal from '@/components/calendar/CreateTaskModal';

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] } },
};

const DAYS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function CalendarView({ onStartTomato }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createDate, setCreateDate] = useState(null);

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('-due_date', 200),
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getTasksForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.due_date === dateStr || t.status === 'today' && !t.due_date && day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = getTasksForDay(day);
    setSelectedDay(day);
    if (dayTasks.length === 0) {
      setCreateDate(dateStr);
    }
  };

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen p-4 md:p-8 max-w-lg mx-auto flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-grotesk font-black text-2xl text-white text-glow">
            {MONTHS[month]}
          </h1>
          <p className="font-mono text-xs text-emerald-400/60 tracking-widest uppercase">{year}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-3">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center font-mono text-[10px] text-emerald-400/50 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dayTasks = getTasksForDay(day);
            const hasTask = dayTasks.length > 0;
            const active = isToday(day);

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                onClick={() => handleDayClick(day)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                  active
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : selectedDay === day
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className={`font-grotesk text-sm font-semibold ${active ? 'text-emerald-400' : 'text-white/80'}`}>
                  {day}
                </span>
                {hasTask && (
                  <div className="absolute bottom-1.5 flex gap-0.5">
                    {dayTasks.slice(0, 3).map((_, idx) => (
                      <div key={idx} className="w-1 h-1 rounded-full bg-emerald-400" />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tasks for selected day */}
      <AnimatePresence>
        {selectedDay && getTasksForDay(selectedDay).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-2"
          >
            <p className="font-mono text-[11px] text-emerald-400/60 uppercase tracking-widest px-1">
              Task — {selectedDay} {MONTHS[month]}
            </p>
            {getTasksForDay(selectedDay).map((task) => (
              <motion.button
                key={task.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedTask(task)}
                className="glass-panel w-full p-4 text-left hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'critical' ? 'bg-red-400' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'medium' ? 'bg-emerald-400' : 'bg-white/30'
                  }`} />
                  <span className="font-grotesk text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors flex-1 truncate">
                    {task.title}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400/60">+{task.xp_value || 25} XP</span>
                </div>
                {task.description && (
                  <p className="text-xs text-white/40 mt-2 ml-5 truncate">{task.description}</p>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onRefetch={refetch}
        onStartTomato={onStartTomato}
      />
      <CreateTaskModal
        date={createDate}
        onClose={() => setCreateDate(null)}
        onRefetch={refetch}
      />
    </motion.div>
  );
}
