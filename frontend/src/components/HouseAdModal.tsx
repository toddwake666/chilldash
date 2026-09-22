import React, { useEffect, useState } from 'react';
import { Image, Linking, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Coin, Icon, IconButton, Label } from './ui';

const APP_ICON = require('@/assets/images/icon.png');

export function HouseAdModal() {
  const g = useGame();
  const s = useStyles();
  const { colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const [secondsLeft, setSecondsLeft] = useState(15);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleContact = () => {
    const email = 'chilldash@manifesto.page';
    const subject = encodeURIComponent('Chill Dash Virtual Property Inquiry');
    const body = encodeURIComponent(
      'Hi Chill Dash Team,\n\nI am interested in owning virtual property in Chill Dash (Cafe/Office/Bridge/Road).\n\nPlease share details and availability across the 5 towns!\n'
    );
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`mailto:${email}`).catch(() => {
        g.notify('Contact us at: chilldash@manifesto.page');
      });
    });
  };

  const isReady = secondsLeft === 0;

  return (
    <Animated.View
      entering={ZoomIn.springify()}
      style={[s.card, { width: Math.min(width - 36, 400) }]}
      testID="house-ad-modal"
    >
      <View style={s.topRow}>
        <View style={[s.pill, isReady && s.pillReady]}>
          <Icon name={isReady ? 'checkmark-circle' : 'sparkles'} size={12} color={c.teal} />
          <Label style={s.pillText}>{isReady ? 'REWARD UNLOCKED' : 'VIRTUAL REAL ESTATE'}</Label>
        </View>
        {isReady ? (
          <IconButton
            testID="close-house-ad-button"
            name="close"
            label="Close ad"
            onPress={() => g.closeHouseAd(true)}
          />
        ) : (
          <View style={s.timerBadge}>
            <Icon name="timer-outline" size={13} color={c.teal} />
            <Label style={s.timerBadgeText}>{secondsLeft}s</Label>
          </View>
        )}
      </View>

      <View style={s.iconWrapper}>
        <Image source={APP_ICON} style={s.appIcon} resizeMode="contain" />
      </View>

      <Label display style={s.title}>
        Be a part of Chill Dash Eco System
      </Label>

      <Label style={s.subtitle}>
        Own virtual Property in our 5 towns (Cafe/office/Bridge/Road)
      </Label>

      <View style={s.perks}>
        <View style={s.perkRow}>
          <Icon name="cafe-outline" size={17} color={c.teal} />
          <Label style={s.perkText}>Brand a Café or Bakery in Sunnyvale & Pinecrest</Label>
        </View>
        <View style={s.perkRow}>
          <Icon name="business-outline" size={17} color={c.teal} />
          <Label style={s.perkText}>Name a Corporate Office in Bongaon & Habra</Label>
        </View>
        <View style={s.perkRow}>
          <Icon name="git-merge-outline" size={17} color={c.teal} />
          <Label style={s.perkText}>Sponsor Bridges & Forest Highway Billboards</Label>
        </View>
      </View>

      <View style={s.rewardNotice}>
        <Coin amount="+15" />
        <Label style={s.rewardNoticeText}>
          {isReady ? '+15 coins ready to claim!' : `Watch for 15s to claim +15 coins (${secondsLeft}s)`}
        </Label>
      </View>

      <Button
        testID="house-ad-contact-button"
        title="CONTACT: chilldash@manifesto.page"
        icon="mail-outline"
        onPress={handleContact}
        style={s.contactBtn}
      />

      {isReady ? (
        <Button
          testID="house-ad-claim-button"
          title="CLAIM +15 COINS & CLOSE"
          icon="checkmark-circle-outline"
          onPress={() => g.closeHouseAd(true)}
        />
      ) : (
        <View style={s.waitingBox}>
          <Icon name="time-outline" size={16} color={c.muted} />
          <Label style={s.waitingText}>Reward unlocks in {secondsLeft}s…</Label>
        </View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    padding: 22,
    borderRadius: 26,
    backgroundColor: c.surface,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: c.onSurface,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillReady: {
    backgroundColor: c.butter,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: c.teal,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.mint,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.teal,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: c.butter,
    borderWidth: 2,
    borderColor: c.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: c.onSurface,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  appIcon: {
    width: 78,
    height: 78,
    borderRadius: 18,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: c.muted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  perks: {
    width: '100%',
    backgroundColor: c.surfaceSecondary,
    borderRadius: 15,
    padding: 12,
    gap: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  perkText: {
    fontSize: 11,
    color: c.onSurface,
    flex: 1,
  },
  rewardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.mint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  rewardNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.teal,
  },
  contactBtn: {
    width: '100%',
    marginBottom: 10,
  },
  waitingBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.surfaceSecondary,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.muted,
  },
}));
