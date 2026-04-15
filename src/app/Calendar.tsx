'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
    
    const { data: tasks } = await supabase.from('tasks').select('*').gte('deadline', start).lte('deadline', end);
    const { data: activities } = await supabase.from('activities').select('*').gte('deadline', start).lte('deadline', end);
    
    const formattedTasks = (tasks || []).map((t: any) => ({ ...t, eventType: 'task' }));
    const formattedActivities = (activities || []).map((a: any) => ({ ...a, eventType: 'activity' }));
    
    setEvents([...formattedTasks, ...formattedActivities]);
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
    window.addEventListener('refreshCalendar', fetchEvents);
    return () => window.removeEventListener('refreshCalendar', fetchEvents);
  }, [fetchEvents]);

  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(startOfMonth(currentMonth)), 
    end: endOfWeek(endOfMonth(currentMonth)) 
  });

  return (
    <div className="glass-panel overflow-hidden rounded-3xl border border-white/5 shadow-xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-emerald-500" size={16} />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-zinc-500 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-zinc-500 hover:text-white transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="p-4">
        {/* Intestazione giorni settimana */}
        <div className="grid grid-cols-7 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(d => (
            <div key={d} className="text-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        {/* Griglia Giorni (Senza bordi pesanti) */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayEvents = events.filter(e => e.deadline && isSameDay(new Date(e.deadline), day));

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[50px] p-1.5 rounded-xl transition-all cursor-pointer relative flex flex-col items-center
                  ${!isCurrentMonth ? 'opacity-30' : 'hover:bg-white/5'}
                  ${isSelected ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/50' : ''}
                `}
              >
                <span className={`text-[10px] font-mono ${isToday ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-auto flex flex-wrap gap-0.5 justify-center w-full">
                  {dayEvents.map((e, idx) => (
                    <div key={idx} className={`w-1 h-1 rounded-full ${e.eventType === 'activity' ? 'bg-blue-400' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]'}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}