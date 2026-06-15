import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useAuth } from '@/lib/AuthContext';
import useUserProfile from '@/hooks/useUserProfile';
import { accountData } from '@/api/accountDataClient';
import { invalidateFocusViews } from '@/lib/task-workflows';
import { FREEWAY_OS_SOUNDS, normalizeFreewayOS, patchFocusShield, patchSoundscape, patchTomatoTimer } from '@/lib/freeway-os';
import XPReward from '@/components/shared/XPReward';
import BrainDumpSheet from '@/components/tomato/BrainDumpSheet';
import { Brain, ChevronLeft, Gauge, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, scale: 0.992, transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] } },
};

const isFastTomatoTestEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_FAST_TOMATO_TEST === 'true';

const PRESETS = isFastTomatoTestEnabled
  ? [
      { label: '1s', minutes: 1, seconds: 1, xp: 30 },
      { label: '2s', minutes: 1, seconds: 2, xp: 50 },
      { label: '3s', minutes: 1, seconds: 3, xp: 90 },
      { label: '4s', minutes: 1, seconds: 4, xp: 120 },
    ]
  : [
      { label: '15', minutes: 15, xp: 30 },
      { label: '25', minutes: 25, xp: 50 },
      { label: '45', minutes: 45, xp: 90 },
      { label: '60', minutes: 60, xp: 120 },
    ];

const getPresetSeconds = (preset) => preset.seconds || preset.minutes * 60;

const getTomatoStorageKey = (accountId) => `fw_tomato_state_${accountId || 'guest'}`;

const getDefaultTimerState = (taskContext = null) => ({
  selectedPreset: 1,
  timeLeft: getPresetSeconds(PRESETS[1]),
  isRunning: false,
  isCompleted: false,
  endsAt: null,
  taskContext,
});

const normalizeTimerState = (value, taskContext = null) => {
  const selectedPreset = Number.isInteger(Number(value?.selectedPreset)) && PRESETS[Number(value.selectedPreset)]
    ? Number(value.selectedPreset)
    : 1;
  const totalSeconds = getPresetSeconds(PRESETS[selectedPreset]);
  const endsAt = Number.isFinite(Number(value?.endsAt)) ? Number(value.endsAt) : null;
  const isRunning = Boolean(value?.isRunning);
  const isCompleted = Boolean(value?.isCompleted);
  const baseTimeLeft = isRunning && endsAt
    ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    : Math.min(Math.max(Number(value?.timeLeft) || totalSeconds, 0), totalSeconds);

  return {
    selectedPreset,
    timeLeft: isCompleted ? 0 : baseTimeLeft,
    isRunning: isRunning && !isCompleted,
    isCompleted,
    endsAt,
    taskContext: value?.taskContext || taskContext,
    updatedAt: Number(value?.updatedAt) || 0,
  };
};

const readStoredTimerState = (accountId, taskContext = null) => {
  if (typeof window === 'undefined') return getDefaultTimerState(taskContext);

  try {
    const stored = JSON.parse(window.localStorage.getItem(getTomatoStorageKey(accountId)));
    if (!stored) return getDefaultTimerState(taskContext);
    return normalizeTimerState(stored, taskContext);
  } catch {
    return getDefaultTimerState(taskContext);
  }
};

const readProfileTimerState = (freewayOS, taskContext = null) => {
  const remoteState = normalizeFreewayOS(freewayOS).tomatoTimer;
  if (!remoteState) return null;
  return normalizeTimerState(remoteState, taskContext);
};

const pickLatestTimerState = (localState, remoteState, taskContext = null) => {
  if (!remoteState) return localState || getDefaultTimerState(taskContext);
  if (!localState) return remoteState;

  return (remoteState.updatedAt || 0) >= (localState.updatedAt || 0)
    ? remoteState
    : localState;
};

const writeStoredTimerState = (accountId, state) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getTomatoStorageKey(accountId), JSON.stringify({
      ...state,
      savedAt: Date.now(),
    }));
  } catch (error) {
    console.warn('Tomato timer storage unavailable:', error);
  }
};

