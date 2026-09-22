import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/src/game/GameContext';
import { api, Order } from '@/src/game/api';
import { countdown, distance, gameTime, nearestRoad, onFootpath } from '@/src/game/world';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Coin, Icon, Label } from './ui';
import { BikeArt } from './BikeArt';
import { RegionalGPS } from './RegionalGPS';
import { CareView, FoodView, KitView, MilestonesView } from './PhoneLife';
import { PhoneProfile } from './PhoneProfile';
import { getSyncId } from '@/src/game/supabase';
import { restoreProfileFromSyncCode } from '@/src/game/localEngine';
import { COIN_PACKS, CoinPack, getLiveProductPrices, buyCoinPack, playRewardedAd, ChillDashBanner } from '@/src/game/monetization';
import { ProPaywallCard } from './ProPaywallCard';
import { useSoundFX, playTapSound } from '@/src/game/sounds';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { PhoneAppsGrid } from './phone/PhoneAppsGrid';
import { PhoneChatApp } from './phone/PhoneChatApp';


function OrderView({ isNewLifeParthoPrompt }: { isNewLifeParthoPrompt?: boolean }) {
  const g = useGame(); const s = useStyles(); const { colors: c } = useTheme(); const o = g.order;
  const isGoOnlinePrompt =
    (!g.profile?.deliveries || g.profile?.deliveries === 0) &&
    !!g.profile?.partho_borrowed_express &&
    !g.profile?.online &&
    !o;

  const buttonDotPulse = useSharedValue(1);
  useEffect(() => {
    if (isGoOnlinePrompt) {
      buttonDotPulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 550 }),
          withTiming(1, { duration: 550 })
        ),
        -1,
        true
      );
    } else {
      buttonDotPulse.value = 1;
    }
  }, [isGoOnlinePrompt]);

  const buttonDotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonDotPulse.value }],
  }));

  if (!o) return <View testID="phone-no-orders" style={s.empty}>
    <View style={s.emptyArt}><BikeArt width={175} height={112} /></View>
    <Label display style={s.emptyTitle}>{g.profile!.online ? 'A quiet corner for now.' : 'A little break is good.'}</Label>
    <Label testID="dispatch-message" style={s.emptyText}>
      {isGoOnlinePrompt
        ? 'You have Partho’s Express bike! Tap GO ONLINE below to start receiving orders.'
        : isNewLifeParthoPrompt
        ? 'You got a message from Partho! Tap the back arrow (←) above to open Messages.'
        : (g.dispatch?.message || 'No orders from this location. Visit other places.')}
    </Label>
    {!!g.dispatch?.retry_after && <Label style={s.emptyText}>Checking nearby shops again in {g.dispatch.retry_after}s.</Label>}

    {isNewLifeParthoPrompt && (
      <View style={s.newLifePromptBanner} testID="new-life-banner">
        <Icon name="chatbubble-ellipses" size={16} color="#FFFFFF" />
        <Label style={s.newLifePromptBannerText}>You got a message from Partho! Tap the back arrow (←) above to open Messages.</Label>
      </View>
    )}

    {isGoOnlinePrompt && (
      <View style={s.goOnlinePromptBanner} testID="go-online-banner">
        <Icon name="radio-outline" size={16} color="#FFFFFF" />
        <Label style={s.goOnlinePromptBannerText}>Tap GO ONLINE below to receive your 1st order on The Express!</Label>
      </View>
    )}

    <View style={isGoOnlinePrompt ? s.goOnlineBtnWrap : undefined}>
      <Button
        testID="phone-go-online-button"
        title={g.profile!.online ? 'EXPLORE THE MAP' : 'GO ONLINE'}
        onPress={g.profile!.online ? () => g.setPhoneTab('gps') : g.toggleOnline}
        disabled={isNewLifeParthoPrompt || g.busy}
        loading={g.busy}
        icon={g.profile!.online ? 'map-outline' : 'power'}
        style={[isGoOnlinePrompt ? s.goOnlineHighlightBtn : undefined, isNewLifeParthoPrompt && { opacity: 0.4 }]}
      />
      {isGoOnlinePrompt && (
        <Animated.View style={[s.cornerRedDotButton, buttonDotPulseStyle]} />
      )}
    </View>
  </View>;
  const offered = o.status === 'offered', collecting = o.status === 'accepted';
  const target = collecting ? o.pickup : o.dropoff;
  const targetRoadPt = target ? nearestRoad(target).point : null;
  const distToTarget = target
    ? Math.min(distance(g.position.current, target), targetRoadPt ? distance(g.position.current, targetRoadPt) : Infinity)
    : Infinity;
  const near = !offered && distToTarget <= 55;
  return <View testID="phone-order-detail">
    <View style={s.orderHeading}><View><Label style={s.eyebrow}>{offered ? 'FRESH OFF THE PRESS' : collecting ? 'LET’S PICK IT UP' : 'ON THE HOME STRETCH'}</Label><Label display style={s.orderTitle}>{offered ? 'A good day to deliver.' : collecting ? 'Good things are waiting.' : 'One happy customer.'}</Label></View></View>
    <View style={s.orderReward}><View style={s.deliveryIcon}><Icon name="bag-handle-outline" size={28} /></View><View style={s.orderRewardCopy}><Label style={s.orderItem}>{o.item}</Label><Label style={s.orderItemSub}>A little something for {o.customer}</Label></View><Coin amount={`+${o.reward}`} /></View>
    <View style={s.routeCard}>
      <View style={s.stop}><View style={[s.stopIcon, collecting && s.activeStop]}><Icon name={o.status === 'picked_up' ? 'checkmark' : 'storefront-outline'} size={20} color={c.teal} /></View><View style={s.stopCopy}><Label style={s.stopLabel}>{o.status === 'picked_up' ? 'COLLECTED' : 'PICK UP FROM'}</Label><Label style={s.stopName}>{o.pickup.name}</Label><Label style={s.stopAddress}>{o.pickup.address}</Label></View></View>
      <View style={s.routeConnector}><View style={s.connectorLine} /><Label style={s.routeDistance}>{Math.round(distance(o.pickup, o.dropoff))} m {distance(o.pickup, o.dropoff) > 1500 ? 'across towns' : 'across the neighborhood'}</Label></View>
      <View style={s.stop}><View style={[s.stopIcon, o.status === 'picked_up' && s.activeStop]}><Icon name="location-outline" size={21} color={c.teal} /></View><View style={s.stopCopy}><Label style={s.stopLabel}>DELIVER TO</Label><Label style={s.stopName}>{o.dropoff.name}</Label><Label style={s.stopAddress}>{o.customer} · {o.dropoff.address}</Label></View></View>
    </View>
    <View style={s.promise}><Icon name={o.status === 'picked_up' ? 'heart-outline' : 'timer-outline'} color={c.teal} size={17} /><Label testID="phone-pickup-timer" style={s.promiseText}>{offered ? `You’ll have ${o.pickup_seconds >= 60 ? `${Math.floor(o.pickup_seconds / 60)}m ${o.pickup_seconds % 60 ? `${o.pickup_seconds % 60}s` : ''}` : `${o.pickup_seconds}s`} to collect after accepting. Delivery is untimed.` : collecting ? `Pick up in ${countdown(o.pickup_deadline, g.now)}. Timer keeps running with your phone open.` : 'Collected safely. No time limit to deliver.'}</Label></View>
    {offered ? (
      <>
        {isNewLifeParthoPrompt && (
          <View style={s.newLifePromptBanner} testID="new-life-order-banner">
            <Icon name="chatbubble-ellipses" size={16} color="#FFFFFF" />
            <Label style={s.newLifePromptBannerText}>Meet Partho first! Tap the back arrow (←) above to open Messages.</Label>
          </View>
        )}
        <Button testID="accept-order-button" title="ACCEPT DELIVERY" onPress={g.accept} disabled={isNewLifeParthoPrompt || g.busy} loading={g.busy} icon="arrow-forward" style={isNewLifeParthoPrompt ? { opacity: 0.4 } : undefined} />
        <Pressable testID="decline-order-button" onPress={g.decline} disabled={isNewLifeParthoPrompt || g.busy} style={[s.textButton, isNewLifeParthoPrompt && { opacity: 0.4 }]}><Label style={s.textButtonLabel}>Not this one</Label></Pressable>
      </>
    ) : (
      <>
        <Button testID="phone-continue-delivery-button" title={near ? collecting ? 'PICK UP ORDER' : 'DELIVER ORDER' : 'BACK TO THE STREETS'} onPress={near ? g.interact : () => { g.setPhone(false); if (g.screen === 'garage') g.headOut(); }} loading={g.busy} icon={near ? 'bag-check-outline' : 'navigate-outline'} />
        <Pressable testID="cancel-order-button" onPress={g.decline} disabled={g.busy} style={s.textButton}><Label style={s.textButtonLabel}>Cancel this delivery</Label></Pressable>
      </>
    )}
  </View>;
}
function WalletView() {
  const g = useGame(); const s = useStyles(); const { colors: c } = useTheme();
  const [history, setHistory] = useState<Order[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [syncId, setSyncIdState] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [displayedPacks, setDisplayedPacks] = useState<CoinPack[]>(COIN_PACKS);

  const load = () => {
    setLoading(true); setError('');
    api<Order[]>('/orders/history').then(setHistory).catch(e => setError(e.message)).finally(() => setLoading(false));
    getSyncId().then(setSyncIdState);
    getLiveProductPrices().then(({ coinPacks }) => {
      setDisplayedPacks(coinPacks);
    }).catch(() => {});
  };
  useEffect(load, []);

  const handleBuyPack = async (pack: typeof COIN_PACKS[0]) => {
    setBuying(pack.id);
    try {
      const res = await buyCoinPack(pack);
      if (res.success && res.coins > 0) {
        g.addCoins(res.coins, `+${res.coins} coins purchased!`);
      } else if (res.message) {
        g.notify(res.message);
      }
    } finally {
      setBuying(null);
    }
  };

  const handleWatchAd = () => {
    setAdLoading(true);
    playRewardedAd(
      (reward) => {
        setAdLoading(false);
        g.addCoins(reward, `+${reward} free coins awarded from sponsor!`);
      },
      () => {
        setAdLoading(false);
        g.showHouseAd(() => {
          g.addCoins(15, 'Sponsor bonus! +15 coins added.');
        });
      }
    );
  };

  const handleRestore = async () => {
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
    <View testID="wallet-screen">

      <Label style={s.eyebrow}>LITTLE RIDES ADD UP</Label>
      <Label display style={s.orderTitle}>Your pocket of sunshine.</Label>
      
      {/* Balance Card */}
      <View style={s.balanceCard}>
        <Label style={s.balanceLabel}>YOUR BALANCE</Label>
        <View style={s.bigBalance}>
          <Coin amount={g.profile!.balance} />
          <Label style={s.coinCaption}>coins</Label>
        </View>
        <View style={s.balanceRule} />
        <View style={s.walletStats}>
          <View><Label display style={s.statValue}>{g.profile!.deliveries}</Label><Label style={s.statCaption}>Happy deliveries</Label></View>
          <View><Label display style={s.statValue}>{g.profile!.earned}</Label><Label style={s.statCaption}>Lifetime coins</Label></View>
          <View><Label display style={s.statValue}>{g.profile!.xp}</Label><Label style={s.statCaption}>Total XP</Label></View>
        </View>
      </View>

      {/* RevenueCat Coin Shop */}
      <Label display style={s.historyTitle}>Coin Shop</Label>
      <View style={s.shopRow}>
        {displayedPacks.map(pack => (
          <Pressable
            key={pack.id}
            onPress={() => handleBuyPack(pack)}
            disabled={!!buying}
            style={({ pressed }) => [s.packCard, pack.popular && s.packCardPopular, pressed && { opacity: 0.7 }]}
          >
            {pack.bonus && <View style={s.packBadge}><Label style={s.packBadgeText}>{pack.bonus}</Label></View>}
            <Label style={s.packLabel}>{pack.label}</Label>
            <Coin amount={`+${pack.coins}`} small />
            <View style={s.packPriceBtn}>
              <Label style={s.packPriceText}>{buying === pack.id ? '...' : pack.price}</Label>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Chill Dash Pro */}
      <ProPaywallCard />

      {/* Rewarded Ads */}
      <Pressable
        onPress={handleWatchAd}
        disabled={adLoading}
        style={({ pressed }) => [s.adCard, pressed && { opacity: 0.7 }]}
      >
        <View style={s.adIcon}><Icon name="play-circle-outline" size={24} color={c.teal} /></View>
        <View style={{ flex: 1 }}>
          <Label style={s.adTitle}>{adLoading ? 'Playing Video Sponsor...' : 'Watch Video Sponsor'}</Label>
          <Label style={s.adSubtitle}>Instant boost · 15s quick break</Label>
        </View>
        <Coin amount="+25" />
      </Pressable>

      {/* Adaptive Banner Sponsor Ad */}
      <ChillDashBanner placement="phone_wallet" isPro={g.proStatus.isPro} />


      {/* Cloud Save Card */}
      <View style={s.cloudCard}>
        <View style={s.cloudTop}>
          <Icon name="cloud-done-outline" size={18} color={c.teal} />
          <Label style={s.cloudTitle}>Cloud Save (Supabase)</Label>
          <View style={[s.cloudBadge, g.user && { backgroundColor: c.mint, borderColor: c.teal, borderWidth: 1 }]}>
            <Label style={[s.cloudBadgeText, g.user && { color: c.teal }]}>
              {g.user ? 'AUTHENTICATED ✓' : 'SYNCED ✓'}
            </Label>
          </View>
        </View>
        {g.user ? (
          <>
            <Label style={s.cloudSyncId}>Account: {g.user.email}</Label>
            <Label style={s.cloudDesc}>Your save is securely backed up to your Supabase account (UID: {g.user.id.slice(0, 8)}...).</Label>
            <Pressable
              testID="wallet-manage-account-button"
              onPress={() => g.openPhone('profile')}
              style={[s.proBtn, { marginTop: 8, paddingVertical: 7, backgroundColor: c.brand }]}
            >
              <Label style={[s.proBtnText, { fontSize: 11 }]}>Manage Profile & Account</Label>
            </Pressable>
          </>
        ) : (
          <>
            <Label style={s.cloudSyncId}>Sync ID: {syncId || 'Connecting...'}</Label>
            <Label style={s.cloudDesc}>Your coins and level are backed up. Sign in to link across devices and unlock +100 bonus coins!</Label>
            <Pressable
              testID="wallet-signup-boost-button"
              onPress={() => g.openPhone('profile')}
              style={[s.proBtn, { marginTop: 8, paddingVertical: 8, backgroundColor: c.brand }]}
            >
              <Label style={[s.proBtnText, { fontSize: 11 }]}>⚡ SIGN UP / LOG IN (+100 COINS BOOST)</Label>
            </Pressable>
          </>
        )}

        {!showRestore ? (
          <Pressable onPress={() => setShowRestore(true)} style={s.restoreToggleBtn}>
            <Icon name="swap-horizontal-outline" size={14} color={c.teal} />
            <Label style={s.restoreToggleText}>Restore account from Sync ID</Label>
          </Pressable>
        ) : (
          <View style={s.restoreBox}>
            <TextInput
              placeholder="Enter Sync ID (e.g. CD-XXXX-XXXX)"
              placeholderTextColor={c.muted}
              value={restoreInput}
              onChangeText={setRestoreInput}
              autoCapitalize="characters"
              autoCorrect={false}
              style={s.restoreInput}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={handleRestore}
                disabled={restoring || !restoreInput.trim()}
                style={[s.restoreConfirmBtn, (!restoreInput.trim() || restoring) && { opacity: 0.6 }]}
              >
                <Label style={s.restoreConfirmText}>{restoring ? 'Restoring...' : 'Restore Save'}</Label>
              </Pressable>
              <Pressable onPress={() => setShowRestore(false)} style={s.restoreCancelBtn}>
                <Label style={s.restoreCancelText}>Cancel</Label>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Delivery Journal */}
      <Label display style={s.historyTitle}>The delivery journal</Label>
      {loading ? (
        <ActivityIndicator color={c.teal} style={{ margin: 20 }} />
      ) : error ? (
        <>
          <Label style={s.emptyText}>{error}</Label>
          <Button testID="wallet-retry-button" title="TRY AGAIN" onPress={load} secondary />
        </>
      ) : history.length ? (
        history.map(o => (
          <View testID={`delivery-history-${o.id}`} key={o.id} style={s.historyRow}>
            <View style={s.historyIcon}><Icon name="checkmark" color={c.teal} size={20} /></View>
            <View style={s.historyCopy}>
              <Label style={s.historyName}>{o.pickup.name}</Label>
              <Label style={s.historySub}>Delivered to {o.customer} · +{o.xp} XP</Label>
            </View>
            <Coin amount={`+${o.reward}`} small />
          </View>
        ))
      ) : (
        <View style={s.journalEmpty}>
          <Icon name="book-outline" size={30} color={c.teal} />
          <Label style={s.emptyText}>Your story starts with your first delivery.{'\n'}We’ll keep the good days here.</Label>
        </View>
      )}
      <View style={s.promise}>
        <Icon name="sparkles-outline" color={c.teal} size={18} />
        <Label style={s.promiseText}>Earn coins to upgrade your ride back in the garage.</Label>
      </View>
    </View>
  );
}
export function Phone() {
  const g = useGame(); const s = useStyles(); const { colors: c } = useTheme(); const { height, width } = useWindowDimensions(); const inset = useSafeAreaInsets();
  const { soundEnabled, toggleSound } = useSoundFX();
  const tabs = [{ id: 'orders', label: 'Orders', icon: 'bag-handle-outline' }, { id: 'gps', label: 'GPS', icon: 'navigate-outline' }, { id: 'food', label: 'Food', icon: 'restaurant-outline' }, { id: 'kit', label: 'Rain kit', icon: 'umbrella-outline' }, { id: 'care', label: 'Care', icon: 'construct-outline' }, { id: 'milestones', label: 'Goals', icon: 'trophy-outline' }, { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' }, { id: 'profile', label: 'Profile', icon: 'person-circle-outline' }] as const;

  const isNewLifeParthoPrompt =
    (g.profile?.deliveries === 0 || !g.profile?.deliveries) &&
    !g.profile?.partho_quest_completed &&
    !g.profile?.partho_borrowed_express &&
    (g.profile?.partho_chat_stage ?? 0) < 2;

  const isGoOnlinePrompt =
    (!g.profile?.deliveries || g.profile?.deliveries === 0) &&
    !!g.profile?.partho_borrowed_express &&
    !g.profile?.online &&
    !g.order;

  const backPulse = useSharedValue(1);
  useEffect(() => {
    if (isNewLifeParthoPrompt) {
      backPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 550 }),
          withTiming(1, { duration: 550 })
        ),
        -1,
        true
      );
    } else {
      backPulse.value = 1;
    }
  }, [isNewLifeParthoPrompt]);

  const backPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backPulse.value }],
  }));

  return <View testID="phone-modal" style={[s.phone, { width: Math.min(width - 32, 420), height: Math.min(height - inset.top - inset.bottom - 48, 740) }]}>
    <View style={s.phoneTop}><Label style={s.phoneTime}>{gameTime(g.clock.current)}</Label><View style={s.speaker} /><View style={s.signal}><Icon name="cellular" size={13} /><Icon name="battery-full" size={17} /></View></View>
    <View style={s.phoneHeader}>
      <View style={s.headerLeft}>
        {g.phoneApp !== 'apps' && (
          <Pressable
            testID="phone-back-to-apps-button"
            accessibilityRole="button"
            accessibilityLabel="Back to Apps Grid"
            onPress={() => {
              playTapSound();
              g.setPhoneApp('apps');
            }}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="arrow-back" size={20} color={c.onSurface} />
            {isNewLifeParthoPrompt && g.phoneApp === 'rider' && g.phoneTab !== 'profile' && (
              <Animated.View style={[s.glowingRedDot, backPulseStyle]} />
            )}
          </Pressable>
        )}
        <View style={s.brandWrap}>
          <Label display numberOfLines={1} style={s.phoneBrand}>
            {g.phoneApp === 'chat' ? 'Messages' : g.phoneApp === 'wallet' ? 'Dash Wallet' : g.phoneApp === 'apps' ? 'Apps' : 'dash'}
            {g.phoneApp === 'rider' && <Label style={s.phoneBrandDot}>.</Label>}
          </Label>
          <Label numberOfLines={1} style={s.phoneTagline}>
            {g.phoneApp === 'chat' ? 'Contacts & Chat' : g.phoneApp === 'wallet' ? 'Coins & Cloud Save' : g.phoneApp === 'apps' ? 'Tap an app to open' : 'Good things, delivered.'}
          </Label>
        </View>
      </View>
      <View style={s.headerActions}>
        <Pressable
          testID="phone-sound-toggle-button"
          accessibilityRole="button"
          accessibilityLabel={soundEnabled ? "Mute sound effects" : "Unmute sound effects"}
          onPress={async () => {
            const next = await toggleSound();
            g.notify(next ? 'Sound FX: ON 🔊' : 'Sound FX: OFF 🔇');
          }}
          style={[s.soundBtn, !soundEnabled && s.soundBtnMuted]}
        >
          <Icon name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={18} color={soundEnabled ? c.onSurface : c.muted} />
        </Pressable>
        <Pressable testID="phone-close-button" accessibilityLabel="Close phone" onPress={() => { playTapSound(); g.setPhone(false); }} style={s.close}><Icon name="close" size={20} /></Pressable>
      </View>
    </View>

    {g.phoneApp === 'apps' ? (
      <ScrollView testID="phone-apps-scroll" style={s.phoneScroll} showsVerticalScrollIndicator={false}>
        <PhoneAppsGrid
          onOpenApp={(app, tab) => {
            playTapSound();
            if (tab) {
              g.setPhoneTab(tab);
            }
            g.setPhoneApp(app);
          }}
          highlightChat={isNewLifeParthoPrompt}
          highlightRider={isGoOnlinePrompt}
        />
      </ScrollView>
    ) : g.phoneApp === 'chat' ? (
      <View style={{ flex: 1 }}>
        <PhoneChatApp
          onBackToApps={() => g.setPhoneApp('apps')}
          highlightPartho={isNewLifeParthoPrompt}
        />
      </View>
    ) : g.phoneApp === 'wallet' ? (
      <ScrollView testID="phone-wallet-scroll" style={s.phoneScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.phoneContent}>
        <WalletView />
      </ScrollView>
    ) : (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabContent}>
          {tabs.map(tab => (
            <Pressable
              testID={`phone-tab-${tab.id}`}
              key={tab.id}
              accessibilityState={{ selected: g.phoneTab === tab.id }}
              onPress={() => {
                playTapSound();
                g.setPhoneTab(tab.id);
              }}
              style={[
                s.tab,
                g.phoneTab === tab.id && s.tabActive,
              ]}
            >
              <Icon name={tab.icon} size={16} />
              <Label style={s.tabLabel}>{tab.label}</Label>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView key={g.phoneTab} testID="phone-content-scroll" style={s.phoneScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.phoneContent}>
          {g.phoneTab === 'orders' ? <OrderView isNewLifeParthoPrompt={isNewLifeParthoPrompt} /> : g.phoneTab === 'wallet' ? <WalletView /> : g.phoneTab === 'food' ? <FoodView /> : g.phoneTab === 'kit' ? <KitView /> : g.phoneTab === 'care' ? <CareView /> : g.phoneTab === 'milestones' ? <MilestonesView /> : g.phoneTab === 'profile' ? <PhoneProfile /> : <RegionalGPS />}
        </ScrollView>
      </>
    )}

    <View style={s.phoneBottom}>
      {g.phoneApp === 'rider' || g.phoneApp === 'apps' ? (
        <Pressable
          testID="phone-online-toggle"
          onPress={() => {
            playTapSound();
            g.toggleOnline();
          }}
          disabled={isNewLifeParthoPrompt || g.busy}
          style={[
            s.phoneStatus,
            isGoOnlinePrompt && s.phoneStatusHighlighted,
            isNewLifeParthoPrompt && { opacity: 0.4 },
          ]}
        >
          <View style={[s.statusDot, !g.profile!.online && s.offlineDot, isGoOnlinePrompt && s.statusDotHighlighted]} />
          <Label style={[s.phoneStatusText, isGoOnlinePrompt && s.phoneStatusTextHighlighted]}>
            {g.profile!.online ? 'You’re online · taking deliveries' : isGoOnlinePrompt ? 'You’re offline · tap to go online' : 'You’re offline · taking it easy'}
          </Label>
          <Icon name="power" size={14} color={isGoOnlinePrompt ? '#E53E3E' : undefined} />
        </Pressable>
      ) : (
        <Pressable testID="phone-back-to-home-bar" onPress={() => { playTapSound(); g.setPhoneApp('apps'); }} style={s.phoneStatus}><Icon name="grid-outline" size={13} color={c.teal} /><Label style={s.phoneStatusText}>Tap to view all apps</Label></Pressable>
      )}
      <View style={s.homeBar} />
    </View>
  </View>;
}
const useStyles = makeStyles(c => ({
  phone: { borderWidth: 7, borderColor: c.onSurface, backgroundColor: c.surface, borderRadius: 40, overflow: 'hidden', alignSelf: 'center', shadowColor: c.onSurface, shadowOffset: { width: 0, height: 18 }, shadowOpacity: .3, shadowRadius: 24 }, phoneTop: { height: 29, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, phoneTime: { fontSize: 9, fontWeight: '800' }, speaker: { height: 7, width: 64, backgroundColor: c.onSurface, borderRadius: 5 }, signal: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  phoneHeader: { width: '100%', paddingHorizontal: 20, paddingTop: 9, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginRight: 12 },
  brandWrap: { flexShrink: 1, justifyContent: 'center' },
  phoneBrand: { fontSize: 23, letterSpacing: -0.5 },
  phoneBrandDot: { color: c.teal, fontSize: 23 },
  phoneTagline: { fontSize: 9.5, color: c.muted },
  close: { height: 40, width: 40, borderRadius: 20, backgroundColor: c.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.borderStrong, position: 'relative' },
  glowingRedDot: { position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#E53E3E', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#E53E3E', shadowOpacity: 0.9, shadowRadius: 6, elevation: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  soundBtn: { height: 40, width: 40, borderRadius: 20, backgroundColor: c.butter, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.borderStrong },
  soundBtnMuted: { backgroundColor: c.surfaceTertiary, borderColor: c.border },
  tabs: { height: 56, maxHeight: 56, flexGrow: 0, borderBottomWidth: 1, borderColor: c.border }, tabContent: { paddingHorizontal: 18, gap: 8, alignItems: 'center' }, tab: { flexShrink: 0, height: 36, paddingHorizontal: 16, flexDirection: 'row', gap: 6, borderRadius: 11, alignItems: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, tabActive: { backgroundColor: c.brand, borderColor: c.onSurface }, tabLabel: { fontSize: 11, fontWeight: '800' }, phoneScroll: { flex: 1 }, phoneContent: { padding: 18, paddingTop: 22, paddingBottom: 12 },
  phoneBottom: { borderTopWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingBottom: 9 }, phoneStatus: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.success }, offlineDot: { backgroundColor: c.muted }, phoneStatusText: { fontSize: 10, color: c.muted }, homeBar: { alignSelf: 'center', width: 100, height: 4, backgroundColor: c.onSurface, borderRadius: 4 },
  eyebrow: { fontSize: 8, color: c.teal, letterSpacing: 1.2, fontWeight: '800', marginBottom: 6 }, orderHeading: { marginBottom: 18 }, orderTitle: { fontSize: 23, letterSpacing: -.5, marginBottom: 5 }, orderReward: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 }, deliveryIcon: { width: 43, height: 48, borderRadius: 13, backgroundColor: c.butter, justifyContent: 'center', alignItems: 'center' }, orderRewardCopy: { flex: 1 }, orderItem: { fontSize: 12, fontWeight: '800' }, orderItemSub: { fontSize: 9, color: c.muted, marginTop: 4 }, routeCard: { padding: 15, borderWidth: 1, borderColor: c.border, borderRadius: 17, backgroundColor: c.surfaceSecondary }, stop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, stopIcon: { width: 35, height: 38, borderRadius: 11, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, activeStop: { backgroundColor: c.butter }, stopCopy: { flex: 1 }, stopLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 1.1, color: c.teal, marginBottom: 4 }, stopName: { fontSize: 12, fontWeight: '800' }, stopAddress: { fontSize: 9, color: c.muted, marginTop: 4 }, routeConnector: { height: 37, flexDirection: 'row', gap: 26, paddingLeft: 17, alignItems: 'center' }, connectorLine: { height: 24, width: 1, backgroundColor: c.border }, routeDistance: { fontSize: 8, color: c.muted }, promise: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 }, promiseText: { fontSize: 10, color: c.teal, flex: 1 }, textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, textButtonLabel: { fontSize: 11, color: c.muted, textDecorationLine: 'underline' },
  empty: { paddingVertical: 14 }, emptyArt: { backgroundColor: c.butter, width: 178, height: 148, borderRadius: 80, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 23 }, emptyTitle: { fontSize: 25, textAlign: 'center' }, emptyText: { fontSize: 12, lineHeight: 20, color: c.muted, textAlign: 'center', marginTop: 12, marginBottom: 24 }, balanceCard: { backgroundColor: c.brand, borderRadius: 20, borderWidth: 1.5, borderBottomWidth: 4, borderColor: c.onSurface, padding: 19, marginTop: 18 }, balanceLabel: { fontSize: 8, letterSpacing: 1.4, fontWeight: '800' }, bigBalance: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 }, coinCaption: { fontSize: 13 }, balanceRule: { height: 1, backgroundColor: c.onSurface, opacity: .15, marginVertical: 18 }, walletStats: { flexDirection: 'row', justifyContent: 'space-between' }, statValue: { fontSize: 23 }, statCaption: { fontSize: 8, marginTop: 3 }, historyTitle: { fontSize: 20, marginTop: 24, marginBottom: 14 }, historyRow: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderColor: c.border }, historyIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, historyCopy: { flex: 1 }, historyName: { fontSize: 11, fontWeight: '800' }, historySub: { fontSize: 9, color: c.muted, marginTop: 4 }, journalEmpty: { alignItems: 'center', paddingTop: 17 }, largeMap: { marginTop: 14, borderRadius: 17, overflow: 'hidden', borderWidth: 1.5, borderColor: c.borderStrong, alignItems: 'center', backgroundColor: c.grass }, mapLegend: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, riderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.teal }, targetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand }, legendLabel: { fontSize: 9, color: c.muted }, destination: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingBottom: 20, paddingTop: 6 },
  shopRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  packCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 10, alignItems: 'center', gap: 4 },
  packCardPopular: { borderColor: c.brand, borderWidth: 2, backgroundColor: c.mint },
  packBadge: { backgroundColor: c.brand, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 2 },
  packBadgeText: { fontSize: 8, fontWeight: '800', color: c.onSurface },
  packLabel: { fontSize: 9, fontWeight: '800', color: c.muted, textAlign: 'center' },
  packPriceBtn: { backgroundColor: c.brand, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  packPriceText: { fontSize: 11, fontWeight: '800', color: c.onSurface },
  adCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.mint, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, gap: 10, marginTop: 10 },
  adIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  adTitle: { fontSize: 12, fontWeight: '800' },
  adSubtitle: { fontSize: 9, color: c.muted, marginTop: 2 },
  cloudCard: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, marginTop: 12 },
  cloudTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cloudTitle: { fontSize: 11, fontWeight: '800', flex: 1 },
  cloudBadge: { backgroundColor: c.teal, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cloudBadgeText: { fontSize: 8, fontWeight: '800', color: c.surface },
  cloudSyncId: { fontSize: 12, fontWeight: '800', color: c.teal, marginTop: 6 },
  cloudDesc: { fontSize: 9, color: c.muted, marginTop: 3 },
  restoreToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  restoreToggleText: { fontSize: 10, fontWeight: '800', color: c.teal, textDecorationLine: 'underline' },
  restoreBox: { marginTop: 10, padding: 10, backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  restoreInput: { height: 38, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, color: c.onSurface, backgroundColor: c.surfaceSecondary },
  restoreConfirmBtn: { backgroundColor: c.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  restoreConfirmText: { fontSize: 11, fontWeight: '800', color: c.onSurface },
  restoreCancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  restoreCancelText: { fontSize: 11, color: c.muted },
  proCard: { backgroundColor: c.butter, borderWidth: 1.5, borderColor: c.brand, borderRadius: 16, padding: 14, marginTop: 12 },
  proTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proTitle: { fontSize: 13, fontWeight: '800', flex: 1 },
  proBadge: { backgroundColor: c.borderStrong, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  proBadgeActive: { backgroundColor: c.brand },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: c.onSurface },
  proDesc: { fontSize: 10, color: c.muted, marginTop: 5, lineHeight: 15 },
  proSubtitle: { fontSize: 10, color: c.muted, marginTop: 4, marginBottom: 6 },
  benefitsList: { gap: 6, marginVertical: 6, backgroundColor: c.surfaceSecondary, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 10, fontWeight: '700', color: c.onSurface, flex: 1 },
  proBtn: { backgroundColor: c.brand, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 10 },
  proBtnText: { fontSize: 12, fontWeight: '800', color: c.onSurface },
  customerCenterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  customerCenterText: { fontSize: 10, fontWeight: '800', color: c.teal, textDecorationLine: 'underline' },
  newLifePromptBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E53E3E', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, marginBottom: 14, borderWidth: 1, borderColor: '#FEB2B2' },
  newLifePromptBannerText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  goOnlinePromptBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E53E3E', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, marginBottom: 14, borderWidth: 1, borderColor: '#FEB2B2' },
  goOnlinePromptBannerText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  goOnlineBtnWrap: { position: 'relative' },
  goOnlineHighlightBtn: { borderColor: '#E53E3E', borderWidth: 2.5, backgroundColor: c.butter },
  cornerRedDotButton: { position: 'absolute', top: -5, right: -5, width: 17, height: 17, borderRadius: 8.5, backgroundColor: '#E53E3E', borderWidth: 2.5, borderColor: '#FFFFFF', shadowColor: '#E53E3E', shadowOpacity: 0.9, shadowRadius: 6, elevation: 8 },
  phoneStatusHighlighted: { borderColor: '#E53E3E', borderWidth: 1.5, backgroundColor: '#FFF5F5', borderRadius: 12 },
  statusDotHighlighted: { backgroundColor: '#E53E3E' },
  phoneStatusTextHighlighted: { color: '#E53E3E', fontWeight: '800' },
}));