import React, { useMemo, useRef, useEffect } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';
import { useGame } from '@/src/game/GameContext';
import { useRide } from '@/src/game/useRide';
import { countdown, distance, gameTime, getRoute, nearestRoad, onFootpath, region } from '@/src/game/world';
import { MAP } from '@/src/game/region';
import type { Point, Service } from '@/src/game/api';
import { CityWorld, MiniMap } from '@/src/components/CityWorld';
import { RideControls } from '@/src/components/RideControls';
import { Button, Icon, IconButton, Label } from '@/src/components/ui';
import { RideStatus } from '@/src/components/RideStatus';
import { playBillboardSponsorAd, ChillDashBanner, checkProEntitlement } from '@/src/game/monetization';

export function City() {
  const g = useGame(); const ride = useRide(); const s = useStyles(); const { colors: c } = useTheme();
  const { width, height } = useWindowDimensions(); const inset = useSafeAreaInsets();
  const [isPro, setIsPro] = React.useState(false);
  React.useEffect(() => {
    checkProEntitlement().then(setIsPro).catch(() => {});
  }, []);

  const orderTarget = g.order?.status === 'accepted' ? g.order.pickup : g.order?.status === 'picked_up' ? g.order.dropoff : null;
  const target = g.destination || orderTarget;
  const exploring = g.destination && !['garage', 'fuel', 'repair'].includes(g.destination.kind);

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

  const isPhoneHighlighted = isNewLifeParthoPrompt || isGoOnlinePrompt;

  const phoneDotPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isPhoneHighlighted) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(phoneDotPulse, { toValue: 1.3, duration: 550, useNativeDriver: true }),
          Animated.timing(phoneDotPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      phoneDotPulse.setValue(1);
    }
  }, [isPhoneHighlighted]);

  const routeRef = useRef<Point[]>([]);
  const lastRouteCalc = useRef<{ x: number; y: number; targetKey: string }>({ x: 0, y: 0, targetKey: '' });
  const lastRouteTime = useRef(0);
  const remainingRef = useRef(0);
  const targetKey = target ? `${target.x},${target.y}` : '';
  const traveledSinceRoute = Math.hypot(ride.player.x - lastRouteCalc.current.x, ride.player.y - lastRouteCalc.current.y);

  const nowMs = Date.now();
  if (targetKey !== lastRouteCalc.current.targetKey || (target && routeRef.current.length === 0)) {
    routeRef.current = target ? getRoute(ride.player, target) : [];
    remainingRef.current = Math.round(routeRef.current.reduce((sum, p, i) => sum + (i ? distance(p, routeRef.current[i - 1]) : 0), 0) / 5) * 5;
    lastRouteCalc.current = { x: ride.player.x, y: ride.player.y, targetKey };
    lastRouteTime.current = nowMs;
  } else if (target && routeRef.current.length > 0) {
    // Advance waypoints if player passed first waypoint
    while (routeRef.current.length > 1 && distance(ride.player, routeRef.current[0]) < 42) {
      routeRef.current.shift();
    }
    // Only re-run full Dijkstra search if substantially off-route after at least 2.5s cooldown
    const distToActive = distance(ride.player, routeRef.current[0]);
    if ((distToActive > 140 || traveledSinceRoute > 450) && nowMs - lastRouteTime.current > 2500) {
      routeRef.current = getRoute(ride.player, target);
      lastRouteCalc.current = { x: ride.player.x, y: ride.player.y, targetKey };
      lastRouteTime.current = nowMs;
    }
    remainingRef.current = Math.round((distToActive + routeRef.current.reduce((sum, p, i) => sum + (i ? distance(p, routeRef.current[i - 1]) : 0), 0)) / 5) * 5;
  }
  const route = routeRef.current;
  const remaining = remainingRef.current;

  const billboardLandmarks = useMemo(() => MAP?.landmarks?.filter(l => l.kind === 'cinema' || l.kind === 'mall') || [], []);
  const billboardBlocks = useMemo(() => (MAP?.blocks || []).filter(b => (b.town === 'sunnyvale' || b.index % 4 === 0) && b.index % 3 === 1), []);

  const orderRoadPt = useMemo(() => (orderTarget ? nearestRoad(orderTarget).point : null), [orderTarget?.x, orderTarget?.y]);
  const targetRoadPt = useMemo(() => (target ? nearestRoad(target).point : null), [target?.x, target?.y]);

  const proxRef = useRef({
    x: 0,
    y: 0,
    orderId: '',
    orderStatus: '',
    destId: '',
    near: false,
    nearService: undefined as Service | undefined,
    nearBillboard: undefined as any,
    billboardName: 'City Sponsor',
    targetNear: false,
    nextDirection: '',
  });

  const orderId = g.order?.id || '';
  const orderStatus = g.order?.status || '';
  const destId = g.destination?.id || '';
  const distSinceProx = Math.hypot(ride.player.x - proxRef.current.x, ride.player.y - proxRef.current.y);

  if (distSinceProx > 60 || orderId !== proxRef.current.orderId || orderStatus !== proxRef.current.orderStatus || destId !== proxRef.current.destId) {
    const distToOrder = orderTarget
      ? Math.min(distance(ride.player, orderTarget), orderRoadPt ? distance(ride.player, orderRoadPt) : Infinity)
      : Infinity;
    const isNearOrder = distToOrder <= 55;

    const nearServiceCand = g.catalog!.services.find(stop => {
      const maxDist = stop.kind === 'bike_shop' ? 85 : 55;
      return Math.abs(ride.player.x - stop.x) < maxDist + 10 && Math.abs(ride.player.y - stop.y) < maxDist + 10 && distance(ride.player, stop) < maxDist;
    });
    const nearLandmarkCand = billboardLandmarks.find(b => Math.abs(ride.player.x - b.entrance.x) < 75 && Math.abs(ride.player.y - b.entrance.y) < 75 && distance(ride.player, b.entrance) < 75);
    const nearBlockCand = billboardBlocks.find(b => {
      const bx = b.x + b.width / 2, by = b.y + b.height / 2;
      return Math.abs(ride.player.x - bx) < 180 && Math.abs(ride.player.y - by) < 180 && Math.hypot(ride.player.x - bx, ride.player.y - by) < 180;
    });

    const distToTarget = target
      ? Math.min(distance(ride.player, target), targetRoadPt ? distance(ride.player, targetRoadPt) : Infinity)
      : Infinity;
    const isNearTarget = distToTarget <= 50;

    const nearForestHighwayCand = Math.abs(ride.player.x - 5620) < 110 && Math.abs(ride.player.y - 2140) < 110 && Math.hypot(ride.player.x - 5620, ride.player.y - 2140) < 95;

    const near = isNearOrder;
    const nearService = nearServiceCand;
    const nearLandmarkBillboard = nearLandmarkCand;
    const nearBlockBillboard = nearBlockCand;
    const nearBillboard = nearLandmarkBillboard || nearBlockBillboard || nearForestHighwayCand;
    const billboardName = nearLandmarkBillboard
      ? nearLandmarkBillboard.name
      : nearBlockBillboard
      ? 'City Merchant Sponsor'
      : nearForestHighwayCand
      ? 'Forest Highway Sponsor'
      : 'City Sponsor';
    const targetNear = isNearTarget;

    const next = route.find((p, i) => i > 0 && distance(p, ride.player) > 18) || target;
    const north = next && Math.abs(next.y - ride.player.y) > Math.abs(next.x - ride.player.x);
    const nextDirection = next ? north ? next.y < ride.player.y ? 'north' : 'south' : next.x < ride.player.x ? 'west' : 'east' : '';

    proxRef.current = {
      x: ride.player.x,
      y: ride.player.y,
      orderId,
      orderStatus,
      destId,
      near,
      nearService,
      nearBillboard,
      billboardName,
      targetNear,
      nextDirection,
    };
  }

  const posRef = useRef({ x: ride.player.x, y: ride.player.y });
  const posDist = Math.hypot(ride.player.x - posRef.current.x, ride.player.y - posRef.current.y);
  if (posDist >= 4 || !ride.moving) {
    posRef.current = { x: ride.player.x, y: ride.player.y };
  }
  const displayX = Math.round(posRef.current.x);
  const displayY = Math.round(posRef.current.y);

  const currentRegion = region(ride.player);
  const inForestSpace = currentRegion === 'Bibhutibhushan Forest';

  const { near, nearService, nearBillboard, billboardName, targetNear, nextDirection } = proxRef.current;
  return <View testID="city-screen" style={s.page}>
    <CityWorld {...ride} liveFrame={ride.liveFrame} subscribeFrame={ride.subscribeFrame} route={route} target={target} width={width} height={height} bike={g.profile!.bike} gear={g.profile!.gear} />
    <View pointerEvents="box-none" style={[s.top, { top: inset.top + 14 }]}>
      <View style={s.topRow}><IconButton testID="ride-pause-button" name="grid-outline" label="Pause ride" onPress={() => g.setPanel('pause')} style={s.home} /><Pressable testID="world-settings-button" onPress={() => g.setPanel('world')} style={s.weather}><Icon name={ride.weather === 'rainy' ? 'rainy-outline' : ride.weather === 'cloudy' ? 'cloud-outline' : ride.minutes >= 1140 || ride.minutes < 360 ? 'moon-outline' : 'sunny-outline'} size={18} /><Label testID="game-clock" style={s.clock}>{gameTime(ride.minutes)}</Label><View style={s.smallDivider} /><Label testID="game-weather" style={s.weatherLabel}>{ride.weather}</Label></Pressable><Pressable testID="online-status-button" onPress={() => g.setPanel('status')} style={[s.status, g.profile!.online && s.onlineActive]}><View style={[s.onlineDot, { backgroundColor: g.profile!.online ? c.success : c.muted }]} /><Label testID="online-status" style={s.onlineText}>{g.profile!.online ? 'ONLINE' : 'OFFLINE'}</Label></Pressable></View>
      <View style={s.mapRow} pointerEvents="box-none">
        <Pressable testID="open-gps-button" onPress={() => g.openPhone('gps')} style={s.map}><View style={s.mapWindow}><MiniMap player={ride.player} target={target} route={route} size={100} /></View><View style={s.mapLabel}><Icon name="navigate" size={11} color={c.teal} /><Label testID="current-region" style={s.mapText}>{region(ride.player).toUpperCase()}</Label><Icon name="expand" size={10} /></View></Pressable>
        <View style={s.rightTop}><RideStatus /></View>
      </View>
      {g.order?.status === 'offered' && <Pressable testID="new-order-notification" onPress={() => g.openPhone('orders')} style={s.notification}><View style={s.notificationIcon}><Icon name="bag-handle-outline" size={22} /></View><View style={s.notificationCopy}><Label style={s.notificationTitle}>A little delivery, a little adventure.</Label><Label style={s.notificationSub}>{g.order.pickup.name} · {g.order.reward} coins</Label></View><Icon name="chevron-forward" size={17} /></Pressable>}
      {target && <View style={s.directions} testID="gps-directions"><View style={s.turn}><Icon name={targetNear ? 'flag' : nextDirection === 'north' ? 'arrow-up' : nextDirection === 'south' ? 'arrow-down' : nextDirection === 'west' ? 'arrow-back' : 'arrow-forward'} size={23} /></View><View style={s.directionCopy}><Label style={s.directionTitle}>{targetNear ? 'On the footpath. You’re here!' : route.length?`Head ${nextDirection} · ${Math.round(remaining)} m`:'Finding a safe route…'}</Label><Label style={s.directionSubtitle} numberOfLines={1}>{exploring?'EXPLORE':g.destination ? 'PIT STOP' : g.order?.status === 'accepted' ? 'PICK UP' : 'DELIVER'} · {target.name}</Label></View>{g.order?.status === 'accepted' ? <View style={s.step}><Icon name="timer-outline" size={14} /><Label testID="pickup-countdown" style={s.stepText}>{countdown(g.order.pickup_deadline, g.now)}</Label></View> : <Icon name={exploring?'compass-outline':g.destination ? 'construct-outline' : 'bag-check-outline'} size={20} />}</View>}
    </View>
    {ride.railNearby && ride.rail.closed && !near && !nearService ? (
      <View testID="rail-gate-notice" style={[s.explore, { bottom: inset.bottom + 222 }]}>
        <View style={s.railTitle}><Icon name="train-outline" size={20} color={c.coral}/><Label display style={s.exploreTitle}>Train crossing · {ride.rail.wait}s</Label></View>
        <Label style={s.exploreNote}>Gates closed. Riders and traffic wait together.</Label>
      </View>
    ) : !g.order && !nearService && !nearBillboard && !g.destination && inForestSpace && !isPro ? (
      <View testID="forest-banner-container" style={[s.forestBannerWrap, { bottom: inset.bottom + 172 }]}>
        <ChillDashBanner placement="forest_corridor" isPro={isPro} />
      </View>
    ) : !g.order && !nearService && !nearBillboard && !g.destination ? (
      <View pointerEvents="none" style={[s.explore, { bottom: inset.bottom + 222 }]}>
        <Label display style={s.exploreTitle}>{ride.pushing ? 'One step at a time.' : currentRegion === 'Whispering Pines' ? 'The scenic way around.' : currentRegion === 'Bibhutibhushan Forest' ? 'Tranquil forest corridor.' : 'A little room to explore.'}</Label>
        <Label style={s.exploreNote}>{ride.pushing ? 'Push to a service stop or call help from your phone.' : g.profile!.online ? 'No requests here yet. Visit other shops and streets.' : 'Open your phone to change your online status.'}</Label>
      </View>
    ) : null}
    {near ? <View testID={g.order?.status === 'accepted' ? 'pickup-arrived' : 'dropoff-arrived'} style={[s.action, { bottom: inset.bottom + 222 }]}><Button testID="delivery-action-button" title={g.order?.status === 'accepted' ? 'PICK UP ORDER' : 'HAND OVER DELIVERY'} icon="bag-check-outline" loading={g.busy} onPress={g.interact} /></View> : nearService ? <View style={[s.action, { bottom: inset.bottom + 222 }]}><Button testID="open-service-stop-button" title={nearService.kind === 'garage' ? 'HOME SWEET GARAGE' : nearService.kind === 'fuel' ? 'FUEL & AIR STATION' : nearService.kind === 'bike_shop' ? 'AKASH WHEELS · BIKE SHOWROOM' : 'VISIT REPAIR SHOP'} icon={nearService.kind === 'garage' ? 'home-outline' : nearService.kind === 'bike_shop' ? 'bicycle' : 'construct-outline'} onPress={() => g.openService(nearService)} /></View> : nearBillboard ? <View style={[s.action, { bottom: inset.bottom + 222 }]}><Button testID="billboard-sponsor-button" title={`SPONSOR SPOTLIGHT · +15 COINS`} icon="sparkles" loading={g.busy} onPress={() => {
      g.notify('Loading sponsor video…');
      playBillboardSponsorAd(
        billboardName,
        (reward) => {
          g.addCoins(reward || 15, `Thanks to ${billboardName}! +${reward || 15} coins added.`);
        },
        () => {
          g.showHouseAd(() => {
            g.addCoins(15, 'Sponsor bonus! +15 coins added.');
          });
        }
      );
    }} /></View> : null}
    <View pointerEvents="box-none" style={[s.controls, { bottom: inset.bottom + 20 }]}>
      <RideControls direction={ride.direction} disabled={isNewLifeParthoPrompt || g.phone || !!g.panel || !!g.reward || g.profile!.dead} />
      <View style={s.phoneColumn}>
        <Pressable
          testID="speed-boost-hud-button"
          accessibilityRole="button"
          accessibilityLabel={ride.boosted ? 'Speed Boost active' : 'Open Speed Boost'}
          onPress={() => g.openSpeedBoost()}
          style={({ pressed }) => [
            s.boostPill,
            ride.boosted && s.boostPillActive,
            pressed && { transform: [{ scale: 0.94 }] }
          ]}
        >
          <Icon name="flash" size={11} color={ride.boosted ? '#000000' : c.brand} />
          <Label style={[s.boostPillText, ride.boosted && s.boostPillTextActive]}>
            {ride.boosted ? '+10' : 'BOOST'}
          </Label>
        </Pressable>
        <View style={s.speed}>
          <Label display style={[s.speedValue, ride.boosted && s.speedValueBoosted]}>{ride.speed}</Label>
          <Label testID="movement-mode" style={s.speedUnit}>{ride.pushing ? 'PUSHING' : 'km/h'}</Label>
        </View>
        <Pressable
          testID="open-phone-button"
          accessibilityRole="button"
          accessibilityLabel="Open delivery phone"
          onPress={() => g.openPhone()}
          style={({ pressed }) => [
            s.phone,
            isPhoneHighlighted && s.phoneHighlighted,
            pressed && { transform: [{ scale: .94 }] }
          ]}
        >
          <Icon name="phone-portrait-outline" size={33} />
          {g.order && <View style={s.badge}><Label style={s.badgeText}>1</Label></View>}
          {isPhoneHighlighted && (
            <Animated.View style={[s.cornerRedDot, { transform: [{ scale: phoneDotPulse }] }]} />
          )}
        </Pressable>
        <Label style={s.phoneLabel}>MY PHONE</Label>
        {isPhoneHighlighted && (
          <View style={s.messageHintWrap}>
            <Label style={s.subtleMsgText}>
              {isNewLifeParthoPrompt ? 'You got a message.' : 'Go online for orders.'}
            </Label>
          </View>
        )}
      </View>
    </View>
    <View testID="rider-position" accessibilityLabel={`${displayX},${displayY}`} style={s.position}><Label style={s.positionText}>{displayX}, {displayY}</Label></View>
    {ride.railNearby&&<View testID="railway-telemetry" accessibilityLabel={JSON.stringify({closed:ride.rail.closed,blocked:ride.railBlocked,wait:ride.rail.wait,train:ride.rail.trainVisible,waitingVehicles:ride.vehicles.filter(v=>v.waiting&&Math.abs(v.y-3050)<400).length})} style={s.railTelemetry}><Label style={s.positionText}>{ride.rail.closed?'GATE CLOSED':'GATE OPEN'}</Label></View>}
  </View>;
}
const useStyles = makeStyles(c => ({
  forestBannerWrap: { position: 'absolute', alignSelf: 'center', width: '90%', maxWidth: 360, zIndex: 10 },
  railTitle:{flexDirection:'row',alignItems:'center',gap:8},railTelemetry:{position:'absolute',bottom:3,left:18},
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 44, backgroundColor: c.glass, borderRadius: 14, borderWidth: 1, borderColor: c.surface },
  page: { flex: 1, backgroundColor: c.grass, overflow: 'hidden' }, top: { position: 'absolute', left: 18, right: 18 }, topRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, home: { backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.surface, width: 43 },
  weather: { flexDirection: 'row', flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 15, backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.surface }, clock: { fontSize: 13, fontWeight: '800' }, smallDivider: { height: 14, width: 1, backgroundColor: c.border }, weatherLabel: { fontSize: 10, textTransform: 'capitalize' }, money: { backgroundColor: c.glass, borderRadius: 14, paddingHorizontal: 13, height: 44, justifyContent: 'center', borderWidth: 1.5, borderColor: c.surface },
  mapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 13 }, map: { backgroundColor: c.glass, padding: 5, width: 114, borderRadius: 15, borderWidth: 1.5, borderColor: c.surface, overflow: 'hidden' }, mapWindow: { borderRadius: 10, overflow: 'hidden' }, mapLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 5, paddingBottom: 2 }, mapText: { fontSize: 6, letterSpacing: .25, fontWeight: '800', flexShrink: 1 }, rightTop: { alignItems: 'flex-end', gap: 9 }, onlineActive: { backgroundColor: c.mint, borderColor: c.teal }, onlineDot: { height: 6, width: 6, borderRadius: 5 }, onlineText: { fontSize: 8, fontWeight: '800', letterSpacing: .4 },
  notification: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginTop: 14, borderRadius: 16, backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.onSurface, borderBottomWidth: 3 }, notificationIcon: { width: 36, height: 36, backgroundColor: c.brand, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, notificationCopy: { flex: 1 }, notificationTitle: { fontSize: 11, fontWeight: '800' }, notificationSub: { fontSize: 10, marginTop: 3, color: c.muted },
  directions: { flexDirection: 'row', alignItems: 'center', padding: 11, gap: 10, marginTop: 14, borderRadius: 15, backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.onSurface }, turn: { width: 39, height: 39, borderRadius: 11, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }, directionCopy: { flex: 1 }, directionTitle: { fontSize: 14, fontWeight: '800' }, directionSubtitle: { fontSize: 8.5, marginTop: 4, letterSpacing: .3, color: c.teal }, step: { backgroundColor: c.surfaceTertiary, borderRadius: 8, padding: 7 }, stepText: { fontSize: 10, fontWeight: '800' },
  controls: { position: 'absolute', left: 22, right: 25, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, phoneColumn: { alignItems: 'center' }, phone: { width: 74, height: 74, borderRadius: 25, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, borderColor: c.onSurface },
  phoneHighlighted: { borderColor: '#E53E3E', borderWidth: 2.5, backgroundColor: c.butter },
  cornerRedDot: { position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E53E3E', borderWidth: 2.5, borderColor: '#FFFFFF', shadowColor: '#E53E3E', shadowOpacity: 0.9, shadowRadius: 6, elevation: 8 },
  messageHintWrap: { marginTop: 4, backgroundColor: '#E53E3E', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  subtleMsgText: { fontSize: 8, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  badge: { position: 'absolute', right: -3, top: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: c.coral, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: c.surfaceSecondary, fontSize: 11, fontWeight: '800' }, phoneLabel: { fontSize: 8, letterSpacing: 1.7, backgroundColor: c.glass, paddingVertical: 3, paddingHorizontal: 8, marginTop: 8, borderRadius: 5, fontWeight: '800' },
  speed: { alignItems: 'center', marginBottom: 13, width: 52, height: 49, borderRadius: 12, backgroundColor: c.glass, justifyContent: 'center' }, speedValue: { fontSize: 23, lineHeight: 25 }, speedValueBoosted: { color: c.brand, fontWeight: '800' }, speedUnit: { fontSize: 8, color: c.muted },
  boostPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: c.glass, borderWidth: 1.5, borderColor: c.surface, marginBottom: 5 },
  boostPillActive: { backgroundColor: c.brand, borderColor: '#FFFFFF' },
  boostPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, color: c.brand },
  boostPillTextActive: { color: '#000000' },
  explore: { position: 'absolute', alignSelf: 'center', backgroundColor: c.glass, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' }, exploreTitle: { fontSize: 19 }, exploreNote: { fontSize: 10, marginTop: 4, color: c.muted }, action: { position: 'absolute', left: 24, right: 24 }, position: { position: 'absolute', bottom: 3, alignSelf: 'center' }, positionText: { fontSize: 7, color: c.onSurface, opacity: .5 },
}));