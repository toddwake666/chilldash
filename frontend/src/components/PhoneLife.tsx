import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useGame } from '@/src/game/GameContext';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Coin, Icon, Label } from './ui';
import { Vitals } from './Vitals';
import { getFullRefuelCost } from '@/src/game/localEngine';
import { checkPlayGamesAuth, signInPlayGames, showPlayGamesAchievements, showPlayGamesLeaderboards, PlayGamesPlayer } from '@/src/game/playGames';

export function FoodView() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme();
  return <View testID="phone-food-screen"><Label style={s.kicker}>FUEL THE RIDER, TOO</Label><Label display style={s.title}>A little bite of better.</Label><Label style={s.note}>Food stays in your bag until you eat it. Low hunger drains health; a meal restores health and energy.</Label><View style={s.balance}><Label style={s.note}>Pocket money</Label><Coin amount={g.profile!.balance} /></View>{Object.entries(g.catalog!.foods).map(([id, food], i) => <View testID={`food-card-${id}`} key={id} style={s.card}><View style={s.row}><View style={s.art}><Icon name={['nutrition-outline', 'fast-food-outline', 'restaurant-outline'][i]} size={31} color={c.teal} /></View><View style={s.grow}><Label display style={s.cardTitle}>{food.name}</Label><Label style={s.tiny}>Hunger +{food.hunger} · Energy +{food.energy}{'\n'}Health +{food.health}</Label></View><Coin amount={food.price} small /></View><View style={s.actions}><Button testID={`buy-food-${id}-button`} title={`BUY · ${food.price}`} onPress={() => g.buyFood(id)} loading={g.busy} style={s.half} /><Button testID={`eat-food-${id}-button`} title={`EAT (${g.profile!.food[id] || 0})`} secondary disabled={!g.profile!.food[id] || g.busy} onPress={() => g.eatFood(id)} style={s.half} /></View></View>)}</View>;
}

export function KitView() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(), p = g.profile!;
  const owned = p.owned_gear.includes('raincoat'), extra = p.at_garage ? 0 : 10, price = (owned ? 0 : 60) + extra;
  return <View testID="phone-kit-screen"><Label style={s.kicker}>A LITTLE PREPARATION GOES A LONG WAY</Label><Label display style={s.title}>Weather the weather.</Label><View style={s.kitArt}><Icon name="umbrella-outline" size={66} color={c.teal} /></View><Label style={s.note}>Rain drains health when your rain kit is not worn. Pack it at home, then put it on from your phone whenever rain arrives.</Label><View style={s.card}><Label display style={s.cardTitle}>Rain-ready kit</Label><Label testID="rain-kit-state" style={s.note}>{p.gear === 'raincoat' ? 'Wearing · protected from rain' : p.carrying_rainkit ? 'In your bag · ready to wear' : owned ? 'Owned · left at the garage' : 'Not owned yet'}</Label>{p.carrying_rainkit ? <Button testID="wear-rain-kit-button" title={p.gear === 'raincoat' ? 'TAKE OFF RAIN KIT' : 'WEAR RAIN KIT'} loading={g.busy} onPress={() => g.equip(p.bike, p.gear === 'raincoat' ? 'everyday' : 'raincoat')} icon="umbrella-outline" /> : p.at_garage && owned ? <Button testID="pack-rain-kit-button" title="PACK MY RAIN KIT" onPress={() => g.carryKit(true)} loading={g.busy} /> : <><Label testID="rain-kit-price" style={s.price}>{owned ? 'Kit retrieval' : 'Rain kit 60 coins'}{extra ? ' + 10 coin delivery' : ''} · Total {price}</Label><Button testID="buy-remote-rain-kit-button" title={`${owned ? 'GET MY KIT' : 'BUY RAIN KIT'} · ${price}`} onPress={g.remoteKit} loading={g.busy} /></>}{p.at_garage && p.carrying_rainkit && <Button testID="leave-rain-kit-button" title="LEAVE AT THE GARAGE" secondary onPress={() => g.carryKit(false)} loading={g.busy} style={{ marginTop: 12 }} />}</View><View style={s.tip}><Icon name="information-circle-outline" color={c.teal} /><Label style={s.tipText}>If you leave a kit at home, bringing it to you costs 10 coins. A new kit on the road costs 70 coins total.</Label></View></View>;
}

