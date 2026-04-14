'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, Trash2, AlertTriangle, Plus, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Planner() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  
  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    await supabase.from('tasks').insert([{ title: title.toUpperCase(), status: 'todo' }]);
    setTitle('');
    setShowForm(false);
    fetchTasks();
    window.dispatchEvent(new Event('refreshCalendar'));
  }

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-xl">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#FF914D]" size={18} />
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">Planner Hub</h2>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#FF914D] p-1.5 rounded text-black">
          {showForm ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-white/[0.02] flex flex-col gap-3">
          <input 
            type="text" placeholder="TITOLO ATTIVITÀ" value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 p-3 rounded-lg font-mono text-[10px] text-white outline-none"
          />
          <button type="submit" className="w-full py-3 bg-[#FF914D] text-black font-black uppercase italic text-xs rounded-lg">
            PUSH_TASK
          </button>
        </form>
      )}

      <div className="p-4 text-zinc-500 font-mono text-[10px]">
        {loading ? "SYNCING..." : tasks.length === 0 ? "NESSUNA ATTIVITÀ" : `ATTIVITÀ TOTALI: ${tasks.length}`}
        {tasks.map(t => (
          <div key={t.id} className="mt-2 p-3 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
            <span className="text-zinc-200 uppercase italic font-bold">{t.title}</span>
            <button onClick={async () => { await supabase.from('tasks').delete().eq('id', t.id); fetchTasks(); }} className="text-red-500"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}