const createNoiseBuffer = (context, mode) => {
  const seconds = 2;
  const frameCount = context.sampleRate * seconds;
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const output = buffer.getChannelData(0);
  let brown = 0;
  let pink0 = 0;
  let pink1 = 0;
  let pink2 = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const white = Math.random() * 2 - 1;

    if (mode === 'deep') {
      brown = (brown + (0.025 * white)) / 1.025;
      output[index] = brown * 3.2;
    } else if (mode === 'rain') {
      pink0 = 0.99886 * pink0 + white * 0.0555179;
      pink1 = 0.99332 * pink1 + white * 0.0750759;
      pink2 = 0.96900 * pink2 + white * 0.1538520;
      output[index] = (pink0 + pink1 + pink2 + white * 0.11) * 0.18;
    } else {
      output[index] = white * 0.34;
    }
  }

  return buffer;
};

const disposeThreeObject = (object) => {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
  });
};

function FocusDriveScene({ progress, isRunning, isCompleted }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ progress, isRunning, isCompleted });

  useEffect(() => {
    stateRef.current = { progress, isRunning, isCompleted };
  }, [progress, isRunning, isCompleted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !window.matchMedia?.('(max-width: 767px)').matches,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.warn('Tomato 3D scene unavailable:', error);
      return undefined;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowPower = reduceMotion || window.innerWidth < 720 || (navigator.hardwareConcurrency || 8) <= 4;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    camera.position.set(0, 2.1, 9.4);

    const root = new THREE.Group();
    const tunnel = new THREE.Group();
    const core = new THREE.Group();
    scene.add(root);
    root.add(tunnel, core);

    scene.add(new THREE.AmbientLight(0x9ee7ff, 0.38));
    const cyanLight = new THREE.PointLight(0x22d3ee, 22, 24);
    cyanLight.position.set(-3.8, 3.3, 2.5);
    const emeraldLight = new THREE.PointLight(0x34d399, 28, 30);
    emeraldLight.position.set(4.5, 2.8, -7);
    const amberLight = new THREE.PointLight(0xf59e0b, 12, 20);
    amberLight.position.set(0, 1.2, -13);
    scene.add(cyanLight, emeraldLight, amberLight);

    const tunnelRings = [];
    const ringCount = lowPower ? 12 : 18;
    for (let index = 0; index < ringCount; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xf59e0b : index % 2 === 0 ? 0x22d3ee : 0x34d399,
        transparent: true,
        opacity: 0.12,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35 + index * 0.035, 0.012, 8, lowPower ? 64 : 96), material);
      ring.position.z = -2 - index * 1.55;
      ring.userData.baseZ = ring.position.z;
      ring.userData.phase = index * 0.42;
      tunnel.add(ring);
      tunnelRings.push(ring);
    }

    const dashGeometry = new THREE.BoxGeometry(0.055, 0.035, 0.9);
    const dashMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
    });
    const dashCount = lowPower ? 44 : 72;
    const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount);
    tunnel.add(dashes);

    const trailGeometry = new THREE.BoxGeometry(0.08, 0.04, 1.4);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
    });
    const trailCount = lowPower ? 24 : 42;
    const trails = new THREE.InstancedMesh(trailGeometry, trailMaterial, trailCount);
    tunnel.add(trails);

    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0x071522,
      emissive: 0x0f766e,
      emissiveIntensity: 1.1,
      metalness: 0.72,
      roughness: 0.28,
      transparent: true,
      opacity: 0.82,
    });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 4), orbMaterial);
    core.add(orb);

    const orbitMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.55, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.5, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.34, wireframe: true }),
    ];
    const orbitRings = [1.52, 1.83, 2.12].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014 + index * 0.004, 8, lowPower ? 84 : 128), orbitMaterials[index]);
      ring.rotation.set(index * 0.72, index * 0.38, index * 0.18);
      core.add(ring);
      return ring;
    });

    const particlesGeometry = new THREE.BufferGeometry();
    const particles = [];
    const particleCount = lowPower ? 280 : 620;
    for (let index = 0; index < particleCount; index += 1) {
      particles.push(
        THREE.MathUtils.randFloatSpread(18),
        THREE.MathUtils.randFloat(-3.8, 6.8),
        THREE.MathUtils.randFloat(-34, 5)
      );
    }
    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
    const starField = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xbff7ff,
        size: 0.034,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(starField);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const direction = new THREE.Vector3(0, 0, -1);

    let width = 1;
    let height = 1;
    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 720 ? 10.8 : 9.4;
      camera.position.y = width < 720 ? 2.45 : 2.1;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const { progress: currentProgress, isRunning: running, isCompleted: completed } = stateRef.current;
      const progressRatio = Math.min(Math.max(currentProgress / 100, 0), 1);
      const speed = reduceMotion ? 0 : running ? 1.15 : 0.22;
      const completionPulse = completed ? 1 : 0;

      root.rotation.y = Math.sin(elapsed * 0.28) * 0.035;
      tunnel.rotation.z = Math.sin(elapsed * 0.18) * 0.08;
      starField.rotation.y = elapsed * 0.008;

      tunnelRings.forEach((ring, index) => {
        const travel = running ? elapsed * 2.9 : elapsed * 0.35;
        let z = ring.userData.baseZ + (travel % 1.55);
        if (z > -1.2) z -= 27.9;
        ring.position.z = z;
        ring.scale.setScalar(1 + Math.sin(elapsed * 1.4 + ring.userData.phase) * 0.025);
        ring.material.opacity = 0.1 + progressRatio * 0.2 + (running ? 0.08 : 0);
      });

      for (let index = 0; index < dashCount; index += 1) {
        const lane = index % 2 === 0 ? -0.36 : 0.36;
        const z = -1.8 - ((index / dashCount) * 27 + elapsed * speed * 4.4) % 27;
        const x = lane + Math.sin(index * 1.7 + elapsed * 0.55) * 0.08;
        position.set(x, -1.05, z);
        quaternion.setFromUnitVectors(zAxis, direction);
        scale.set(1, 1, 0.8 + progressRatio * 0.9);
        matrix.compose(position, quaternion, scale);
        dashes.setMatrixAt(index, matrix);
      }
      dashes.instanceMatrix.needsUpdate = true;

      for (let index = 0; index < trailCount; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const z = -2.4 - ((index / trailCount) * 28 + elapsed * speed * 5.8) % 28;
        const x = side * (1.06 + Math.sin(index * 3.2) * 0.18);
        position.set(x, -0.93, z);
        quaternion.setFromUnitVectors(zAxis, direction);
        const pulse = running ? 1 + Math.sin(elapsed * 5 + index) * 0.2 : 0.82;
        scale.set(pulse, pulse, 0.72 + progressRatio * 1.8);
        matrix.compose(position, quaternion, scale);
        trails.setMatrixAt(index, matrix);
      }
      trails.instanceMatrix.needsUpdate = true;
      trailMaterial.opacity = running ? 0.72 : 0.36;

      core.rotation.y = elapsed * (running ? 0.38 : 0.12);
      core.rotation.x = Math.sin(elapsed * 0.5) * 0.08;
      core.scale.setScalar(1 + progressRatio * 0.12 + completionPulse * Math.sin(elapsed * 5) * 0.035);
      orb.material.emissiveIntensity = 0.78 + progressRatio * 1.5 + (running ? 0.35 : 0);
      orbitRings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * (0.004 + speed * 0.008);
        ring.material.opacity = 0.34 + progressRatio * 0.32 + (running ? 0.1 : 0);
      });

      camera.lookAt(0, 0.05, -4.5);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      disposeThreeObject(root);
      particlesGeometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export default function TomatoTimer({ taskContext, onBack }) {
  const { user } = useAuth();
  const accountId = user?.id || user?.email || 'guest';
  const initialStateRef = useRef(null);
  if (!initialStateRef.current || initialStateRef.current.accountId !== accountId) {
    initialStateRef.current = {
      accountId,
      state: readStoredTimerState(accountId, taskContext),
    };
  }
  const initialState = initialStateRef.current.state;
  const { profile, saveProfile, addXP, addFocusMinutes } = useUserProfile();
  const queryClient = useQueryClient();
  const freewayOS = normalizeFreewayOS(profile?.freeway_os);
  const [selectedPreset, setSelectedPreset] = useState(initialState.selectedPreset);
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isRunning, setIsRunning] = useState(initialState.isRunning);
  const [isCompleted, setIsCompleted] = useState(initialState.isCompleted);
  const [endsAt, setEndsAt] = useState(initialState.endsAt);
  const [timerTaskContext, setTimerTaskContext] = useState(initialState.taskContext);
  const [soundMode, setSoundMode] = useState(freewayOS.soundscape || 'off');
  const [soundActive, setSoundActive] = useState(false);
  const [focusLock, setFocusLock] = useState(Boolean(freewayOS.focusShield.enabled));
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const [showBrainDump, setShowBrainDump] = useState(false);
  const intervalRef = useRef(null);
  const completionRef = useRef(false);
  const audioRef = useRef(null);
  const lastRemoteTimerStateRef = useRef('');

  const totalSeconds = getPresetSeconds(PRESETS[selectedPreset]);
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const pausedTimeLeft = isRunning ? null : timeLeft;

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const persistFreewayOS = useCallback(async (nextOS) => {
    if (!profile || !saveProfile) return;
    await saveProfile({
      ...profile,
      freeway_os: nextOS,
    });
  }, [profile, saveProfile]);

  const stopSoundscape = useCallback(() => {
    const current = audioRef.current;
    audioRef.current = null;

    if (!current) return;

    try {
      current.source.stop();
      current.source.disconnect();
      current.gain.disconnect();
      current.filter?.disconnect();
      current.context.close();
    } catch {
      // The browser can already have closed the audio graph.
    }

    setSoundActive(false);
  }, []);

  const startSoundscape = useCallback(async (mode) => {
    stopSoundscape();

    if (mode === 'off' || typeof window === 'undefined') {
      setSoundActive(false);
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setSoundActive(false);
      return;
    }

    const context = new AudioContext();
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    source.buffer = createNoiseBuffer(context, mode);
    source.loop = true;
    gain.gain.value = mode === 'white' ? 0.045 : mode === 'deep' ? 0.07 : 0.095;
    filter.type = mode === 'deep' ? 'lowpass' : mode === 'rain' ? 'highpass' : 'peaking';
    filter.frequency.value = mode === 'deep' ? 420 : mode === 'rain' ? 650 : 1200;
    filter.Q.value = mode === 'white' ? 0.35 : 0.8;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    if (context.state === 'suspended') {
      await context.resume();
    }

    source.start();
    audioRef.current = { context, source, gain, filter };
    setSoundActive(true);
  }, [stopSoundscape]);

  const handleSoundMode = async (mode) => {
    setSoundMode(mode);
    await persistFreewayOS(patchSoundscape(freewayOS, mode));
    await startSoundscape(mode);
  };

  const handleFocusLock = async () => {
    const nextValue = !focusLock;
    setFocusLock(nextValue);
    await persistFreewayOS(patchFocusShield(freewayOS, { enabled: nextValue }));
  };

  const completeSession = useCallback(async () => {
    if (completionRef.current) return;
    completionRef.current = true;
    setIsRunning(false);
    setIsCompleted(true);
    setTimeLeft(0);
    setEndsAt(null);
    const preset = PRESETS[selectedPreset];
    let result;

    try {
      await accountData.focusSessions.create({
        duration_minutes: preset.minutes,
        completed: true,
        xp_earned: preset.xp,
        task_id: timerTaskContext?.id,
        task_title: timerTaskContext?.title || `Sessione ${preset.label} min`,
      });
      invalidateFocusViews(queryClient);
      result = await addXP(preset.xp);
      await addFocusMinutes(preset.minutes);
    } catch (error) {
      console.warn('Focus session sync unavailable:', error);
    }

    setRewardData({ amount: preset.xp, levelUp: result?.leveledUp || false, newLevel: result?.newLevel || 1 });
    setShowReward(true);
  }, [selectedPreset, addXP, addFocusMinutes, timerTaskContext, queryClient]);

  useEffect(() => {
    const storedState = pickLatestTimerState(
      readStoredTimerState(accountId, taskContext),
      readProfileTimerState(profile?.freeway_os, taskContext),
      taskContext,
    );
    completionRef.current = false;
    setSelectedPreset(storedState.selectedPreset);
    setTimeLeft(storedState.timeLeft);
    setIsRunning(storedState.isRunning);
    setIsCompleted(storedState.isCompleted);
    setEndsAt(storedState.endsAt);
    setTimerTaskContext(storedState.taskContext);
  }, [accountId, profile?.freeway_os, taskContext]);

  useEffect(() => {
    setFocusLock(Boolean(freewayOS.focusShield.enabled));
    setSoundMode(freewayOS.soundscape || 'off');
  }, [freewayOS.focusShield.enabled, freewayOS.soundscape]);

  useEffect(() => () => stopSoundscape(), [stopSoundscape]);

  useEffect(() => {
    if (taskContext && !isRunning && !isCompleted) {
      setTimerTaskContext(taskContext);
    }
  }, [taskContext, isRunning, isCompleted]);

  useEffect(() => {
    writeStoredTimerState(accountId, {
      selectedPreset,
      timeLeft,
      isRunning,
      isCompleted,
      endsAt,
      taskContext: timerTaskContext,
    });
  }, [accountId, selectedPreset, timeLeft, isRunning, isCompleted, endsAt, timerTaskContext]);

  useEffect(() => {
    if (!profile || !saveProfile) return;

    const remoteTimerState = {
      selectedPreset,
      isRunning,
      isCompleted,
      endsAt,
      timeLeft: pausedTimeLeft,
      taskContext: timerTaskContext,
    };
    const serialized = JSON.stringify(remoteTimerState);

    if (lastRemoteTimerStateRef.current === serialized) return;
    lastRemoteTimerStateRef.current = serialized;

    persistFreewayOS(patchTomatoTimer(freewayOS, {
      ...remoteTimerState,
      updatedAt: Date.now(),
    })).catch((error) => {
      console.warn('Tomato timer sync unavailable:', error);
    });
  }, [
    endsAt,
    freewayOS,
    isCompleted,
    isRunning,
    pausedTimeLeft,
    persistFreewayOS,
    profile,
    saveProfile,
    selectedPreset,
    timerTaskContext,
  ]);

  useEffect(() => {
    if (!isRunning) return undefined;

    if (!endsAt) {
      setEndsAt(Date.now() + timeLeft * 1000);
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        completeSession();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, endsAt, completeSession]);

  const selectPreset = (i) => {
    if (isRunning) return;
    completionRef.current = false;
    setSelectedPreset(i);
    setTimeLeft(getPresetSeconds(PRESETS[i]));
    setIsCompleted(false);
    setEndsAt(null);
  };

  const reset = () => {
    completionRef.current = false;
    setIsRunning(false);
    setIsCompleted(false);
    setEndsAt(null);
    setTimeLeft(getPresetSeconds(PRESETS[selectedPreset]));
  };

  const toggleRunning = () => {
    if (isRunning) {
      const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : timeLeft;
      setTimeLeft(remaining);
      setIsRunning(false);
      setEndsAt(null);
      return;
    }

    const secondsToRun = timeLeft > 0 ? timeLeft : totalSeconds;
    completionRef.current = false;
    setTimeLeft(secondsToRun);
    setIsCompleted(false);
    setEndsAt(Date.now() + secondsToRun * 1000);
    setIsRunning(true);
  };

  const activePreset = PRESETS[selectedPreset];
  const statusLabel = isRunning ? 'Hyper focus' : isCompleted ? 'Completata' : 'Pronta';
  const displayProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative min-h-screen overflow-hidden bg-[#02050c]"
    >
      <FocusDriveScene progress={displayProgress} isRunning={isRunning} isCompleted={isCompleted} />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 50% 48%, rgba(3, 7, 18, 0.08), rgba(1, 3, 11, 0.78) 66%, rgba(0, 0, 0, 0.92))',
            'linear-gradient(180deg, rgba(2, 5, 12, 0.16), rgba(2, 5, 12, 0.6))',
            'linear-gradient(90deg, rgba(14, 165, 233, 0.1), transparent 26%, transparent 72%, rgba(245, 158, 11, 0.08))',
          ].join(', '),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
        }}
      />

      <AnimatePresence>
        {isRunning && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ background: 'radial-gradient(circle at center, transparent 32%, rgba(1,3,11,0.86) 100%)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-20 flex min-h-screen flex-col px-4 pb-6 pt-4 md:px-8 md:pt-6">
        <motion.header
          className="flex items-center justify-between gap-3"
          animate={{ opacity: isRunning ? 0.42 : 1 }}
        >
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55 backdrop-blur-xl transition-colors hover:border-cyan-200/25 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Calendario
          </button>

          <div className="min-w-0 rounded-xl border border-cyan-200/10 bg-black/30 px-3 py-2 text-right backdrop-blur-xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-100/40">Sessione</p>
            <p className="max-w-[42vw] truncate font-grotesk text-sm font-semibold text-white/70">
              {timerTaskContext?.title || 'Focus libero'}
            </p>
          </div>
        </motion.header>

        <section className="grid flex-1 place-items-center py-7 md:py-8">
          <div className="w-full max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto flex w-full max-w-[760px] flex-col items-center"
            >
              <div className="mb-5 flex items-center gap-2 rounded-full border border-amber-300/15 bg-black/25 px-4 py-2 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber-100/70">
                  Focus drive
                </span>
              </div>

              <div className="relative grid aspect-square w-[min(78vw,430px)] place-items-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-cyan-200/10"
                  animate={{
                    rotate: isRunning ? 360 : 0,
                    boxShadow: isRunning
                      ? [
                          '0 0 40px rgba(34,211,238,0.14)',
                          '0 0 90px rgba(52,211,153,0.28)',
                          '0 0 40px rgba(34,211,238,0.14)',
                        ]
                      : '0 0 36px rgba(34,211,238,0.12)',
                  }}
                  transition={isRunning ? { rotate: { duration: 18, repeat: Infinity, ease: 'linear' }, boxShadow: { duration: 2.2, repeat: Infinity } } : {}}
                />
                <div
                  className="absolute inset-[5%] rounded-full p-[1px]"
                  style={{
                    background: `conic-gradient(from 215deg, rgba(52,211,153,0.95) ${displayProgress}%, rgba(103,232,249,0.16) ${displayProgress}%, rgba(245,158,11,0.1) 100%)`,
                  }}
                >
                  <div className="h-full w-full rounded-full bg-[#02050c]/50 backdrop-blur-sm" />
                </div>
                <div className="absolute inset-[17%] rounded-full border border-white/10 bg-black/30 shadow-[inset_0_1px_25px_rgba(255,255,255,0.05)] backdrop-blur-md" />

                <div className="relative z-10 flex flex-col items-center px-6 text-center">
                  <motion.span
                    className="font-mono text-[clamp(3.7rem,10vw,6.6rem)] font-bold leading-none tracking-[0.05em] text-white"
                    animate={{ textShadow: isRunning ? '0 0 30px rgba(103,232,249,0.72)' : '0 0 16px rgba(103,232,249,0.18)' }}
                  >
                    {formatTime(timeLeft)}
                  </motion.span>
                  <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.32em] text-emerald-200/70">
                    {statusLabel}
                  </span>
                  <div className="mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-200"
                      animate={{ width: `${displayProgress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              </div>

              <motion.div
                className="mt-6 grid w-full max-w-sm grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5 backdrop-blur-2xl"
                animate={{ opacity: isRunning ? 0.32 : 1 }}
              >
                {PRESETS.map((preset, index) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => selectPreset(index)}
                    disabled={isRunning}
                    aria-label={`Preset ${preset.label} minuti`}
                    className={`h-11 rounded-xl font-mono text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                      index === selectedPreset
                        ? 'bg-emerald-300 text-black shadow-[0_0_24px_rgba(52,211,153,0.35)]'
                        : 'text-white/55 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}m
                  </button>
                ))}
              </motion.div>

              <div className="mt-6 flex items-center justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={reset}
                  disabled={isRunning && focusLock}
                  aria-label="Reset tomato"
                  title={isRunning && focusLock ? 'Focus lock attivo' : 'Reset tomato'}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/55 backdrop-blur-xl transition-colors hover:border-amber-300/35 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <RotateCcw className="h-5 w-5" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={toggleRunning}
                  disabled={isCompleted}
                  aria-label={isRunning ? 'Pausa tomato' : 'Avvia tomato'}
                  className="grid h-20 w-20 place-items-center rounded-full border border-emerald-200/40 bg-emerald-300 text-black shadow-[0_0_45px_rgba(52,211,153,0.28)] transition-all disabled:opacity-40"
                  animate={{
                    scale: isRunning ? [1, 1.04, 1] : 1,
                    boxShadow: isRunning
                      ? [
                          '0 0 28px rgba(52,211,153,0.38)',
                          '0 0 68px rgba(34,211,238,0.42)',
                          '0 0 28px rgba(52,211,153,0.38)',
                        ]
                      : '0 0 36px rgba(52,211,153,0.28)',
                  }}
                  transition={isRunning ? { duration: 1.8, repeat: Infinity } : {}}
                >
                  {isRunning
                    ? <Pause className="h-8 w-8" />
                    : <Play className="ml-1 h-8 w-8" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowBrainDump(true)}
                  aria-label="Apri Brain Dump"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-black/35 text-cyan-200 backdrop-blur-xl transition-colors hover:border-cyan-200/40 hover:bg-cyan-200/10"
                >
                  <Brain className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="mt-6 grid w-full max-w-3xl gap-2 lg:grid-cols-[1fr_220px]">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-cyan-100/60">
                      {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Ambiente focus</span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                      {soundActive ? 'audio on' : 'tap per avviare'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {FREEWAY_OS_SOUNDS.map((sound) => (
                      <button
                        key={sound.value}
                        type="button"
                        onClick={() => handleSoundMode(sound.value)}
                        className={`min-h-10 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                          soundMode === sound.value
                            ? 'border-cyan-200/40 bg-cyan-300/14 text-cyan-50'
                            : 'border-white/10 bg-white/[0.035] text-white/45 hover:text-white'
                        }`}
                      >
                        {sound.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFocusLock}
                  className={`rounded-2xl border p-3 text-left backdrop-blur-xl transition-colors ${
                    focusLock
                      ? 'border-emerald-300/35 bg-emerald-400/14 text-emerald-50'
                      : 'border-white/10 bg-black/25 text-white/55 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Focus lock</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-current/70">
                    {focusLock ? 'Reset bloccato durante la sessione.' : 'Aggiunge attrito alle uscite facili.'}
                  </p>
                </button>
              </div>

              <div className="mt-4 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-cyan-100/60">
                    <Gauge className="h-4 w-4" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Progress</span>
                  </div>
                  <p className="mt-2 font-grotesk text-2xl font-bold text-white">{Math.round(displayProgress)}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-amber-100/60">
                    <Zap className="h-4 w-4" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Reward</span>
                  </div>
                  <p className="mt-2 font-grotesk text-2xl font-bold text-white">+{activePreset.xp} XP</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-emerald-100/60">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Preset</span>
                  </div>
                  <p className="mt-2 font-grotesk text-2xl font-bold text-white">{activePreset.label} min</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      <BrainDumpSheet open={showBrainDump} onClose={() => setShowBrainDump(false)} />

      <XPReward
        amount={rewardData.amount}
        show={showReward}
        onComplete={() => setShowReward(false)}
        levelUp={rewardData.levelUp}
        newLevel={rewardData.newLevel}
      />
    </motion.div>
  );
}
