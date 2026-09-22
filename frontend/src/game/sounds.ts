import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Safe dynamic import for expo-audio
let createAudioPlayer: any = null;
try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
} catch (e) {
  console.warn('[Sounds] expo-audio not available, using haptics fallback');
}

const SFX_STORAGE_KEY = 'chilldash_sfx_enabled';

// In-memory sound state (defaults to true)
let isSfxEnabled = true;
let isLoaded = false;
const listeners = new Set<(enabled: boolean) => void>();

// Preloaded Audio Players
let tapPlayer: any = null;
let coinPlayer: any = null;
let deliverPlayer: any = null;
let hornPlayer: any = null;

async function initSoundSubsystem() {
  if (isLoaded) return;
  try {
    const stored = await AsyncStorage.getItem(SFX_STORAGE_KEY);
    if (stored !== null) {
      isSfxEnabled = stored === 'true';
    }
  } catch {}
  isLoaded = true;
  notifyListeners();

  // Pre-load audio players if createAudioPlayer is available
  if (createAudioPlayer) {
    try {
      tapPlayer = createAudioPlayer(require('../../assets/sounds/tap.wav'));
    } catch {}
    try {
      coinPlayer = createAudioPlayer(require('../../assets/sounds/coin.wav'));
    } catch {}
    try {
      deliverPlayer = createAudioPlayer(require('../../assets/sounds/deliver.wav'));
    } catch {}
    try {
      hornPlayer = createAudioPlayer(require('../../assets/sounds/horn.wav'));
    } catch {}
  }
}

// Automatically initialize on import
initSoundSubsystem();

export async function prewarmSounds(): Promise<void> {
  await initSoundSubsystem();
}

function notifyListeners() {
  listeners.forEach(fn => fn(isSfxEnabled));
}

export function isSoundEnabled(): boolean {
  return isSfxEnabled;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  isSfxEnabled = enabled;
  try {
    await AsyncStorage.setItem(SFX_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
  notifyListeners();
}

export async function toggleSound(): Promise<boolean> {
  const next = !isSfxEnabled;
  await setSoundEnabled(next);
  if (next) {
    playCoinSound();
  }
  return next;
}

/**
 * React hook to observe and toggle Sound FX state
 */
export function useSoundFX() {
  const [enabled, setEnabled] = useState(isSfxEnabled);

  useEffect(() => {
    const handler = (val: boolean) => setEnabled(val);
    listeners.add(handler);
    setEnabled(isSfxEnabled);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    soundEnabled: enabled,
    toggleSound,
    setSoundEnabled,
  };
}

/**
 * Plays the UI tap/click sound
 */
export function playTapSound() {
  if (!isSfxEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (tapPlayer) {
      tapPlayer.seekTo(0);
      tapPlayer.play();
    }
  } catch {}
}

/**
 * Plays the coin collect / reward sound
 */
export function playCoinSound() {
  if (!isSfxEnabled) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (coinPlayer) {
      coinPlayer.seekTo(0);
      coinPlayer.play();
    }
  } catch {}
}

/**
 * Plays the celebratory delivery completed arpeggio
 */
export function playDeliverSound() {
  if (!isSfxEnabled) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (deliverPlayer) {
      deliverPlayer.seekTo(0);
      deliverPlayer.play();
    }
  } catch {}
}

/**
 * Plays the cheerful scooter / bike horn
 */
export function playHornSound() {
  if (!isSfxEnabled) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (hornPlayer) {
      hornPlayer.seekTo(0);
      hornPlayer.play();
    }
  } catch {}
}
