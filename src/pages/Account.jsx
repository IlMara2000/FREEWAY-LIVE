import React, { useMemo, useState } from 'react';
import { Camera, Check, ImagePlus, LogOut, RotateCcw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import useUserProfile from '@/hooks/useUserProfile';
import PageShell from '@/components/shared/PageShell';

const readImageAsAvatar = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const size = 220;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const sourceSize = Math.min(image.width, image.height);
      const sourceX = (image.width - sourceSize) / 2;
      const sourceY = (image.height - sourceSize) / 2;

      canvas.width = size;
      canvas.height = size;
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      resolve(canvas.toDataURL('image/webp', 0.76));
    };
    image.onerror = () => reject(new Error('Immagine non leggibile.'));
    image.src = reader.result;
  };

  reader.onerror = () => reject(new Error('Caricamento immagine non riuscito.'));
  reader.readAsDataURL(file);
});

const isLocalAvatarData = (value) => typeof value === 'string' && value.startsWith('data:image/');
const getAvatarStorageKey = (userId) => `fw_account_avatar_${userId || 'guest'}`;
const getStoredAvatar = (userId) => {
  try {
    return localStorage.getItem(getAvatarStorageKey(userId)) || '';
  } catch {
    return '';
  }
};
const saveStoredAvatar = (userId, value) => {
  try {
    if (value) {
      localStorage.setItem(getAvatarStorageKey(userId), value);
    }
  } catch {
    // Avatar sync is optional; the account page must stay usable.
  }
};

export default function Account() {
  const { user, updateAccount, logout } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const metadata = user?.user_metadata || {};
  const initialUsername = metadata.username || metadata.name || metadata.full_name || '';
  const remoteAvatar = metadata.avatar_url || metadata.picture || '';
  const safeRemoteAvatar = isLocalAvatarData(remoteAvatar) ? '' : remoteAvatar;
  const initialAvatar = getStoredAvatar(user?.id) || safeRemoteAvatar;
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const initials = useMemo(() => {
    const label = username || user?.email || 'FWL';
    return label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FWL';
  }, [username, user?.email]);

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    if (avatarDirty && isLocalAvatarData(avatarUrl)) {
      saveStoredAvatar(user?.id, avatarUrl);
    }

    const { error } = await updateAccount({
      username: username.trim(),
      name: username.trim(),
      full_name: username.trim(),
      avatar_url: safeRemoteAvatar || null,
      picture: safeRemoteAvatar || null,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('saved');
    setAvatarDirty(false);
    setMessage('Profilo aggiornato.');
  };

  const handleAvatarChange = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setMessage('Scegli un file immagine valido.');
      return;
    }

    try {
      setStatus('idle');
      setMessage('');
      const nextAvatar = await readImageAsAvatar(file);
      setAvatarUrl(nextAvatar);
      setAvatarDirty(true);
      setMessage('Foto pronta. Premi Salva per confermare.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleResetOnboarding = async () => {
    if (!profile) return;

    setStatus('saving');
    setMessage('');

    try {
      await saveProfile({
        ...profile,
        initial_onboarding: null,
        day_by_day: {
          ...(profile.day_by_day || {}),
          configured: false,
        },
      });
      setStatus('saved');
      setMessage('Onboarding resettato. Ricompare adesso per rifare privacy e calibrazione.');
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Reset onboarding non riuscito.');
    }
  };

  return (
    <PageShell maxWidth="max-w-lg" contentClassName="flex flex-col gap-6">
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

        <input
          id="profile-photo-input"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />

        <label
          htmlFor="profile-photo-input"
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <ImagePlus className="w-4 h-4" />
          Carica foto profilo
        </label>

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

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
          <Camera className="h-4 w-4 shrink-0 text-emerald-400/50" />
          <span>La nuova foto viene applicata quando premi Salva.</span>
        </div>

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

      <section className="glass-panel p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <h2 className="font-grotesk text-lg font-bold text-white">
              Privacy e calibrazione
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/45">
              Le risposte iniziali servono solo a personalizzare routine, task e tono dell app.
              Puoi rifarle quando vuoi: al reset ti verra' chiesto di firmare di nuovo.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleResetOnboarding}
          disabled={!profile || status === 'saving'}
          className="h-11 w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          Rifai onboarding e privacy
        </Button>
      </section>
    </PageShell>
  );
}
