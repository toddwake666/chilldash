import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Safe dynamic import for expo-audio
let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;
try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  if (setAudioModeAsync) {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});
  }
} catch (e) {
  console.warn('[Sounds] expo-audio not available, using haptics fallback');
}

const SFX_STORAGE_KEY = 'chilldash_sfx_enabled';
const MUSIC_STORAGE_KEY = 'chilldash_music_enabled';

// In-memory audio states (both default to true)
let isSfxState = true;
let isMusicState = true;
let isSubsystemLoaded = false;

const sfxListeners = new Set<(enabled: boolean) => void>();
const musicListeners = new Set<(enabled: boolean) => void>();
export type MusicZone = 'valley' | 'spooky' | 'dhak' | 'none';
const zoneListeners = new Set<(zone: MusicZone) => void>();

// Preloaded SFX Audio Players
let tapPlayer: any = null;
let coinPlayer: any = null;
let deliverPlayer: any = null;
let hornPlayer: any = null;
let acceptPlayer: any = null;
let crashPlayer: any = null;
let eatPlayer: any = null;
let fuelPlayer: any = null;
let whooshPlayer: any = null;

// Background Music Players
let valleyPlayer: any = null;
let spookyPlayer: any = null;
let currentZone: MusicZone = 'none';
let lastKnownPos: { x: number; y: number } | null = null;
let appActive = true;

/**
 * Checks whether the rider is on the Whispering Pines festival road
 * stretch approaching the Haunted Barn & Pumpkin Patch and Cider Shack.
 */
export function isFestivePandalRoad(x?: number, y?: number): boolean {
  if (x === undefined || y === undefined) return false;
  return x >= 1380 && x <= 2080 && y >= 430 && y <= 940;
}
export const isSpookyRoad = isFestivePandalRoad;

async function initSoundSubsystem() {
  if (isSubsystemLoaded) return;
  try {
    const [storedSfx, storedMusic] = await Promise.all([
      AsyncStorage.getItem(SFX_STORAGE_KEY),
      AsyncStorage.getItem(MUSIC_STORAGE_KEY),
    ]);
    if (storedSfx !== null) isSfxState = storedSfx === 'true';
    if (storedMusic !== null) isMusicState = storedMusic === 'true';
  } catch {}
  isSubsystemLoaded = true;
  notifySfxListeners();
  notifyMusicListeners();

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
    try {
      acceptPlayer = createAudioPlayer(require('../../assets/sounds/accept.wav'));
    } catch {}
    try {
      crashPlayer = createAudioPlayer(require('../../assets/sounds/crash.wav'));
    } catch {}
    try {
      eatPlayer = createAudioPlayer(require('../../assets/sounds/eat.wav'));
    } catch {}
    try {
      fuelPlayer = createAudioPlayer(require('../../assets/sounds/fuel.wav'));
    } catch {}
    try {
      whooshPlayer = createAudioPlayer(require('../../assets/sounds/whoosh.wav'));
    } catch {}

    // Preload Music Players with looping enabled
    try {
      valleyPlayer = createAudioPlayer(require('../../assets/sounds/bgm_valley.mp3'));
      if (valleyPlayer) {
        valleyPlayer.loop = true;
        valleyPlayer.volume = 0.52;
      }
    } catch {}
    try {
      spookyPlayer = createAudioPlayer(require('../../assets/sounds/spooky.wav'));
      if (spookyPlayer) {
        spookyPlayer.loop = true;
        spookyPlayer.volume = 0.60;
      }
    } catch {}
  }

  // Sync music state once players are created
  applyMusicPlayback();
}

// Automatically initialize on import
initSoundSubsystem();

// Manage background / active lifecycle
AppState.addEventListener('change', (nextState: AppStateStatus) => {
  const nextActive = nextState === 'active';
  if (appActive !== nextActive) {
    appActive = nextActive;
    if (!appActive) {
      pauseAllMusic();
    } else {
      applyMusicPlayback();
    }
  }
});

export async function prewarmSounds(): Promise<void> {
  await initSoundSubsystem();
}

function notifySfxListeners() {
  sfxListeners.forEach(fn => fn(isSfxState));
}

function notifyMusicListeners() {
  musicListeners.forEach(fn => fn(isMusicState));
}

function notifyZoneListeners() {
  zoneListeners.forEach(fn => fn(currentZone));
}