export function MilestonesView() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(), p = g.profile!;
  const bridgeVisited = !!p.visited_revenuecat_bridge;
  const bridgeClaimed = !!p.claimed_bridge_goal;

  const [pgPlayer, setPgPlayer] = React.useState<PlayGamesPlayer | null>(null);
  const [pgLoading, setPgLoading] = React.useState(false);

  React.useEffect(() => {
    checkPlayGamesAuth().then(res => {
      if (res.isAuthenticated && res.player) {
        setPgPlayer(res.player);
      }
    }).catch(() => {});
  }, []);

  const handlePlayGamesSignIn = async () => {
    setPgLoading(true);
    try {
      const res = await signInPlayGames();
      if (res.isAuthenticated && res.player) {
        setPgPlayer(res.player);
        Alert.alert('Play Games Connected', `Welcome, ${res.player.displayName}! Google Play Games is connected.`);
        g.notify(`Welcome, ${res.player.displayName}! Play Games connected.`);
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

  return <View testID="phone-milestones-screen">
    <Label style={s.kicker}>EVERY DELIVERY COUNTS</Label>
    <Label display style={s.title}>Little wins. Big smiles.</Label>
    <Label style={s.note}>{p.deliveries} deliveries completed. Claim coins and food as your story grows.</Label>

    {/* Google Play Games Hub Card */}
    <View testID="play-games-hub-card" style={[s.card, { borderColor: c.teal, backgroundColor: c.butter }]}>
      <View style={s.row}>
        <View style={[s.art, { backgroundColor: c.mint }]}>
          <Icon name="game-controller-outline" color={c.teal} size={28} />
        </View>
        <View style={s.grow}>
          <Label display style={s.cardTitle}>Google Play Games</Label>
          <Label style={s.tiny}>
            {pgPlayer
              ? `Signed in as ${pgPlayer.displayName} · Global Ranks Active`
              : 'Connect Play Games to unlock achievements and rank on leaderboards.'}
          </Label>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {pgPlayer ? (
          <>
            <Button
              testID="show-achievements-button"
              title="ACHIEVEMENTS"
              onPress={() => showPlayGamesAchievements()}
              style={s.half}
              icon="trophy-outline"
            />
            <Button
              testID="show-leaderboards-button"
              title="LEADERBOARDS"
              onPress={() => showPlayGamesLeaderboards()}
              secondary
              style={s.half}
              icon="podium-outline"
            />
          </>
        ) : (
          <Button
            testID="signin-play-games-button"
            title="CONNECT PLAY GAMES"
            loading={pgLoading}
            onPress={handlePlayGamesSignIn}
            icon="logo-google"
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
    {g.catalog!.milestones.map(m => {
      const claimed = p.claimed_milestones.includes(m.deliveries), ready = p.deliveries >= m.deliveries;
      return <View key={m.deliveries} style={s.card}>
        <View style={s.row}><View style={s.art}><Icon name={claimed ? 'checkmark-done' : 'trophy-outline'} color={c.teal} size={30} /></View><View style={s.grow}><Label display style={s.cardTitle}>{m.name}</Label><Label style={s.tiny}>{Math.min(p.deliveries, m.deliveries)}/{m.deliveries} deliveries</Label></View></View>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.min(100, p.deliveries / m.deliveries * 100)}%` }]} /></View>
        <View style={s.rewardRow}><Coin amount={`+${m.coins}`} small /><Label style={s.tiny}>{Object.entries(m.food).map(([id, count]) => `${count} ${g.catalog!.foods[id].name.toLowerCase()}`).join(', ')}</Label></View>
        <Button testID={`claim-milestone-${m.deliveries}-button`} title={claimed ? 'CLAIMED' : ready ? 'CLAIM REWARDS' : `${m.deliveries - p.deliveries} MORE DELIVERIES`} secondary={!ready || claimed} disabled={!ready || claimed || g.busy} onPress={() => g.claimMilestone(m.deliveries)} />
      </View>;
    })}
    <View testID="bridge-goal-card" style={s.card}>
      <View style={s.row}>
        <View style={[s.art, { backgroundColor: c.mint }]}><Icon name={bridgeClaimed ? 'checkmark-done' : 'boat-outline'} color={c.teal} size={30} /></View>
        <View style={s.grow}>
          <Label display style={s.cardTitle}>Visit RevenueCat Bridge</Label>
          <Label style={s.tiny}>{bridgeClaimed ? 'Bridge conquered · Rewards claimed' : bridgeVisited ? 'Bridge crossed! Claim your rewards' : 'Cross the grand suspension bridge towards Bongaon'}</Label>
        </View>
      </View>
      <View style={s.progressTrack}><View style={[s.progressFill, { width: bridgeVisited ? '100%' : '0%' }]} /></View>
      <View style={s.rewardRow}><Coin amount="+50" small /><Label style={s.tiny}>2 sandwiches · +30 XP</Label></View>
      <Button testID="claim-bridge-goal-button" title={bridgeClaimed ? 'CLAIMED' : bridgeVisited ? 'CLAIM REWARDS' : 'NAVIGATE TO BRIDGE'} secondary={bridgeClaimed || !bridgeVisited} disabled={bridgeClaimed || g.busy} onPress={() => { if (bridgeVisited && !bridgeClaimed) { g.claimBridgeGoal?.(); } else if (!bridgeVisited) { g.navigateTo({ id: 'rc_bridge', name: 'RevenueCat Bridge', x: 3700, y: 1160, kind: 'bridge', address: 'Grand Suspension Bridge' }); } }} />
    </View>
  </View>;
}

export function CareView() {
  const g = useGame(), s = useStyles(), { colors: c } = useTheme(), p = g.profile!, bike = p.bikes[p.bike];
  const isBicycle = p.bike === 'bicycle';
  const resource = isBicycle ? 'air' : 'fuel', action = isBicycle ? 'pump' : 'refuel';
  const fullTankCost = getFullRefuelCost(p.bike, bike?.tank_level);
  const fullRefuelCost = isBicycle ? 4 : fullTankCost;
  const repairCost = Math.max(2, Math.ceil((100 - bike.condition) * .25));
  const canPartial = !isBicycle && fullRefuelCost > 6 && (bike.fuel || 0) < 95;

  return <View testID="phone-care-screen">
    <Label style={s.kicker}>LOOK AFTER YOURSELF AND YOUR RIDE</Label>
    <Label display style={s.title}>A little roadside care.</Label>
    <Vitals />
    <Label style={s.note}>Low health or energy slows your ride. At zero health, recover for 15 coins or restart from zero. Empty fuel, flat tires, or a broken bike means slow pushing—not getting stuck.</Label>
    <Button testID="care-food-button" title="OPEN MY FOOD BAG" onPress={() => g.setPhoneTab('food')} secondary icon="restaurant-outline" />
    <Label display style={s.section}>Find a service stop</Label>
    {g.catalog!.services.map(stop => <Pressable testID={`navigate-${stop.id}-button`} key={stop.id} onPress={() => g.navigateTo(stop)} style={s.place}>
      <View style={s.serviceIcon}><Icon name={stop.kind === 'garage' ? 'home-outline' : stop.kind === 'fuel' ? 'water-outline' : 'construct-outline'} color={c.teal} size={21} /></View>
      <View style={s.grow}><Label style={s.placeName}>{stop.name}</Label><Label style={s.tiny}>{stop.kind === 'garage' ? 'Free rest · health & energy' : stop.kind === 'fuel' ? `Fuel from 6 coins (Full: ${fullTankCost}c) · air pump 4c` : 'Repairs from 2 coins'}</Label></View>
      <Icon name="navigate-outline" color={c.teal} size={17} />
    </Pressable>)}
    <Label display style={s.section}>Can’t make the trip?</Label>
    <Label style={s.note}>Roadside help comes to your current location. Service price + 10 coins callout fee.</Label>
    {canPartial && (
      <Button
        testID="roadside-partial-resource-button"
        title="ROADSIDE SPLASH (6c FUEL) · 16 COINS"
        onPress={() => g.roadside('refuel', 6)}
        disabled={bike[resource] >= 99.9 || g.busy || p.balance < 16}
        secondary
        style={{ marginBottom: 8 }}
      />
    )}
    <Button testID="roadside-resource-button" title={`${action === 'pump' ? 'AIR PUMP' : 'FULL REFUEL'} · ${fullRefuelCost + 10} COINS`} onPress={() => g.roadside(action)} disabled={bike[resource] >= 99.9 || g.busy || p.balance < (fullRefuelCost + 10)} style={{ marginBottom: 12 }} />
    <Button testID="roadside-repair-button" title={`ROADSIDE REPAIR · ${repairCost + 10}`} onPress={() => g.roadside('repair')} disabled={bike.condition >= 99.9 || g.busy || p.balance < (repairCost + 10)} secondary />
  </View>;
}
const useStyles = makeStyles(c => ({ kicker: { fontSize: 8, letterSpacing: 1.15, color: c.teal, fontWeight: '800', marginBottom: 8 }, title: { fontSize: 26, letterSpacing: -.4, marginBottom: 13 }, note: { fontSize: 11, lineHeight: 18, color: c.muted, marginVertical: 12 }, balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, card: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, marginBottom: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9 }, grow: { flex: 1 }, art: { width: 48, height: 56, borderRadius: 15, backgroundColor: c.butter, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 18 }, tiny: { fontSize: 9, color: c.muted, lineHeight: 15, marginTop: 4 }, actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, half: { flex: 1, paddingHorizontal: 6, minHeight: 48 }, kitArt: { backgroundColor: c.mint, width: 128, height: 128, borderRadius: 64, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 8 }, price: { fontSize: 11, lineHeight: 18, color: c.teal, fontWeight: '800', marginBottom: 12 }, tip: { flexDirection: 'row', gap: 9, alignItems: 'center', padding: 13, backgroundColor: c.mint, borderRadius: 14 }, tipText: { flex: 1, fontSize: 10, lineHeight: 17, color: c.teal }, progressTrack: { height: 6, borderRadius: 4, backgroundColor: c.surfaceTertiary, overflow: 'hidden', marginTop: 16 }, progressFill: { height: '100%', backgroundColor: c.teal }, rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 }, section: { fontSize: 21, marginTop: 24, marginBottom: 12 }, place: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 64, borderBottomWidth: 1, borderColor: c.border, paddingVertical: 10 }, placeName: { fontSize: 12, fontWeight: '800' }, serviceIcon: { width: 35, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.mint } }));