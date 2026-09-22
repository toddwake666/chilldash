import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { PlayUpdateModule } = NativeModules;

export interface PlayUpdateInfo {
  updateAvailable: boolean;
  availableVersionCode: number;
  isFlexibleAllowed: boolean;
  isImmediateAllowed: boolean;
  updatePriority: number;
  stalenessDays: number;
}

let emitter: NativeEventEmitter | null = null;
if (Platform.OS === 'android' && PlayUpdateModule) {
  emitter = new NativeEventEmitter(PlayUpdateModule);
}

/**
 * Checks Google Play Store for an available in-app update.
 */
export async function checkPlayUpdate(): Promise<PlayUpdateInfo | null> {
  if (Platform.OS !== 'android' || !PlayUpdateModule) return null;
  try {
    const info: PlayUpdateInfo = await PlayUpdateModule.checkForUpdate();
    return info;
  } catch (err) {
    // Normal for sideloaded / dev builds not installed via Play Store
    return null;
  }
}

/**
 * Prompts Google Play Store native in-app update flow.
 * @param type 'flexible' (recommended, downloads in background) or 'immediate' (blocking)
 */
export async function startPlayUpdate(type: 'flexible' | 'immediate' = 'flexible'): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayUpdateModule) return false;
  try {
    const ok = await PlayUpdateModule.startUpdate(type);
    return !!ok;
  } catch (err) {
    console.log('[PlayUpdate] Flow dismissed or unavailable:', err);
    return false;
  }
}

/**
 * Completes a flexible update by restarting the app to apply the downloaded files.
 */
export async function completePlayUpdate(): Promise<boolean> {
  if (Platform.OS !== 'android' || !PlayUpdateModule) return false;
  try {
    await PlayUpdateModule.completeUpdate();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Automatically checks Google Play on launch and presents the native Play Store update popup if a new release is available.
 */
export async function checkAndPromptPlayUpdate(
  onDownloaded?: () => void
): Promise<void> {
  if (Platform.OS !== 'android' || !PlayUpdateModule) return;

  try {
    const info = await checkPlayUpdate();
    if (info && info.updateAvailable) {
      console.log('[PlayUpdate] New release found on Google Play! VersionCode:', info.availableVersionCode);

      // Listen for download completion if flexible
      if (emitter && onDownloaded) {
        emitter.addListener('onPlayUpdateDownloaded', () => {
          console.log('[PlayUpdate] Update downloaded and ready to apply');
          onDownloaded();
        });
      }

      // If high priority (>= 4) or flexible not allowed, use immediate
      const mode = (info.updatePriority >= 4 || !info.isFlexibleAllowed) ? 'immediate' : 'flexible';
      await startPlayUpdate(mode);
    }
  } catch (e) {
    // Graceful no-op
  }
}
