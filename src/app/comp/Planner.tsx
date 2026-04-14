'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // <-- ECCO LA MODIFICA!
import { 
  ClipboardList, Trash2, AlertTriangle, User, Plus, X, Clock, ChevronDown, ChevronUp, CheckCircle2
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

  const today = startOfDay(new Date());

  useEffect(() => { 
    fetchTasks(); 
    fetchUsers(); 
  }, []);

  const notifyCalendar = () => window.dispatchEvent(new Event('refreshCalendar'));

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('id, email, username, full_name'); 
    if (error) console.error("Errore fetch users:", error);
    if (!error && data) setUsers(data);
  }

  async function fetchTasks() {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) console.error("Errore fetch tasks:", error);
    setTasks(data || []);
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
    
    // GESTIONE SICURA REFERENTI (dalla versione NEW)
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

      const { error } = editingId 
        ? await supabase.from('tasks').update(payload).eq('id', editingId)
        : await supabase.from('tasks').insert([{ ...payload, status: 'todo' }]);

      if (error) throw error;

      resetForm();
      await fetchTasks(); 
      notifyCalendar();
    } catch (err: any) {
      console.error("DB_ERROR:", err);
      alert(`ERRORE: ${err.message || 'Impossibile salvare il task.'}`);
    } finally {
      setIsAdding(false);
    }
  }

  const toggleAssignee = (id: string) => {
    if (id === "") return setAssigneeIds([]);
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderAssignedNames = (ids: any) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) return 'CHIUNQUE';
    return users.filter(u => ids.includes(u.id)).map(u => u.username || u.email.split('@')[0]).join(', ') || 'CHIUNQUE';
  }

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-[#FF914D] text-black font-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const TaskRow = ({ task, index }: { task: any, index: number }) => {
    const isOverdue = task.deadline && isBefore(new Date(task.deadline), today) && task.status !== 'done';
    return (
      <tr key={task.id} onClick={() => handleEditClick(task)} className="border-b border-white/5 hover:bg-white/[0.05] group cursor-pointer transition-colors">
        <td className="p-3 pl-6 text-[8px] font-mono text-zinc-800 border-r border-white/5">{index + 1}</td>
        
        <td className="p-3 border-r border-white/5">
          <div className={`text-[10px] font-bold uppercase italic ${task.status === 'done' ? 'line-through text-zinc-700' : 'text-zinc-200'}`}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-[8px] font-mono text-zinc-500 mt-0.5 truncate max-w-[150px]">{task.description}</div>
          )}
        </td>

        <td className="p-3 border-r border-white/5 text-[9px] font-mono text-zinc-500 text-center uppercase">
          {renderAssignedNames(task.assigned_to)}
        </td>
        
        <td className="p-1 border-r border-white/5">
          <button onClick={(e) => { e.stopPropagation(); updateStatus(task.id, task.status); }} className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase italic transition-all ${task.status === 'done' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
            {task.status === 'done' ? 'COMPLETATO' : 'IN CORSO'}
          </button>
        </td>
        
        <td className="p-1 border-r border-white/5">
          <div className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase text-center italic ${getPriorityStyle(task.priority)}`}>{task.priority}</div>
        </td>
        
        <td className="p-3 text-center border-r border-white/5">
          <div className={`text-[9px] font-mono flex flex-col items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
            <span>{task.deadline ? format(new Date(task.deadline), 'dd/MM/yy') : '--/--/--'}</span>
            {isOverdue && <AlertTriangle size={10} className="animate-pulse" />}
          </div>
        </td>

        <td className="p-3 text-center">
          <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-red-500/80 hover:text-red-500 hover:scale-110 transition-all p-1 bg-red-500/10 rounded mx-auto block">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  };

  async function updateStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks(); notifyCalendar();
  }

  async function deleteTask(id: string) {
    if(!confirm("ELIMINARE TASK DEFINITIVAMENTE?")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks(); notifyCalendar();
  }

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-xl">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#FF914D]" size={18} />
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">Planner Hub:</h2>
        </div>
        <button onClick={() => showForm ? resetForm() : setShowForm(true)} className={`p-1.5 rounded transition-all ${showForm ? 'bg-red-500/10 text-red-500' : 'bg-[#FF914D] text-black hover:scale-105'}`}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleSubmit} className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4 overflow-hidden">
            {editingId && <span className="text-[8px] font-bold text-[#FF914D] animate-pulse">MODIFICA IN CORSO...</span>}
            
            <input type="text" placeholder="TITOLO ATTIVITÀ" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-zinc-900/50 border border-white/5 p-3 rounded-lg font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40" />
            
            <div>
              <span className="text-[8px] text-zinc-500 font-mono uppercase mb-2 block">Referenti</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleAssignee("")} className={`px-3 py-1.5 rounded-full text-[9px] font-mono border transition-all ${assigneeIds.length === 0 ? 'bg-[#FF914D] text-black font-bold border-[#FF914D]' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>CHIUNQUE</button>
                {users.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`px-3 py-1.5 rounded-full text-[9px] font-mono border transition-all ${assigneeIds.includes(u.id) ? 'bg-emerald-500 text-black font-bold border-emerald-500' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>
                    {(u.username || u.email.split('@')[0]).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded-lg font-mono text-[10px] text-zinc-300 outline-none focus:border-[#FF914D]/40" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded-lg font-mono text-[10px] text-zinc-300 outline-none focus:border-[#FF914D]/40" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded-lg font-mono text-[10px] text-zinc-300 outline-none focus:border-[#FF914D]/40" />
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded-lg font-mono text-[10px] text-zinc-300 outline-none focus:border-[#FF914D]/40">
                <option value="low">BASSA</option><option value="medium">MEDIA</option><option value="high">ALTA</option>
              </select>
            </div>

            <textarea placeholder="NOTE AGGIUNTIVE..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 p-3 rounded-lg font-mono text-[10px] text-white outline-none min-h-[60px]" />

            <button type="submit" disabled={isAdding} className={`w-full py-3 rounded-lg font-black uppercase italic text-xs transition-all shadow-lg ${editingId ? 'bg-emerald-500 text-black' : 'bg-[#FF914D] text-black hover:bg-white'}`}>
              {isAdding ? 'SYNCING...' : editingId ? 'UPDATE_TASK' : 'PUSH_TASK'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="text-[8px] font-mono text-zinc-600 uppercase border-b border-white/5 tracking-widest">
              <th className="p-3 pl-6 w-10">#</th>
              <th className="p-3">Attività</th>
              <th className="p-3 text-center">Referente</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Prio</th>
              <th className="p-3 text-center">Data</th>
              <th className="p-3 text-center w-10">Del</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 font-mono text-[10px] text-[#FF914D] animate-pulse">SYNCING_DATA...</td></tr>
            ) : activeTasks.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-zinc-600 text-[10px] font-mono uppercase">Nessuna attività in corso</td></tr>
            ) : (
              activeTasks.map((task, idx) => <TaskRow key={task.id} task={task} index={idx} />)
            )}
          </tbody>
        </table>
      </div>

      {completedTasks.length > 0 && (
        <div className="border-t border-white/5">
          <button onClick={() => setShowCompleted(!showCompleted)} className="w-full p-3 flex items-center justify-between bg-zinc-900/20 text-zinc-500 hover:bg-zinc-900/40 transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Completate ({completedTasks.length})
            </span>
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-black/30">
                <table className="w-full text-left min-w-[700px]">
                  <tbody>{completedTasks.map((task, idx) => <TaskRow key={task.id} task={task} index={idx} />)}</tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}