export function isSoundEnabled(): boolean {
  return isSfxState;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  isSfxState = enabled;
  try {
    await AsyncStorage.setItem(SFX_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
  notifySfxListeners();
}

export async function toggleSound(): Promise<boolean> {
  const next = !isSfxState;
  await setSoundEnabled(next);
  if (next) {
    playCoinSound();
  }
  return next;
}

export function isMusicEnabled(): boolean {
  return isMusicState;
}

export async function setMusicEnabled(enabled: boolean): Promise<void> {
  isMusicState = enabled;
  try {
    await AsyncStorage.setItem(MUSIC_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
  notifyMusicListeners();
  applyMusicPlayback();
}

export async function toggleMusic(): Promise<boolean> {
  const next = !isMusicState;
  await setMusicEnabled(next);
  return next;
}

function pauseAllMusic() {
  try {
    if (valleyPlayer && valleyPlayer.playing) valleyPlayer.pause();
  } catch {}
  try {
    if (spookyPlayer && spookyPlayer.playing) spookyPlayer.pause();
  } catch {}
  currentZone = 'none';
  notifyZoneListeners();
}

function applyMusicPlayback() {
  if (!isMusicState || !appActive) {
    pauseAllMusic();
    return;
  }

  const isHalloweenZone = lastKnownPos ? isSpookyRoad(lastKnownPos.x, lastKnownPos.y) : false;
  const targetZone: 'valley' | 'spooky' = isHalloweenZone ? 'spooky' : 'valley';

  if (targetZone === 'spooky') {
    if (currentZone !== 'spooky') {
      try {
        if (valleyPlayer && valleyPlayer.playing) valleyPlayer.pause();
      } catch {}
      try {
        if (spookyPlayer) {
          spookyPlayer.loop = true;
          spookyPlayer.volume = 0.60;
          if (!spookyPlayer.playing) spookyPlayer.play();
        }
      } catch {}
      currentZone = 'spooky';
      notifyZoneListeners();
    }
  } else {
    if (currentZone !== 'valley') {
      try {
        if (spookyPlayer && spookyPlayer.playing) spookyPlayer.pause();
      } catch {}
      try {
        if (valleyPlayer) {
          valleyPlayer.loop = true;
          valleyPlayer.volume = 0.52;
          if (!valleyPlayer.playing) valleyPlayer.play();
        }
      } catch {}
      currentZone = 'valley';
      notifyZoneListeners();
    }
  }
}

/**
 * Updates the music zone based on the rider's position in the world.
 * Automatically crossfades/switches between Midday in the Valley BGM
 * and the Halloween Spooky Organ BGM when riding on Pine Trail!
 */
export function updateMusicPosition(x?: number, y?: number): void {
  if (x !== undefined && y !== undefined) {
    lastKnownPos = { x, y };
  } else {
    lastKnownPos = null;
  }
  applyMusicPlayback();
}

export function stopAllMusic(): void {
  pauseAllMusic();
}

/**
 * Preview playback for the Settings audio tile
 */
export function playMusicPreview(track: 'valley' | 'spooky' | 'dhak'): void {
  if (!isMusicState) return;
  try {
    if (track === 'spooky' || track === 'dhak') {
      if (valleyPlayer && valleyPlayer.playing) valleyPlayer.pause();
      if (spookyPlayer) {
        spookyPlayer.loop = true;
        spookyPlayer.volume = 0.65;
        spookyPlayer.play();
        currentZone = 'spooky';
        notifyZoneListeners();
      }
    } else {
      if (spookyPlayer && spookyPlayer.playing) spookyPlayer.pause();
      if (valleyPlayer) {
        valleyPlayer.loop = true;
        valleyPlayer.volume = 0.6;
        valleyPlayer.play();
        currentZone = 'valley';
        notifyZoneListeners();
      }
    }
  } catch {}
}

/**
 * React hook to observe and toggle Sound FX & BGM states
 */
export function useSoundFX() {
  const [sfx, setSfx] = useState(isSfxState);
  const [music, setMusic] = useState(isMusicState);
  const [zone, setZone] = useState(currentZone);

  useEffect(() => {
    const sfxHandler = (val: boolean) => setSfx(val);
    const musicHandler = (val: boolean) => setMusic(val);
    const zoneHandler = (val: MusicZone) => setZone(val);

    sfxListeners.add(sfxHandler);
    musicListeners.add(musicHandler);
    zoneListeners.add(zoneHandler);

    setSfx(isSfxState);
    setMusic(isMusicState);
    setZone(currentZone);

    return () => {
      sfxListeners.delete(sfxHandler);
      musicListeners.delete(musicHandler);
      zoneListeners.delete(zoneHandler);
    };
  }, []);

  return {
    soundEnabled: sfx,
    toggleSound,
    setSoundEnabled,
    musicEnabled: music,
    toggleMusic,
    setMusicEnabled,
    currentZone: zone,
    playMusicPreview,
  };
}

// ---------------------------------------------------------------------------
// Sound FX Helpers
// ---------------------------------------------------------------------------

export function playTapSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (tapPlayer) {
      tapPlayer.seekTo(0);
      tapPlayer.play();
    }
  } catch {}
}

export function playCoinSound() {
  if (!isSfxState) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (coinPlayer) {
      coinPlayer.seekTo(0);
      coinPlayer.play();
    }
  } catch {}
}

export function playDeliverSound() {
  if (!isSfxState) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (deliverPlayer) {
      deliverPlayer.seekTo(0);
      deliverPlayer.play();
    }
  } catch {}
}

export function playHornSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (hornPlayer) {
      hornPlayer.seekTo(0);
      hornPlayer.play();
    }
  } catch {}
}

export function playAcceptSound() {
  if (!isSfxState) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (acceptPlayer) {
      acceptPlayer.seekTo(0);
      acceptPlayer.play();
    }
  } catch {}
}

export function playCrashSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (crashPlayer) {
      crashPlayer.seekTo(0);
      crashPlayer.play();
    }
  } catch {}
}

export function playEatSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (eatPlayer) {
      eatPlayer.seekTo(0);
      eatPlayer.play();
    }
  } catch {}
}

export function playFuelSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (fuelPlayer) {
      fuelPlayer.seekTo(0);
      fuelPlayer.play();
    }
  } catch {}
}

export function playWhooshSound() {
  if (!isSfxState) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (whooshPlayer) {
      whooshPlayer.seekTo(0);
      whooshPlayer.play();
    }
  } catch {}
}
