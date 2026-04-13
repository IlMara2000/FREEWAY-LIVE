'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);

  const fetchEvents = useCallback(async () => {
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();
    
    // 1. Fetch delle Task dal Planner
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);
    
    // 2. Fetch delle Activities dal NewActivityForm
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);
    
    if (tasksError) console.error("Tasks fetch error:", tasksError);
    if (activitiesError) console.error("Activities fetch error:", activitiesError);

    // Uniamo i due set di dati aggiungendo un flag "eventType" per distinguerli
    const formattedTasks = (tasks || []).map(t => ({ ...t, eventType: 'task' }));
    const formattedActivities = (activities || []).map(a => ({ ...a, eventType: 'activity' }));

    setEvents([...formattedTasks, ...formattedActivities]);
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
    // Listener per aggiornare in automatico quando Planner o ActivityForm salvano
    window.addEventListener('refreshCalendar', fetchEvents);
    return () => window.removeEventListener('refreshCalendar', fetchEvents);
  }, [fetchEvents]);

  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(startOfMonth(currentMonth)), 
    end: endOfWeek(endOfMonth(currentMonth)) 
  });

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-3xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#FF914D]" size={18} />
          <h2 className="text-[10px] font-black uppercase italic text-white tracking-widest">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all text-white"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all text-white"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5">
        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(d => (
          <div key={d} className="text-center text-[7px] font-mono text-zinc-600 uppercase py-3 bg-black">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const dayEvents = events.filter(e => e.deadline && isSameDay(new Date(e.deadline), day));

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[70px] p-2 transition-all cursor-pointer relative bg-black hover:bg-zinc-900/50
                ${!isCurrentMonth ? 'opacity-20' : ''}
                ${isSelected ? 'bg-zinc-900 ring-1 ring-inset ring-[#FF914D]/30' : ''}
              `}
            >
              <span className={`text-[9px] font-mono ${isSameDay(day, new Date()) ? 'text-[#FF914D] font-bold underline' : 'text-zinc-500'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayEvents.map((e, idx) => {
                  let dotClass = 'bg-[#FF914D]'; 
                  if (e.eventType === 'task' && e.status === 'done') dotClass = 'bg-emerald-500';
                  if (e.eventType === 'activity') dotClass = 'bg-white';

                  return <div key={idx} className={`w-1 h-1 rounded-full ${dotClass}`} title={e.title} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-zinc-900/40 border-t border-white/5">
        <p className="text-[8px] font-mono text-zinc-600 uppercase mb-3">Focus_Day: {format(selectedDate, 'dd/MM')}</p>
        <div className="space-y-3">
          {events.filter(e => e.deadline && isSameDay(new Date(e.deadline), selectedDate)).map((e, idx) => {
            let barClass = 'bg-[#FF914D]'; 
            if (e.eventType === 'task' && e.status === 'done') barClass = 'bg-emerald-500';
            if (e.eventType === 'activity') barClass = 'bg-white';

            return (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-4 rounded-full ${barClass}`} />
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase italic ${e.eventType === 'activity' ? 'text-white' : 'text-zinc-300'}`}>
                      {e.title}
                    </span>
                    <span className="text-[7px] font-mono text-zinc-500 tracking-widest uppercase">
                      {e.eventType === 'activity' ? 'ACT_UNIT' : 'TSK_UNIT'}
                    </span>
                  </div>
                </div>
                
                {/* RENDER DELLA DESCRIZIONE SE ESISTE */}
                {e.description && (
                  <div className="pl-4 ml-0.5 border-l border-white/10 mt-1">
                    <p className="text-[9px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {e.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {events.filter(e => e.deadline && isSameDay(new Date(e.deadline), selectedDate)).length === 0 && (
            <p className="text-[8px] font-mono text-zinc-800 italic uppercase text-center py-4">No_Operations</p>
          )}
        </div>
      </div>
    </div>
  );
}
