/**
 * Freeway Life - Scene Optimizer
 * 
 * Utility per rilevare capacità del dispositivo e ottimizzare
 * le scene THREE.js decorative su mobile/low-end.
 * 
 * Le scene THREE.js su Splash e TomatoTimer vengono disabilitate
 * su dispositivi con meno di 4GB RAM, schermo piccolo, o 
 * preferenza "riduci movimento".
 */

let cachedResult = null;

export function getDeviceCapability() {
  if (cachedResult) return cachedResult;

  if (typeof window === 'undefined') {
    cachedResult = { tier: 'high', canRender3D: false };
    return cachedResult;
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const narrowScreen = window.innerWidth < 720;
  const lowCPU = (navigator.hardwareConcurrency || 8) <= 4;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isLowPowerMode = navigator?.getBattery?.()?.then?.(false) || false; // API sperimentale

  const isLowEnd = narrowScreen || lowCPU || isMobile;
  const isVeryLowEnd = isLowEnd && reduceMotion;

  cachedResult = {
    tier: isVeryLowEnd ? 'low' : isLowEnd ? 'medium' : 'high',
    canRender3D: !reduceMotion && !isVeryLowEnd,
    reducedMotion: reduceMotion,
    pixelRatio: Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.25 : 1.75),
    tunnelSegments: isVeryLowEnd ? 48 : isLowEnd ? 72 : 112,
    particleCount: isVeryLowEnd ? 120 : isLowEnd ? 220 : 520,
    dashCount: isLowEnd ? 24 : 48,
    vehicleCount: isLowEnd ? 28 : 64,
  };

  return cachedResult;
}

/**
 * Wrapper per cancellare sicuramente un oggetto THREE.js
 * (sposta questa funzione qui invece di duplicarla in Splash e TomatoTimer)
 */
export function disposeThreeObject(object) {
  if (!object) return;
  
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
    if (child.dispose && typeof child.dispose === 'function') {
      try { child.dispose(); } catch {}
    }
  });
}

/**
 * Hook per sapere se il device supporta le scene 3D
 */
export function useCanRender3D() {
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    setCanRender(getDeviceCapability().canRender3D);
    const handler = () => setCanRender(getDeviceCapability().canRender3D);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return canRender;
}