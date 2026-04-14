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
    
    // MODIFICA QUI: Aggiunto (t: any) e (a: any) per far felice TypeScript
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
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-3xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#FF914D]" size={18} />
          <h2 className="text-[10px] font-black uppercase italic text-white tracking-widest">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-white"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-white"><ChevronRight size={16} /></button>
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
                {dayEvents.map((e, idx) => (
                  <div key={idx} className={`w-1 h-1 rounded-full ${e.eventType === 'activity' ? 'bg-white' : 'bg-[#FF914D]'}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}