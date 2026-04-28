import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, LogOut, Save, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] } },
};

export default function Account() {
  const { user, updateAccount, logout } = useAuth();
  const metadata = user?.user_metadata || {};
  const initialUsername = metadata.username || metadata.name || metadata.full_name || '';
  const initialAvatar = metadata.avatar_url || metadata.picture || '';
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const initials = useMemo(() => {
    const label = username || user?.email || 'FL';
    return label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FL';
  }, [username, user?.email]);

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const { error } = await updateAccount({
      username: username.trim(),
      name: username.trim(),
      full_name: username.trim(),
      avatar_url: avatarUrl.trim(),
      picture: avatarUrl.trim(),
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('saved');
    setMessage('Profilo aggiornato.');
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen p-4 md:p-8 max-w-lg mx-auto flex flex-col gap-6"
    >
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-grotesk font-black text-2xl text-white text-glow">
            Account
          </h1>
          <p className="font-mono text-xs text-emerald-400/60 tracking-widest uppercase">
            profilo
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-emerald">
          <UserRound className="w-5 h-5 text-primary" />
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-panel p-5 space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-emerald-400/25 bg-white/5">
            <AvatarImage src={avatarUrl} alt={username || 'Foto profilo'} />
            <AvatarFallback className="bg-emerald-400/10 text-emerald-200 font-grotesk text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-grotesk text-lg font-bold text-white truncate">
              {username || 'Il tuo profilo'}
            </p>
            <p className="text-xs text-white/40 truncate">
              {user?.email || 'Account Google'}
            </p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400/60">
            username
          </span>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Scegli un username"
            className="h-12 rounded-xl border-white/10 bg-white/5 text-white"
          />
        </label>

        <label className="block space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400/60">
            foto profilo
          </span>
          <div className="relative">
            <Camera className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <Input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
              className="h-12 rounded-xl border-white/10 bg-white/5 pl-10 text-white"
            />
          </div>
        </label>

        {message && (
          <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
            status === 'error'
              ? 'border-red-400/25 bg-red-500/10 text-red-100'
              : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
          }`}
          >
            {status === 'saved' && <Check className="h-4 w-4" />}
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Button
            type="submit"
            disabled={status === 'saving'}
            className="h-12 rounded-xl btn-cyber"
          >
            <Save className="w-4 h-4" />
            {status === 'saving' ? 'Salvo...' : 'Salva'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={logout}
            className="h-12 rounded-xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
