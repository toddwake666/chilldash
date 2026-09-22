import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Icon, Label } from './ui';

const BOSS_AVATAR = require('@/assets/images/boss_avatar.jpg');

export function TutorialOverlay() {
  const g = useGame();
  const s = useStyles();
  const { colors: c } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const p = g.profile;
  const isTutorialActive = !!(p && p.tutorial_active && !p.tutorial_completed);
  const step = p?.tutorial_step || 1;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!isTutorialActive) return null;
  if (g.phone && step !== 5) return null;

  const handleSkip = () => {
    g.skipTutorial?.();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: "The Boss's Dreambike",
          text: "Welcome to Chill Dash, rookie! Today is your first shift. You see that 1000cc machine? My personal VIPER RR. I'm trusting you with the keys for your training shift. Treat her well!",
          actionText: "TAKE THE KEYS (VIPER RR)",
          action: () => g.borrowViper?.(),
          location: "Garage",
        };
      case 2:
        return {
          title: "Rain Kit Check",
          text: "Rule #1 of the road: Weather turns fast! If rain hits without a rain kit, your health will steadily drain. You can buy outside, but emergency road dispatch is costly. Pack one now — this first kit is free on the company!",
          actionText: "PACK RAIN KIT (0 COINS)",
          action: () => g.packFreeRainKit?.(),
          location: "Garage",
        };
      case 3:
        return {
          title: "Hit the Streets",
          text: "Your kit is packed and the superbike is prepped. Tap 'LET’S HIT THE STREETS' below to head out into the sunny city!",
          actionText: null,
          location: "Garage",
        };
      case 4:
        return {
          title: "Your Delivery Phone",
          text: "You start offline by default. This smartphone runs your orders, GPS, and bike care. Tap MY PHONE in the bottom right to open it.",
          actionText: null,
          location: "City",
        };
      case 5:
        return {
          title: "Going Online & App Tour",
          text: "Tap the switch at the bottom to go ONLINE! Then explore the GPS (5 towns across the region), Food (eating keeps health up), and Care (track vitals & bike condition). Once done, tap (X) to return.",
          actionText: null,
          location: "City",
        };
      case 6:
      case 7:
        return {
          title: "Your First Delivery",
          text: g.order?.status === 'accepted'
            ? "Order accepted! Follow the yellow route to the shop. Picking up is timed, but delivering is not. Ride smooth and collect the food!"
            : g.order?.status === 'picked_up'
            ? "Food collected safely! Now follow the route to the customer's doorstep and deliver."
            : (p?.deliveries || 0) >= 1
            ? "Great job! You're a fast learner. Now open MY PHONE, head to the Goals tab, and claim your 'First smile' milestone rewards!"
            : "Complete your first delivery! When an order notification pings, tap it to accept.",
          actionText: (p?.deliveries || 0) >= 1 ? "OPEN PHONE GOALS" : null,
          action: () => g.openPhone('milestones'),
          location: "City",
        };
      case 8:
        return {
          title: "Refueling Mission",
          text: "The Viper RR has a racing heart and drinks fuel fast. I've marked the route to the nearest Fuel & Air station. Ride there and refuel!",
          actionText: "SET GPS TO FUEL STATION",
          action: () => g.navigateToFuel?.(),
          location: "City",
        };
      case 9:
        return {
          title: "Pick Up the Boss",
          text: "I'm currently inspecting property at Shimultala Heights in Bongaon. Ride across the bridge and pick me up!",
          actionText: "NAVIGATE TO SHIMULTALA HEIGHTS",
          action: () => g.navigateToBoss?.(),
          location: "City",
        };
      case 10:
        return {
          title: "Return to Garage",
          text: g.screen === 'garage'
            ? "Welcome back home! Entering the garage fully restores your health and energy for free. Now return the keys to the Viper RR to complete your training!"
            : "Shift complete! Head back to Home Sweet Garage in Sunnyvale. Route is highlighted on your GPS.",
          actionText: g.screen === 'garage' ? "RETURN KEYS & FINISH TRAINING" : "NAVIGATE TO GARAGE",
          action: g.screen === 'garage' ? () => g.finishTutorial?.() : () => g.navigateToGarage?.(),
          location: g.screen === 'garage' ? "Garage" : "City",
        };
      default:
        return null;
    }
  };

  const info = renderStepContent();
  if (!info) return null;

  // On city screen when phone is open during step 5, let phone stay visible without full blocking modal
  if (step === 5 && g.phone) {
    return (
      <View pointerEvents="box-none" style={s.miniBanner}>
        <View style={s.miniCard}>
          <Image source={BOSS_AVATAR} style={s.miniAvatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Label style={s.miniEyebrow}>MR. CHEN · DISTRICT MANAGER</Label>
            <Label style={s.miniText}>
              {g.profile?.online
                ? "Check GPS (5 towns), Food, and Care tabs! When done, close the phone with (X)."
                : "Toggle the switch below to go ONLINE and start taking orders!"}
            </Label>
          </View>
          <Pressable onPress={handleSkip} style={s.skipMiniBtn}>
            <Label style={s.skipMiniText}>Skip</Label>
          </Pressable>
        </View>
      </View>
    );
  }

  // During active riding in City (steps 4, 6, 7, 8, 9, 10 while riding)
  const isPassiveStep = [4, 6, 7, 8, 9, 10].includes(step) && g.screen === 'city' && !info.actionText;

  if (isPassiveStep) {
    return (
      <View pointerEvents="box-none" style={s.hudBanner}>
        <View style={s.hudCard}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image source={BOSS_AVATAR} style={s.hudAvatar} contentFit="cover" />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <View style={s.hudRow}>
              <Label style={s.hudStep}>TRAINING · STEP {step}/10</Label>
              <Pressable onPress={handleSkip}><Label style={s.hudSkip}>Skip</Label></Pressable>
            </View>
            <Label display style={s.hudTitle}>{info.title}</Label>
            <Label style={s.hudText} numberOfLines={2}>{info.text}</Label>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={s.modalBackdrop}>
        <Animated.View style={[s.dialogCard, { transform: [{ scale: pulseAnim }] }]}>
          {/* Header with Skip Button */}
          <View style={s.cardHeader}>
            <View style={s.stepPill}>
              <Icon name="school-outline" size={13} color={c.teal} />
              <Label style={s.stepPillText}>TRAINING SHIFT · STEP {step}/10</Label>
            </View>
            <Pressable testID="skip-tutorial-button" onPress={handleSkip} style={s.skipBtn}>
              <Label style={s.skipBtnText}>SKIP TUTORIAL</Label>
              <Icon name="play-forward" size={12} color={c.muted} />
            </Pressable>
          </View>

          {/* Boss Mentor Profile */}
          <View style={s.bossRow}>
            <View style={s.avatarWrapper}>
              <Image source={BOSS_AVATAR} style={s.avatar} contentFit="cover" />
              <View style={s.onlineBadge} />
            </View>
            <View style={s.bossDetails}>
              <Label display style={s.bossName}>Mr. Chen</Label>
              <Label style={s.bossRole}>DISTRICT OPERATIONS MANAGER</Label>
              <View style={s.reputationRow}>
                <Icon name="shield-checkmark" size={13} color={c.teal} />
                <Label style={s.reputationText}>Sunnyvale HQ · Veteran Rider</Label>
              </View>
            </View>
          </View>

          {/* Speech Dialogue Bubble */}
          <View style={s.speechBubble}>
            <Label display style={s.dialogTitle}>{info.title}</Label>
            <Label style={s.dialogBody}>{info.text}</Label>
          </View>

          {/* Action Button */}
          {info.actionText ? (
            <Button
              testID="tutorial-action-button"
              title={info.actionText}
              icon="arrow-forward"
              onPress={info.action}
              style={s.actionButton}
            />
          ) : (
            <Button
              testID="tutorial-got-it-button"
              title="GOT IT, LET'S ROLL"
              icon="checkmark"
              onPress={() => g.advanceTutorialStep?.(step + 1)}
              style={s.actionButton}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(c => ({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: c.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: c.onSurface,
    padding: 18,
    shadowColor: c.onSurface,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stepPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.teal,
    letterSpacing: 0.5,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  skipBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.muted,
  },
  bossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: c.brand,
    overflow: 'hidden',
    backgroundColor: c.butter,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.success,
    borderWidth: 2,
    borderColor: c.surface,
  },
  bossDetails: {
    flex: 1,
  },
  bossName: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  bossRole: {
    fontSize: 9,
    fontWeight: '800',
    color: c.teal,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  reputationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  reputationText: {
    fontSize: 9,
    color: c.muted,
  },
  speechBubble: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 6,
    color: c.onSurface,
  },
  dialogBody: {
    fontSize: 12,
    lineHeight: 18,
    color: c.onSurface,
  },
  actionButton: {
    marginTop: 4,
  },
  hudBanner: {
    position: 'absolute',
    top: 110,
    left: 18,
    right: 18,
  },
  hudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: c.onSurface,
    padding: 10,
    shadowColor: c.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  hudAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: c.brand,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudStep: {
    fontSize: 8,
    fontWeight: '800',
    color: c.teal,
    letterSpacing: 0.5,
  },
  hudSkip: {
    fontSize: 9,
    color: c.muted,
    textDecorationLine: 'underline',
  },
  hudTitle: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  hudText: {
    fontSize: 9.5,
    color: c.muted,
    lineHeight: 14,
    marginTop: 2,
  },
  miniBanner: {
    position: 'absolute',
    bottom: 85,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.onSurface,
    padding: 8,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.brand,
  },
  miniEyebrow: {
    fontSize: 8,
    fontWeight: '800',
    color: c.teal,
  },
  miniText: {
    fontSize: 9.5,
    color: c.onSurface,
    lineHeight: 14,
  },
  skipMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipMiniText: {
    fontSize: 9,
    color: c.muted,
    textDecorationLine: 'underline',
  },
}));
