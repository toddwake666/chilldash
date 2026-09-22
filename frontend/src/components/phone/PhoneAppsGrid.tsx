import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import { useGame, PhoneApp, PhoneTab } from '@/src/game/GameContext';
import { Icon, Label } from '@/src/components/ui';
import { playTapSound } from '@/src/game/sounds';

interface PhoneAppsGridProps {
  onOpenApp: (app: PhoneApp, tab?: PhoneTab) => void;
  highlightChat?: boolean;
  highlightRider?: boolean;
}

interface GridAppItem {
  id: string;
  app: PhoneApp;
  tab?: PhoneTab;
  testID: string;
  title: string;
  desc: string;
  icon: string;
  isBike?: boolean;
  color: string;
  iconColor?: string;
  disabled?: boolean;
  highlight?: boolean;
  pulseBadge?: boolean;
  badge?: string | number;
  actionPrompt?: string;
}

export function PhoneAppsGrid({ onOpenApp, highlightChat, highlightRider }: PhoneAppsGridProps) {
  const { colors: c } = useTheme();
  const g = useGame();
  const p = g.profile;

  const shouldPulse = highlightChat || highlightRider;
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    if (shouldPulse) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [shouldPulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const hasUnreadChat = highlightChat || (!p?.partho_quest_completed && (p?.partho_chat_stage ?? 0) < 2);

  const curBike = p && p.bikes && p.bike ? p.bikes[p.bike] : null;

  const apps: GridAppItem[] = [
    // 1. Dash Rider App
    {
      id: 'rider',
      app: 'rider',
      tab: 'orders',
      testID: 'app-icon-dash-rider',
      title: 'Dash Rider',
      desc: highlightRider ? 'Go online' : g.order ? '1 Order' : g.profile?.online ? 'Online' : 'Orders & Map',
      icon: 'moped',
      isBike: true,
      color: c.brand,
      iconColor: c.onSurface,
      highlight: highlightRider,
      pulseBadge: highlightRider,
      badge: highlightRider ? '!' : (g.order ? 1 : undefined),
      actionPrompt: highlightRider ? 'GO ONLINE' : undefined,
      disabled: highlightChat,
    },
    // 2. Chat / Messages App
    {
      id: 'chat',
      app: 'chat',
      testID: 'app-icon-chat',
      title: 'Messages',
      desc: 'Partho & Friends',
      icon: 'chatbubble-ellipses',
      color: '#48BB78',
      iconColor: '#FFFFFF',
      highlight: highlightChat,
      pulseBadge: hasUnreadChat,
      actionPrompt: highlightChat ? 'OPEN' : undefined,
    },
    // 3. Dash Wallet App
    {
      id: 'wallet',
      app: 'wallet',
      tab: 'wallet',
      testID: 'app-icon-wallet',
      title: 'Dash Wallet',
      desc: p ? `${p.balance} Coins` : 'Coins & Shop',
      icon: 'wallet',
      color: c.teal,
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
    // 4. GPS Maps
    {
      id: 'gps',
      app: 'rider',
      tab: 'gps',
      testID: 'app-icon-gps',
      title: 'GPS Maps',
      desc: 'City Navigation',
      icon: 'navigate',
      color: '#4299E1',
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
    // 5. Food Bag
    {
      id: 'food',
      app: 'rider',
      tab: 'food',
      testID: 'app-icon-food',
      title: 'Food Bag',
      desc: p ? `${Object.values(p.food || {}).reduce((a, b) => a + b, 0)} Snacks` : 'Snacks & Energy',
      icon: 'restaurant',
      color: '#ED8936',
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
    // 6. Rain Kit
    {
      id: 'kit',
      app: 'rider',
      tab: 'kit',
      testID: 'app-icon-kit',
      title: 'Rain Kit',
      desc: p?.gear === 'raincoat' ? 'Wearing' : 'Weather Gear',
      icon: 'umbrella',
      color: '#805AD5',
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
    // 7. Bike Care
    {
      id: 'care',
      app: 'rider',
      tab: 'care',
      testID: 'app-icon-care',
      title: 'Bike Care',
      desc: curBike ? `${Math.round(curBike.condition)}% Health` : 'Maintenance',
      icon: 'construct',
      color: '#DD6B20',
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
    // 8. Goals & XP
    {
      id: 'milestones',
      app: 'rider',
      tab: 'milestones',
      testID: 'app-icon-milestones',
      title: 'Goals & XP',
      desc: p ? `${p.xp} XP` : 'Achievements',
      icon: 'trophy',
      color: '#ECC94B',
      iconColor: c.onSurface,
      disabled: highlightChat,
    },
    // 9. Profile & Cloud Save
    {
      id: 'profile',
      app: 'rider',
      tab: 'profile',
      testID: 'app-icon-profile',
      title: 'Profile',
      desc: g.user ? 'Cloud Synced' : 'Account & Save',
      icon: 'person-circle',
      color: '#38B2AC',
      iconColor: '#FFFFFF',
      disabled: highlightChat,
    },
  ];

  // Group apps strictly into 3 rows of 3 to guarantee non-wrapping grid
  const rows = [
    apps.slice(0, 3),
    apps.slice(3, 6),
    apps.slice(6, 9),
  ];

  return (
    <Animated.View entering={FadeIn.duration(250)} style={s.container}>
      {/* Phone Wallpaper Header / Widget */}
      <View style={[s.widgetCard, { backgroundColor: c.butter, borderColor: c.borderStrong }]}>
        <View style={s.widgetRow}>
          <View>
            <Label style={s.widgetKicker}>CHILL OS · HOMESCREEN</Label>
            <Label display style={s.widgetTitle}>Rider Mobile</Label>
          </View>
          <View style={[s.widgetBattery, { backgroundColor: c.glass }]}>
            <Icon name="wifi-outline" size={14} color={c.teal} />
            <Icon name="battery-charging-outline" size={16} color={c.teal} />
            <Label style={s.batteryText}>100%</Label>
          </View>
        </View>
        <Label style={s.widgetSub}>
          Tap any app icon below to switch between driver services, contacts, and finances.
        </Label>
        <Pressable
          testID="apps-grid-login-button"
          accessibilityRole="button"
          accessibilityLabel="Open Account Login and Cloud Save"
          onPress={() => {
            playTapSound();
            onOpenApp('rider', 'profile');
          }}
          style={({ pressed }) => [
            s.accountPill,
            { backgroundColor: c.surface, borderColor: c.borderStrong },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
            <Icon name={g.user ? "person-circle" : "person-circle-outline"} size={16} color={g.user ? c.teal : c.onSurface} />
            <Label style={s.accountPillText} numberOfLines={1}>
              {g.user ? `Account: ${g.user.email}` : 'Login / Cloud Save (+100 Boost)'}
            </Label>
          </View>
          <Icon name="chevron-forward" size={14} color={c.muted} />
        </Pressable>
      </View>

      {/* App Grid: Strictly 3x3 Responsive Grid */}
      <View style={s.grid}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={s.gridRow}>
            {row.map(app => (
              <View key={app.id} style={s.gridCol}>
                <Pressable
                  testID={app.testID}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${app.title} App`}
                  disabled={app.disabled}
                  onPress={() => {
                    playTapSound();
                    onOpenApp(app.app, app.tab);
                  }}
                  style={({ pressed }) => [
                    s.appCard,
                    {
                      backgroundColor: c.surface,
                      borderColor: app.highlight ? '#E53E3E' : c.borderStrong,
                    },
                    app.highlight && s.highlightBorder,
                    app.disabled && { opacity: 0.4 },
                    pressed && s.pressed,
                  ]}
                >
                  <View style={[s.iconTile, { backgroundColor: app.color }]}>
                    <Icon
                      name={app.icon}
                      bike={app.isBike}
                      size={app.isBike ? 28 : 24}
                      color={app.iconColor}
                    />
                  </View>
                  <Label display numberOfLines={1} style={s.appName}>{app.title}</Label>
                  <Label numberOfLines={1} style={s.appDesc}>{app.desc}</Label>

                  {app.pulseBadge && (
                    <Animated.View style={[s.unreadDot, pulseStyle]}>
                      <Label style={s.unreadDotText}>!</Label>
                    </Animated.View>
                  )}

                  {!app.pulseBadge && app.badge != null && (
                    <View style={[s.appBadge, { backgroundColor: c.coral }]}>
                      <Label style={s.badgeText}>{app.badge}</Label>
                    </View>
                  )}

                  {app.actionPrompt && (
                    <View style={s.actionPrompt}>
                      <Label style={s.actionPromptText}>{app.actionPrompt}</Label>
                    </View>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Helpful Hint Bar */}
      <View style={[s.dockBar, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
        <Icon name="information-circle-outline" size={16} color={c.teal} />
        <Label style={s.dockText}>
          Use the top-left arrow in any app to return to this screen anytime.
        </Label>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },
  widgetCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
  },
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  widgetKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  widgetTitle: {
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  widgetBattery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '800',
  },
  widgetSub: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.8,
    lineHeight: 15,
  },
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%',
  },
  gridCol: {
    flex: 1,
    paddingHorizontal: 3,
  },
  appCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
    minHeight: 102,
    justifyContent: 'center',
  },
  highlightBorder: {
    borderColor: '#E53E3E',
    borderWidth: 2,
    shadowColor: '#E53E3E',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 13,
  },
  appDesc: {
    fontSize: 9,
    opacity: 0.65,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 11,
  },
  appBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  actionPrompt: {
    marginTop: 4,
    backgroundColor: '#E53E3E',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionPromptText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  accountPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  dockText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
    opacity: 0.8,
  },
});
