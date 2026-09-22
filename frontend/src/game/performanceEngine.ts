import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceStats {
  fps: number;
  droppedFramesCount: number;
  lastCleanedAt: number;
  autoHealCount: number;
  ecoMode: boolean;
}

// Circular buffer for recent frame durations (in seconds)
const WINDOW_SIZE = 45;
const frameDeltas = new Float32Array(WINDOW_SIZE);
let frameIndex = 0;
let frameCount = 0;
let lastAutoHealTime = 0;
let autoHealCount = 0;
let recentDroppedFrames = 0;
let lastDropResetTime = Date.now();
let ecoMode = false;
let currentFps = 60;

type OnCleanListener = () => void;
const cleanListeners = new Set<OnCleanListener>();

export function registerPerformanceCleanupListener(fn: OnCleanListener): () => void {
  cleanListeners.add(fn);
  return () => {
    cleanListeners.delete(fn);
  };
}

/**
 * Executes a full memory, image, and cache purge to restore 60 FPS smoothness.
 * Can be triggered automatically by the watchdog or manually by the player in the Phone.
 */
export async function executeAutoHealingClean(source: 'auto_watchdog' | 'manual'): Promise<{
  freedImages: boolean;
  gcRun: boolean;
  keysCleaned: number;
}> {
  let freedImages = false;
  let gcRun = false;
  let keysCleaned = 0;

  try {
    // 1. Clear Expo Image memory cache to release decoded Fresco GPU textures
    await Image.clearMemoryCache();
    freedImages = true;
  } catch {
    // Fallback if memory clear is unsupported in the current context
  }

  try {
    // 2. Trigger native Hermes Garbage Collection if exposed
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
      gcRun = true;
    }
  } catch {
    // GC not exposed in this runtime mode
  }

  try {
    // 3. Compact & prune transient or stale AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    const staleKeys = allKeys.filter(
      k => k.startsWith('temp_') || k.startsWith('cache_') || k.startsWith('debug_')
    );
    if (staleKeys.length > 0) {
      await AsyncStorage.multiRemove(staleKeys);
      keysCleaned = staleKeys.length;
    }
  } catch {
    // Storage prune fallback
  }

  // 4. Notify any registered subscribers (e.g. traffic reset, math buffer flushes)
  cleanListeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Ignore individual subscriber exceptions
    }
  });

  lastAutoHealTime = Date.now();
  if (source === 'auto_watchdog') {
    autoHealCount++;
  }

  return { freedImages, gcRun, keysCleaned };
}

/**
 * Records frame delta time and automatically runs the watchdog healing routine when lag is detected.
 * Called on every animation frame in the main game loop (useRide.ts).
 */
export function recordFrameForWatchdog(rawDt: number, onAutoHeal?: (fps: number) => void): boolean {
  // Clamp delta for sanity
  const dt = Math.max(0.001, Math.min(0.2, rawDt));
  frameDeltas[frameIndex] = dt;
  frameIndex = (frameIndex + 1) % WINDOW_SIZE;
  frameCount = Math.min(WINDOW_SIZE, frameCount + 1);

  // Track dropped frames (frame took > 45ms, i.e. < 22 FPS)
  const now = Date.now();
  if (dt > 0.045) {
    recentDroppedFrames++;
  }

  // Reset dropped frames accumulator every 3.5 seconds
  if (now - lastDropResetTime > 3500) {
    recentDroppedFrames = 0;
    lastDropResetTime = now;
  }

  // Calculate rolling FPS once we have enough frames
  if (frameCount >= 20) {
    let totalTime = 0;
    for (let i = 0; i < frameCount; i++) {
      totalTime += frameDeltas[i];
    }
    currentFps = Math.round(frameCount / (totalTime || 1));
  }

  // Trigger conditions:
  // 1. Rolling FPS < 34 for 25+ frames
  // OR
  // 2. More than 6 severe dropped frames within 3.5 seconds
  // AND
  // 3. At least 25 seconds elapsed since last auto-heal
  const cooldownPassed = now - lastAutoHealTime > 25000;
  const isLaggy = (currentFps < 34 && frameCount >= 25) || recentDroppedFrames >= 6;

  if (isLaggy && cooldownPassed) {
    executeAutoHealingClean('auto_watchdog').catch(() => {});
    if (onAutoHeal) {
      onAutoHeal(currentFps);
    }
    recentDroppedFrames = 0;
    lastDropResetTime = now;
    return true;
  }

  return false;
}

export function getPerformanceStats(): PerformanceStats {
  return {
    fps: currentFps,
    droppedFramesCount: recentDroppedFrames,
    lastCleanedAt: lastAutoHealTime,
    autoHealCount,
    ecoMode,
  };
}
