'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ClipboardList, Trash2, Plus, X, ChevronDown, ChevronUp, CheckCircle2, Circle, Zap, Loader2
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Planner() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); 
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState(''); 
  const [endDate, setEndDate] = useState('');   
  const [time, setTime] = useState('');         
  const [isAdding, setIsAdding] = useState(false);
  
  // Stato per capire quale task sta venendo "affettato" dall'IA
  const [splittingId, setSplittingId] = useState<string | null>(null);

  const today = startOfDay(new Date());

  useEffect(() => { 
    fetchTasks(); 
    fetchUsers(); 
  }, []);

  const notifyCalendar = () => window.dispatchEvent(new Event('refreshCalendar'));

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('id, email, username, full_name'); 
    if (!error && data) setUsers(data);
  }

  async function fetchTasks() {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (!error) setTasks(data || []);
    setLoading(false);
  }

  const activeTasks = tasks.filter(t => t.status === 'todo');
  const completedTasks = tasks.filter(t => t.status === 'done');

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDescription(''); setAssigneeIds([]);
    setDeadline(''); setEndDate(''); setTime(''); setPriority('medium');
    setShowForm(false);
  };

  const handleEditClick = (task: any) => {
    setEditingId(task.id);
    setTitle(task.title || '');
    setDescription(task.description || '');
    let val = task.assigned_to;
    setAssigneeIds(Array.isArray(val) ? val : (typeof val === 'string' && val !== '' ? val.split(',') : []));
    setDeadline(task.deadline || '');
    setEndDate(task.end_date || '');
    setTime(task.time || '');
    setPriority(task.priority || 'medium');
    setShowForm(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || isAdding) return;
    setIsAdding(true);
    
    try {
      const payload = {
        title: title.toUpperCase(), 
        description: description,
        assigned_to: assigneeIds.length > 0 ? assigneeIds : null, 
        priority,
        deadline: deadline || null,
        end_date: endDate || null,
        time: time || null,
      };

      if (editingId) {
        await supabase.from('tasks').update(payload).eq('id', editingId);
      } else {
        await supabase.from('tasks').insert([{ ...payload, status: 'todo' }]);
      }

      resetForm();
      await fetchTasks(); 
      notifyCalendar();
    } catch (err: any) {
      alert(`ERRORE: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  }

  // --- LA MAGIA DI GROQ (TASK SLICER) ---
  async function handleMagicSplit(task: any) {
    setSplittingId(task.id);
    try {
      const res = await fetch('/api/slicer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: task.title })
      });
      
      const data = await res.json();
      
      if (data.steps && data.steps.length > 0) {
        const newTasks = data.steps.map((step: string) => ({
          title: step.toUpperCase(),
          description: `Generato scomponendo: ${task.title}`,
          status: 'todo',
          priority: task.priority,
          deadline: task.deadline,
          assigned_to: task.assigned_to
        }));

        await supabase.from('tasks').insert(newTasks);
        await supabase.from('tasks').delete().eq('id', task.id);
        
        await fetchTasks();
        notifyCalendar();
      } else {
        alert("Ops, Groq non è riuscito a scomporre questo task.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione con l'IA.");
    } finally {
      setSplittingId(null);
    }
  }

  const toggleAssignee = (id: string) => {
    if (id === "") return setAssigneeIds([]);
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderAssignedNames = (ids: any) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) return 'CHIUNQUE';
    return users.filter(u => ids.includes(u.id)).map(u => u.username || u.email.split('@')[0]).join(', ') || 'CHIUNQUE';
  };

  const getPriorityDot = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
      case 'medium': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
      case 'low': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]';
      default: return 'bg-zinc-600';
    }
  };

  // Funzione unificata: Cambia stato sul DB e spara Punti XP Globali
  async function updateStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    
    // NUOVO: SE COMPLETATA, SPARA DOPAMINA (+10 XP)
    if (newStatus === 'done') {
      window.dispatchEvent(new CustomEvent('addXp', { detail: 10 }));
    }
    
    fetchTasks(); notifyCalendar();
  }

  async function deleteTask(id: string) {
    if(!confirm("ELIMINARE TASK DEFINITIVAMENTE?")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks(); notifyCalendar();
  }

  return (
    <div className="glass-panel bg-zinc-950/60 overflow-hidden rounded-3xl flex flex-col h-full border border-white/5 shadow-2xl">
      {/* HEADER */}
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <ClipboardList className="text-emerald-500" size={18} />
          </div>
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">Planner Hub</h2>
        </div>
        <button 
          onClick={() => showForm ? resetForm() : setShowForm(true)} 
          className={`p-2 rounded-xl transition-all ${showForm ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500 text-black hover:scale-105 shadow-lg shadow-emerald-500/20'}`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {/* FORM AGGIUNTA/MODIFICA */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            onSubmit={handleSubmit} 
            className="p-5 border-b border-white/5 bg-black/40 flex flex-col gap-4 overflow-hidden"
          >
            {editingId && <span className="text-[10px] font-bold text-emerald-400 animate-pulse">MODIFICA IN CORSO...</span>}
            
            <input type="text" placeholder="TITOLO ATTIVITÀ" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-zinc-900/80 border border-white/5 p-4 rounded-2xl font-sans text-sm text-white outline-none focus:border-emerald-500/50 transition-colors shadow-inner" />
            
            <div>
              <span className="text-[9px] text-zinc-500 font-mono uppercase mb-2 block tracking-wider">Referenti</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleAssignee("")} className={`px-4 py-2 rounded-xl text-[10px] font-mono border transition-all ${assigneeIds.length === 0 ? 'bg-blue-500 text-black font-bold border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800'}`}>CHIUNQUE</button>
                {users.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`px-4 py-2 rounded-xl text-[10px] font-mono border transition-all ${assigneeIds.includes(u.id) ? 'bg-emerald-500 text-black font-bold border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800'}`}>
                    {(u.username || u.email.split('@')[0]).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-300 outline-none focus:border-emerald-500/40" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-300 outline-none focus:border-emerald-500/40" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-300 outline-none focus:border-emerald-500/40" />
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-300 outline-none focus:border-emerald-500/40">
                <option value="low">PRIORITÀ BASSA</option><option value="medium">PRIORITÀ MEDIA</option><option value="high">PRIORITÀ ALTA</option>
              </select>
            </div>

            <textarea placeholder="NOTE AGGIUNTIVE..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-zinc-900/80 border border-white/5 p-4 rounded-2xl font-mono text-[10px] text-zinc-300 outline-none min-h-[80px] focus:border-emerald-500/40" />

            <button type="submit" disabled={isAdding} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${editingId ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
              {isAdding ? 'SINCRO IN CORSO...' : editingId ? 'AGGIORNA TASK' : 'AGGIUNGI TASK'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* LISTA TASK MODERNA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><span className="text-[10px] font-mono text-emerald-500 animate-pulse tracking-widest">CARICAMENTO DATI...</span></div>
        ) : activeTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600 opacity-50">
            <ClipboardList size={48} className="mb-4" />
            <span className="text-xs font-mono uppercase tracking-widest">Nessuna attività in corso</span>
          </div>
        ) : (
          <AnimatePresence>
            {activeTasks.map((task) => {
              const isOverdue = task.deadline && isBefore(new Date(task.deadline), today);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  key={task.id}
                  onClick={() => handleEditClick(task)}
                  className="group relative bg-black/40 border border-white/5 hover:border-emerald-500/30 p-4 rounded-2xl cursor-pointer transition-all hover:bg-zinc-900/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateStatus(task.id, task.status); }}
                      className="flex-shrink-0 text-zinc-600 hover:text-emerald-500 transition-colors"
                    >
                      <Circle size={22} strokeWidth={1.5} />
                    </button>

                    <div className="flex flex-col truncate">
                      <span className="text-sm font-semibold text-zinc-100 uppercase tracking-wide truncate">{task.title}</span>
                      <div className="flex items-center gap-3 mt-1">
                        {task.deadline && (
                          <span className={`text-[9px] font-mono ${isOverdue ? 'text-red-500 font-bold animate-pulse' : 'text-zinc-500'}`}>
                            {format(new Date(task.deadline), 'dd/MM/yy')}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                          {renderAssignedNames(task.assigned_to)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Tasto MAGICO Slicer (visibile in hover o sempre da mobile) */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMagicSplit(task); }} 
                      disabled={splittingId === task.id}
                      title="Scomponi con IA"
                      className="opacity-0 group-hover:opacity-100 p-2 text-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-all"
                    >
                      {splittingId === task.id ? (
                        <Loader2 size={16} className="animate-spin text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      ) : (
                        <Zap size={16} />
                      )}
                    </button>

                    {/* Pallino Priorità */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mx-2 ${getPriorityDot(task.priority)}`} />
                    
                    {/* Tasto Elimina (visibile in hover) */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* SEZIONE COMPLETATI */}
      {completedTasks.length > 0 && (
        <div className="border-t border-white/5 bg-zinc-950">
          <button onClick={() => setShowCompleted(!showCompleted)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Completate ({completedTasks.length})
            </span>
            {showCompleted ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
          </button>
          
          <AnimatePresence>
            {showCompleted && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-black/50 px-4 pb-4 space-y-2">
                {completedTasks.map((task) => (
                  <motion.div layout key={task.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl opacity-60">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateStatus(task.id, task.status)} className="text-emerald-500"><CheckCircle2 size={18} /></button>
                      <span className="text-xs line-through text-zinc-500 font-semibold uppercase">{task.title}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}