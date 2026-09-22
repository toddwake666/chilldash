import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Coin, Icon, Label } from './ui';
import { getSyncId } from '@/src/game/supabase';
import { useSoundFX, playTapSound, playCoinSound, playHornSound, playDeliverSound } from '@/src/game/sounds';
import { checkPlayGamesAuth, signInPlayGames, showPlayGamesAchievements, showPlayGamesLeaderboards, PlayGamesPlayer } from '@/src/game/playGames';
import { executeAutoHealingClean } from '@/src/game/performanceEngine';

export function PhoneProfile() {
  const g = useGame();
  const s = useStyles();
  const { colors: c } = useTheme();
  const p = g.profile!;
  const { soundEnabled, toggleSound } = useSoundFX();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(p.name || '');
  const [syncId, setSyncIdState] = useState('');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Restore by Sync ID state
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Google Play Games state
  const [pgPlayer, setPgPlayer] = useState<PlayGamesPlayer | null>(null);
  const [pgLoading, setPgLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleManualPurge = async () => {
    setCleaning(true);
    try {
      playTapSound();
      await executeAutoHealingClean('manual');
      g.notify('Engine refreshed · Memory cache cleared · Smooth 60 FPS restored.');
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    getSyncId().then(setSyncIdState);
    checkPlayGamesAuth().then(res => {
      if (res.isAuthenticated && res.player) {
        setPgPlayer(res.player);
      }
    }).catch(() => {});
  }, [g.user, p.id]);

  const handlePlayGamesSignIn = async () => {
    setPgLoading(true);
    try {
      const res = await signInPlayGames();
      if (res.isAuthenticated && res.player) {
        setPgPlayer(res.player);
        Alert.alert('Play Games Connected', `Welcome, ${res.player.displayName}! Google Play Games is connected.`);
        g.notify(`Connected as ${res.player.displayName}!`);
      } else if (res.error) {
        Alert.alert('Google Play Games Status', res.error);
        g.notify(res.error);
      }
    } catch (e: any) {
      Alert.alert('Play Games Error', e?.message || String(e));
    } finally {
      setPgLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup') {
      const res = await g.signupWithEmail(cleanEmail, password.trim(), name.trim() || p.name);
      if (!res.success) {
        if (res.error?.toLowerCase().includes('already registered')) {
          setError('This email is already registered. Please switch to SIGN IN above.');
        } else {
          setError(res.error || 'Failed to sign up.');
        }
      }
    } else {
      const res = await g.loginWithEmail(cleanEmail, password.trim());
      if (!res.success) {
        setError(res.error || 'Failed to sign in.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    const res = await g.loginWithGoogle();
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await g.syncNow();
    setSyncing(false);
  };

  const handleRestoreSync = async () => {
    if (!restoreInput.trim()) return;
    setRestoring(true);
    const ok = await g.restoreAccount(restoreInput.trim().toUpperCase());
    if (ok) {
      setSyncIdState(restoreInput.trim().toUpperCase());
      setShowRestore(false);
      setRestoreInput('');
    }
    setRestoring(false);
  };

  return (
    <View testID="phone-profile-screen">
      <Label style={s.kicker}>YOUR RIDER PASSPORT</Label>
      <Label display style={s.title}>Account & Cloud Save.</Label>

      {/* Rider Card */}
      <View style={s.riderCard}>
        <View style={s.riderTop}>
          <View style={s.avatarBox}>
            <Icon name="person" size={28} color={c.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Label display style={s.riderName}>{p.name}</Label>
              <View style={s.levelBadge}>
                <Label style={s.levelBadgeText}>LVL {Math.floor(p.xp / 100) + 1}</Label>
              </View>
            </View>
            <Label style={s.riderSub}>
              {g.user ? g.user.email : 'Playing as Guest'}
            </Label>
          </View>
        </View>

        <View style={s.statsDivider} />

        <View style={s.statsRow}>
          <View style={s.statCol}>
            <Label style={s.statLabel}>BALANCE</Label>
            <Coin amount={p.balance} small />
          </View>
          <View style={s.statCol}>
            <Label style={s.statLabel}>DELIVERIES</Label>
            <Label display style={s.statNum}>{p.deliveries}</Label>
          </View>
          <View style={s.statCol}>
            <Label style={s.statLabel}>TOTAL XP</Label>
            <Label display style={s.statNum}>{p.xp}</Label>
          </View>
        </View>
      </View>

      {/* Authenticated Rider Details */}
      {g.user ? (
        <View style={s.authActiveCard}>
          <View style={s.authActiveHeader}>
            <Icon name="checkmark-circle" size={22} color={c.teal} />
            <View style={{ flex: 1 }}>
              <Label display style={s.authActiveTitle}>Authenticated Rider</Label>
              <Label style={s.authActiveEmail}>{g.user.email}</Label>
            </View>
            <View style={s.verifiedBadge}>
              <Label style={s.verifiedBadgeText}>VERIFIED ✓</Label>
            </View>
          </View>

          <View style={s.accountDetailsBox}>
            <View style={s.detailRow}>
              <Label style={s.detailKey}>Supabase User ID</Label>
              <Label style={s.detailVal} numberOfLines={1}>{g.user.id}</Label>
            </View>
            <View style={s.detailRow}>
              <Label style={s.detailKey}>Cloud Sync Status</Label>
              <Label style={[s.detailVal, { color: c.teal, fontWeight: '800' }]}>Active & Synced</Label>
            </View>
            <View style={s.detailRow}>
              <Label style={s.detailKey}>Device Sync Code</Label>
              <Label style={s.detailVal}>{syncId || '...'}</Label>
            </View>
            <View style={s.detailRow}>
              <Label style={s.detailKey}>Cloud Boost</Label>
              <Label style={[s.detailVal, { color: c.brand, fontWeight: '800' }]}>
                {p.auth_boost_claimed ? '⚡ +100 Coins Claimed' : '⚡ Eligible for +100 Boost'}
              </Label>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button
              testID="sync-cloud-now-button"
              title={syncing ? 'SYNCING...' : 'SYNC NOW'}
              onPress={handleSyncNow}
              loading={syncing}
              icon="cloud-upload-outline"
              style={{ flex: 1, minHeight: 46 }}
            />
            <Button
              testID="logout-button"
              title="LOG OUT"
              onPress={g.logout}
              loading={g.authLoading}
              secondary
              icon="log-out-outline"
              style={{ flex: 1, minHeight: 46 }}
            />
          </View>
        </View>
      ) : (
        /* Guest / Unauthenticated Rider Flow */
        <View style={s.guestCard}>
          {/* Boost Banner */}
          <View style={s.boostBanner}>
            <View style={s.boostIcon}>
              <Icon name="flash" size={24} color={c.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Label display style={s.boostTitle}>⚡ CLOUD BOOST: +100 COINS</Label>
              <Label style={s.boostDesc}>
                Create an account or sign in to get +100 free coins, full bike repair, and cross-device cloud sync!
              </Label>
            </View>
          </View>

          {/* Mode Switcher */}
          <View style={s.modeSwitcher}>
            <Pressable
              testID="auth-mode-signup"
              onPress={() => { setAuthMode('signup'); setError(''); }}
              style={[s.modeBtn, authMode === 'signup' && s.modeBtnActive]}
            >
              <Label style={[s.modeBtnText, authMode === 'signup' && s.modeBtnTextActive]}>
                CREATE ACCOUNT
              </Label>
            </Pressable>
            <Pressable
              testID="auth-mode-signin"
              onPress={() => { setAuthMode('signin'); setError(''); }}
              style={[s.modeBtn, authMode === 'signin' && s.modeBtnActive]}
            >
              <Label style={[s.modeBtnText, authMode === 'signin' && s.modeBtnTextActive]}>
                SIGN IN
              </Label>
            </Pressable>
          </View>

          {/* Error Banner */}
          {!!error && (
            <View style={s.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={c.error} />
              <Label style={s.errorText}>{error}</Label>
            </View>
          )}

          {/* Form Fields */}
          <View style={s.form}>
            {authMode === 'signup' && (
              <View style={s.inputGroup}>
                <Label style={s.inputLabel}>COURIER / RIDER NAME</Label>
                <TextInput
                  testID="auth-name-input"
                  placeholder="Rider name"
                  placeholderTextColor={c.muted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  style={s.input}
                />
              </View>
            )}

            <View style={s.inputGroup}>
              <Label style={s.inputLabel}>EMAIL ADDRESS</Label>
              <TextInput
                testID="auth-email-input"
                placeholder="rider@chilldash.com"
                placeholderTextColor={c.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={s.input}
              />
            </View>

            <View style={s.inputGroup}>
              <Label style={s.inputLabel}>PASSWORD</Label>
              <TextInput
                testID="auth-password-input"
                placeholder="At least 6 characters"
                placeholderTextColor={c.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                style={s.input}
              />
            </View>

            <View style={s.noVerificationNote}>
              <Icon name="checkmark-circle-outline" size={14} color={c.teal} />
              <Label style={s.noVerificationText}>
                Instant access — no email verification wait required!
              </Label>
            </View>

            <Button
              testID="email-auth-submit-button"
              title={authMode === 'signup' ? 'SIGN UP (+100 COINS BOOST)' : 'LOG IN TO ACCOUNT'}
              onPress={handleEmailAuth}
              loading={g.authLoading}
              icon={authMode === 'signup' ? 'sparkles' : 'log-in-outline'}
              style={{ marginTop: 10 }}
            />

            {/* Social Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Label style={s.dividerText}>OR CONTINUE WITH</Label>
              <View style={s.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <Pressable
              testID="google-auth-button"
              onPress={handleGoogleAuth}
              disabled={g.authLoading}
              style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.7 }]}
            >
              {g.authLoading ? (
                <ActivityIndicator color={c.onSurface} />
              ) : (
                <>
                  <Icon name="logo-google" size={18} color="#DB4437" />
                  <Label style={s.googleBtnText}>Continue with Google</Label>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Legacy Sync ID Info & Restore */}
      <View style={s.syncIdCard}>
        <View style={s.syncIdTop}>
          <Icon name="phone-portrait-outline" size={16} color={c.teal} />
          <Label style={s.syncIdTitle}>Device Sync Code</Label>
        </View>
        <Label style={s.syncIdCode}>{syncId || 'Generating...'}</Label>
        <Label style={s.syncIdDesc}>
          Every device has a unique sync ID. Authenticate above to permanently lock your progress to your account across all installs!
        </Label>

        {!showRestore ? (
          <Pressable
            testID="toggle-restore-button"
            onPress={() => setShowRestore(true)}
            style={s.restoreToggle}
          >
            <Icon name="swap-horizontal" size={14} color={c.teal} />
            <Label style={s.restoreToggleText}>Restore from another device's Sync Code</Label>
          </Pressable>
        ) : (
          <View style={s.restoreForm}>
            <TextInput
              testID="restore-sync-code-input"
              placeholder="Enter Sync Code (e.g. CD-XXXX-XXXX)"
              placeholderTextColor={c.muted}
              value={restoreInput}
              onChangeText={setRestoreInput}
              autoCapitalize="characters"
              autoCorrect={false}
              style={s.input}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                testID="confirm-restore-button"
                onPress={handleRestoreSync}
                disabled={restoring || !restoreInput.trim()}
                style={[s.restoreConfirm, (!restoreInput.trim() || restoring) && { opacity: 0.6 }]}
              >
                <Label style={s.restoreConfirmText}>{restoring ? 'Restoring...' : 'Restore Save'}</Label>
              </Pressable>
              <Pressable
                onPress={() => setShowRestore(false)}
                style={s.restoreCancel}
              >
                <Label style={s.restoreCancelText}>Cancel</Label>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Google Play Games Hub */}
      <View testID="profile-play-games-card" style={s.syncIdCard}>
        <View style={s.syncIdTop}>
          <Icon name="game-controller-outline" size={18} color={c.teal} />
          <Label style={s.syncIdTitle}>Google Play Games</Label>
        </View>
        <Label style={[s.syncIdCode, { fontSize: 16 }]}>
          {pgPlayer ? pgPlayer.displayName : 'Not Connected'}
        </Label>
        <Label style={s.syncIdDesc}>
          {pgPlayer
            ? `Connected as ${pgPlayer.displayName} (${pgPlayer.playerId || 'Active ID'}). Leaderboards & achievements sync automatically.`
            : 'Connect your Google Play Games profile to unlock achievements and climb the global rider ranks.'}
        </Label>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {pgPlayer ? (
            <>
              <Pressable
                testID="profile-pg-achievements-btn"
                onPress={() => showPlayGamesAchievements()}
                style={s.restoreConfirm}
              >
                <Label style={s.restoreConfirmText}>Achievements</Label>
              </Pressable>
              <Pressable
                testID="profile-pg-leaderboards-btn"
                onPress={() => showPlayGamesLeaderboards()}
                style={[s.restoreConfirm, { backgroundColor: c.butter }]}
              >
                <Label style={[s.restoreConfirmText, { color: c.onSurface }]}>Leaderboards</Label>
              </Pressable>
            </>
          ) : (
            <Pressable
              testID="profile-pg-signin-btn"
              onPress={handlePlayGamesSignIn}
              disabled={pgLoading}
              style={[s.restoreConfirm, pgLoading && { opacity: 0.6 }]}
            >
              <Label style={s.restoreConfirmText}>{pgLoading ? 'Connecting...' : 'Connect Play Games'}</Label>
            </Pressable>
          )}
        </View>
      </View>

      {/* Game Audio & Sound FX Card */}
      <View style={s.soundCard}>
        <View style={s.soundTop}>
          <View style={s.soundIconBox}>
            <Icon name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={20} color={c.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.soundTitle}>Sound Effects (SFX)</Label>
            <Label style={s.soundSubtitle}>{soundEnabled ? 'Interactive audio cues, chimes & taps active' : 'All sound effects muted'}</Label>
          </View>
          <Pressable
            testID="settings-sound-toggle-switch"
            accessibilityRole="switch"
            accessibilityState={{ checked: soundEnabled }}
            onPress={toggleSound}
            style={[s.soundToggleBtn, soundEnabled ? s.soundToggleBtnOn : s.soundToggleBtnOff]}
          >
            <Label style={[s.soundToggleText, soundEnabled ? s.soundToggleTextOn : s.soundToggleTextOff]}>
              {soundEnabled ? 'ON' : 'OFF'}
            </Label>
          </Pressable>
        </View>

        {soundEnabled && (
          <View style={s.soundTestRow}>
            <Pressable
              onPress={() => playTapSound()}
              style={({ pressed }) => [s.soundTestPill, pressed && { opacity: 0.7 }]}
            >
              <Label style={s.soundTestLabel}>Tap</Label>
            </Pressable>
            <Pressable
              onPress={() => playCoinSound()}
              style={({ pressed }) => [s.soundTestPill, pressed && { opacity: 0.7 }]}
            >
              <Label style={s.soundTestLabel}>Coin</Label>
            </Pressable>
            <Pressable
              onPress={() => playHornSound()}
              style={({ pressed }) => [s.soundTestPill, pressed && { opacity: 0.7 }]}
            >
              <Label style={s.soundTestLabel}>Horn</Label>
            </Pressable>
            <Pressable
              onPress={() => playDeliverSound()}
              style={({ pressed }) => [s.soundTestPill, pressed && { opacity: 0.7 }]}
            >
              <Label style={s.soundTestLabel}>Victory</Label>
            </Pressable>
          </View>
        )}
      </View>

      {/* Engine & Performance Optimization Card */}
      <View testID="profile-engine-card" style={s.soundCard}>
        <View style={s.soundTop}>
          <View style={[s.soundIconBox, { backgroundColor: c.mint }]}>
            <Icon name="speedometer-outline" size={20} color={c.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.soundTitle}>Smooth Engine Watchdog</Label>
            <Label style={s.soundSubtitle}>Auto-cleans memory cache & heals micro-stutters in real time</Label>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button
            testID="profile-purge-cache-button"
            title={cleaning ? 'OPTIMIZING ENGINE...' : 'OPTIMIZE & PURGE CACHE'}
            onPress={handleManualPurge}
            disabled={cleaning}
            loading={cleaning}
            icon="flash-outline"
            style={{ backgroundColor: c.brand }}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  kicker: { fontSize: 8, letterSpacing: 1.15, color: c.teal, fontWeight: '800', marginBottom: 8 },
  title: { fontSize: 26, letterSpacing: -0.4, marginBottom: 16 },
  riderCard: {
    backgroundColor: c.butter,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.onSurface,
    padding: 16,
    marginBottom: 16,
  },
  riderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.onSurface,
  },
  riderName: { fontSize: 18 },
  riderSub: { fontSize: 10, color: c.muted, marginTop: 2 },
  levelBadge: {
    backgroundColor: c.brand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.onSurface,
  },
  levelBadgeText: { fontSize: 9, fontWeight: '800', color: c.onSurface },
  statsDivider: { height: 1, backgroundColor: c.onSurface, opacity: 0.15, marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCol: { alignItems: 'center' },
  statLabel: { fontSize: 8, fontWeight: '800', color: c.teal, letterSpacing: 1, marginBottom: 4 },
  statNum: { fontSize: 16 },
  authActiveCard: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: c.teal,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  authActiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authActiveTitle: { fontSize: 16 },
  authActiveEmail: { fontSize: 11, color: c.muted, marginTop: 2 },
  verifiedBadge: {
    backgroundColor: c.mint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.teal,
  },
  verifiedBadgeText: { fontSize: 8, fontWeight: '800', color: c.teal },
  accountDetailsBox: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { fontSize: 10, color: c.muted },
  detailVal: { fontSize: 10, fontWeight: '700', maxWidth: '60%' },
  guestCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 16,
  },
  boostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.butter,
    padding: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: c.brand,
    marginBottom: 14,
  },
  boostIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostTitle: { fontSize: 12, color: c.onSurface },
  boostDesc: { fontSize: 9, color: c.muted, marginTop: 2, lineHeight: 13 },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: c.brand },
  modeBtnText: { fontSize: 10, fontWeight: '800', color: c.muted },
  modeBtnTextActive: { color: c.onSurface },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: c.error,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 10, color: c.error, flex: 1 },
  form: { gap: 10 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 8, fontWeight: '800', color: c.teal, letterSpacing: 1 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: c.surface,
    color: c.onSurface,
  },
  noVerificationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  noVerificationText: { fontSize: 9, color: c.teal, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { fontSize: 8, fontWeight: '800', color: c.muted },
  googleBtn: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderRadius: 14,
  },
  googleBtnText: { fontSize: 12, fontWeight: '800', color: c.onSurface },
  syncIdCard: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  syncIdTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncIdTitle: { fontSize: 11, fontWeight: '800', color: c.teal },
  syncIdCode: { fontSize: 13, fontWeight: '800', color: c.onSurface, marginTop: 4 },
  syncIdDesc: { fontSize: 9, color: c.muted, marginTop: 4, lineHeight: 14 },
  restoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  restoreToggleText: { fontSize: 10, fontWeight: '800', color: c.teal, textDecorationLine: 'underline' },
  restoreForm: {
    marginTop: 10,
    padding: 10,
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  restoreConfirm: {
    backgroundColor: c.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restoreConfirmText: { fontSize: 11, fontWeight: '800', color: c.onSurface },
  restoreCancel: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  restoreCancelText: { fontSize: 11, color: c.muted },
  soundCard: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  soundTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  soundIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundTitle: { fontSize: 12, fontWeight: '800' },
  soundSubtitle: { fontSize: 9, color: c.muted, marginTop: 2 },
  soundToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundToggleBtnOn: { backgroundColor: c.brand, borderColor: c.onSurface },
  soundToggleBtnOff: { backgroundColor: c.surfaceTertiary, borderColor: c.border },
  soundToggleText: { fontSize: 11, fontWeight: '800' },
  soundToggleTextOn: { color: c.onSurface },
  soundToggleTextOff: { color: c.muted },
  soundTestRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  soundTestPill: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  soundTestLabel: { fontSize: 9, fontWeight: '800', color: c.teal },
}));
