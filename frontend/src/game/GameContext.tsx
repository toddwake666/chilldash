import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, openSave, Catalog, Destination, Dispatch, Order, Point, Profile, Service, Weather, restoreProfileFromSyncCode, saveLocalProfile, setSyncId } from './api';
import { configureWorld, distance, GARAGE, nearestRoad } from './world';
import * as Haptics from 'expo-haptics';
import { User } from '@supabase/supabase-js';
import { 
  supabase, 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  signOutUser, 
  syncProfileToSupabase,
  loadProfileForUser,
  AuthResult
} from './supabase';
import { playCoinSound, playDeliverSound, playTapSound } from './sounds';
import { syncPlayGamesProgress } from './playGames';
import {
  identifyRider,
  trackDeliveryEvent,
  trackEconomyEvent,
  trackTutorialEvent,
  trackTabSwitch,
  trackEvent,
} from './analytics';
import {
  checkProStatusFull,
  linkRevenueCatUser,
  restoreProPurchases,
  ProStatus,
} from './monetization';

export type PhoneTab = 'orders' | 'gps' | 'wallet' | 'food' | 'kit' | 'milestones' | 'care' | 'profile';
export type PhoneApp = 'apps' | 'rider' | 'chat' | 'wallet';
function useGameState() {
  const [profile, setProfile] = useState<Profile | null>(null), [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null), [authLoading, setAuthLoading] = useState(false);
  const authProcessing = useRef(false);
  const lastProcessedUserId = useRef<string | null>(null);
  const [screen, setScreen] = useState<'garage' | 'city'>('garage');
  const [order, setOrder] = useState<Order | null>(null), [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [phone, setPhone] = useState(false), [phoneTab, setPhoneTabState] = useState<PhoneTab>('orders');
  const setPhoneTab = (tab: PhoneTab) => {
    trackTabSwitch(tab);
    setPhoneTabState(tab);
  };
  const [phoneApp, setPhoneApp] = useState<PhoneApp>('rider');
  const [panel, setPanel] = useState<'help' | 'world' | 'pause' | 'gear' | 'status' | 'service' | 'boost' | null>(null);
  const [serviceStop, setServiceStop] = useState<Service | null>(null), [destination, setDestination] = useState<Destination | null>(null);
  const [houseAd, setHouseAd] = useState<{ onClaim?: () => void } | null>(null);
  const showHouseAd = useCallback((onClaim?: () => void) => { setHouseAd({ onClaim }); }, []);
  const closeHouseAd = useCallback((claim = true) => {
    setHouseAd(curr => {
      if (claim && curr?.onClaim) curr.onClaim();
      return null;
    });
  }, []);
  const [toast, setToast] = useState(''), [reward, setReward] = useState<Order | null>(null), [now, setNow] = useState(Date.now() / 1000);
  const position = useRef<Point>({ ...GARAGE }), clock = useRef(540), weather = useRef<Weather>('sunny'), weatherAuto = useRef(true);
  const pending = useRef({ elapsed: 0, moving: 0, distance: 0 });
  const current = useRef<Profile | null>(null), currentOrder = useRef<Order | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve()), requestLock = useRef(false), lastCollision = useRef(0);

  // ─── Pro Status ──────────────────────────────────────────────────────────────
  const [proStatus, setProStatus] = useState<ProStatus>({ isPro: false, billingIssue: false, tier: null, expiresAt: null });
  const lastKnownIsPro = useRef<boolean>(false);
  const proStatusCheckInProgress = useRef(false);

  const refreshProStatus = useCallback(async (source = 'manual') => {
    if (proStatusCheckInProgress.current) return;
    proStatusCheckInProgress.current = true;
    try {
      const status = await checkProStatusFull();
      // If RevenueCat was unreachable (returned null), keep last known state — never revoke on bad wifi
      if (status === null) return;

      setProStatus(status);

      const wasPro = lastKnownIsPro.current;
      const nowPro = status.isPro;
      lastKnownIsPro.current = nowPro;

      if (wasPro && !nowPro) {
        // Subscription expired / cancelled — revoke benefits
        const p = current.current;
        if (p) {
          p.is_pro = false;
          p.pro_free_boosts = 0;
          p.pro_boost_reset_at = undefined;
          await saveLocalProfile(p);
          applyProfile({ ...p });
          syncProfileToSupabase(p).catch(() => {});
        }
        notify('Your Pro subscription has ended. Benefits have been removed. Your progress and data are safe.');
      } else if (!wasPro && nowPro) {
        // Newly activated (purchase or restore) — grant benefits
        const p = current.current;
        if (p && !p.is_pro) {
          p.is_pro = true;
          if (!p.pro_free_boosts || p.pro_free_boosts < 1) {
            p.pro_free_boosts = 2;
            p.pro_boost_reset_at = (p.minutes || 0) + 10080;
          }
          await saveLocalProfile(p);
          applyProfile({ ...p });
          syncProfileToSupabase(p).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[GameContext] refreshProStatus error:', e);
    } finally {
      proStatusCheckInProgress.current = false;
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  const hasSignificantProfileChange = (prev: Profile | null, next: Profile): boolean => {
    if (!prev) return true;
    if (prev.balance !== next.balance || prev.earned !== next.earned) return true;
    if (prev.xp !== next.xp || prev.deliveries !== next.deliveries) return true;
    if (prev.dead !== next.dead || prev.at_garage !== next.at_garage || prev.online !== next.online) return true;
    if (prev.bike !== next.bike || prev.gear !== next.gear) return true;
    if (prev.is_pro !== next.is_pro || prev.pro_free_boosts !== next.pro_free_boosts) return true;
    if (prev.speed_boost_until !== next.speed_boost_until) return true;
    if (Math.abs(prev.health - next.health) >= 1) return true;
    if (Math.abs(prev.hunger - next.hunger) >= 1) return true;
    if (Math.abs(prev.energy - next.energy) >= 1) return true;

    const pb = prev.bikes?.[prev.bike];
    const nb = next.bikes?.[next.bike];
    if (!pb || !nb) return true;
    if (Math.abs((pb.fuel ?? 0) - (nb.fuel ?? 0)) >= 1) return true;
    if (Math.abs((pb.condition ?? 0) - (nb.condition ?? 0)) >= 1) return true;
    if (Math.abs((pb.air ?? 0) - (nb.air ?? 0)) >= 1) return true;

    return false;
  };

  const notify = useCallback((message: string) => setToast(message), []);
  const applyProfile = useCallback((p: Profile, force = false) => {
    const prev = current.current;
    current.current = p;

    if (p.dead) {
      setPhone(false);
      setPanel(null);
      setReward(null);
      setDestination(null);
    }
    syncPlayGamesProgress(p).catch(() => {});

    // Silent save: update ref silently without triggering a component tree re-render if stats haven't changed
    if (!force && !hasSignificantProfileChange(prev, p)) {
      return;
    }

    setProfile(p);
  }, []);
  const receiveDispatch = useCallback((d: Dispatch) => {
    const old = currentOrder.current;
    if (old?.status === 'accepted' && old.pickup_deadline && old.pickup_deadline < Date.now() / 1000 && d.orders[0]?.id !== old.id) {
      notify('Pickup missed. The shop automatically cancelled this order.');
      trackDeliveryEvent('cancelled', old, { reason: 'deadline_missed' });
    }
    const newOrder = d.orders[0] || null;
    if (newOrder && newOrder.status === 'offered' && (!old || old.id !== newOrder.id)) {
      trackDeliveryEvent('offered', newOrder);
    }

    const orderChanged =
      (!old && !!newOrder) ||
      (!!old && !newOrder) ||
      (old && newOrder && (
        old.id !== newOrder.id ||
        old.status !== newOrder.status ||
        old.pickup_deadline !== newOrder.pickup_deadline
      ));

    if (orderChanged) {
      currentOrder.current = newOrder;
      setOrder(newOrder);
    }

    setDispatch(prevDispatch => {
      if (
        prevDispatch &&
        prevDispatch.orders.length === d.orders.length &&
        prevDispatch.orders.every((o, idx) => o.id === d.orders[idx]?.id && o.status === d.orders[idx]?.status)
      ) {
        return prevDispatch;
      }
      return d;
    });
  }, [notify]);
  const changeOrder = (o: Order | null) => { currentOrder.current = o; setOrder(o); };
  useEffect(() => { const id = setInterval(() => setNow(Date.now() / 1000), 500); return () => clearInterval(id); }, []);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 4300); return () => clearTimeout(id); } }, [toast]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        lastProcessedUserId.current = session.user.id;
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user && event === 'SIGNED_IN' && lastProcessedUserId.current !== session.user.id) {
        await handleAuthSuccess(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async (authUser: User) => {
    if (!authUser) return;
    if (authProcessing.current) return;
    authProcessing.current = true;
    setUser(authUser);
    // Link RevenueCat anonymous ID → Supabase user ID so Pro is portable across devices
    linkRevenueCatUser(authUser.id).catch(() => {});
    try {
      const cloudSave = await loadProfileForUser(authUser.id);
      const curr = current.current;

      const isCurrRookie = !curr || (curr.deliveries === 0 && curr.xp === 0 && curr.balance <= 30);
      const cloudProgress = cloudSave ? (cloudSave.xp || 0) * 1000 + (cloudSave.deliveries || 0) * 100 + (cloudSave.balance || 0) : -1;
      const currProgress = curr ? (curr.xp || 0) * 1000 + (curr.deliveries || 0) * 100 + (curr.balance || 0) : 0;

      if (cloudSave && (isCurrRookie || cloudProgress >= currProgress)) {
        const profileToApply: Profile = { ...cloudSave };
        let boostAwarded = false;

        // Award boost if not claimed in the cloud save
        if (!profileToApply.auth_boost_claimed) {
          profileToApply.auth_boost_claimed = true;
          profileToApply.balance += 100;
          profileToApply.earned += 100;
          profileToApply.health = 100;
          profileToApply.hunger = 100;
          profileToApply.energy = 100;
          if (profileToApply.bikes?.[profileToApply.bike]) {
            profileToApply.bikes[profileToApply.bike].condition = 100;
            profileToApply.bikes[profileToApply.bike].fuel = 100;
            profileToApply.bikes[profileToApply.bike].air = 100;
          }
          boostAwarded = true;
        }

        await setSyncId(profileToApply.id);
        await saveLocalProfile(profileToApply);
        applyProfile(profileToApply);
        position.current = profileToApply.position;
        clock.current = profileToApply.minutes;
        weather.current = profileToApply.weather;
        await syncProfileToSupabase(profileToApply, true);
        lastProcessedUserId.current = authUser.id;
        identifyRider({
          userId: authUser.id,
          email: authUser.email,
          deliveries: profileToApply.deliveries,
          balance: profileToApply.balance,
          currentBike: profileToApply.bike,
        });

        if (boostAwarded) {
          notify(`Welcome back, ${profileToApply.name}! Save restored & ⚡ +100 Coins Boost added!`);
        } else {
          notify(`Welcome back! Progress restored (Level ${Math.floor((profileToApply.xp || 0) / 100) + 1}).`);
        }
        return;
      }

      if (curr) {
        const profileToApply: Profile = { ...curr };
        let boostAwarded = false;

        if (!profileToApply.auth_boost_claimed) {
          profileToApply.auth_boost_claimed = true;
          profileToApply.balance += 100;
          profileToApply.earned += 100;
          profileToApply.health = 100;
          profileToApply.hunger = 100;
          profileToApply.energy = 100;
          if (profileToApply.bikes?.[profileToApply.bike]) {
            profileToApply.bikes[profileToApply.bike].condition = 100;
            profileToApply.bikes[profileToApply.bike].fuel = 100;
            profileToApply.bikes[profileToApply.bike].air = 100;
          }
          boostAwarded = true;
        }

        await saveLocalProfile(profileToApply);
        applyProfile(profileToApply);
        await syncProfileToSupabase(profileToApply, true);
        lastProcessedUserId.current = authUser.id;
        identifyRider({
          userId: authUser.id,
          email: authUser.email,
          deliveries: profileToApply.deliveries,
          balance: profileToApply.balance,
          currentBike: profileToApply.bike,
        });

        if (boostAwarded) {
          notify('⚡ Account Boost Activated! +100 bonus coins awarded & rider refreshed!');
        } else {
          notify('Welcome! Cloud save synced to your account.');
        }
      }
    } catch (e) {
      console.warn('[Auth Link Error]', e);
    } finally {
      authProcessing.current = false;
    }
  };
  const initialize = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = await openSave();
      position.current = p.position; clock.current = p.minutes; weather.current = p.weather;
      applyProfile(p); setScreen(p.at_garage ? 'garage' : 'city');
      // Seed lastKnownIsPro from local profile so first check doesn't wrongly trigger expiry toast
      lastKnownIsPro.current = !!p.is_pro;
      identifyRider({
        userId: p.id,
        deliveries: p.deliveries,
        balance: p.balance,
        currentBike: p.bike,
      });
      trackEvent('game_session_start', {
        deliveries: p.deliveries,
        bike: p.bike,
        balance: p.balance,
      });
      const loadedCatalog=await api<Catalog>('/catalog'); configureWorld(loadedCatalog.world,loadedCatalog.server_time); setCatalog(loadedCatalog); receiveDispatch(await api<Dispatch>('/dispatch'));
      // Check Pro status once on app open (non-blocking, doesn't delay game start)
      refreshProStatus('app_open').catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect to your garage.'); }
    finally { setLoading(false); }
  }, [applyProfile, receiveDispatch, refreshProStatus]);
  useEffect(() => { initialize(); }, [initialize]);

  const enqueue = useCallback((fn: () => Promise<unknown>) => {
    const next = queue.current.then(fn, fn); queue.current = next.catch(() => {}); return next;
  }, []);
  const flush = useCallback(async () => {
    if (!current.current) return;
    const metrics = { ...pending.current }; pending.current = { elapsed: 0, moving: 0, distance: 0 };
    try {
      const result = await api<{ profile: Profile; dispatch: Dispatch }>('/game/tick', 'POST', {
        position: position.current, minutes: clock.current, weather: weather.current,
        elapsed: Math.min(30, metrics.elapsed), moving: Math.min(30, metrics.moving), distance: Math.min(6500, metrics.distance),
      });
      applyProfile(result.profile); receiveDispatch(result.dispatch);
    } catch (e) {
      pending.current.elapsed += metrics.elapsed; pending.current.moving += metrics.moving; pending.current.distance += metrics.distance;
      throw e;
    }
  }, [applyProfile, receiveDispatch]);
  const save = useCallback(() => enqueue(flush), [enqueue, flush]);
  const refreshOrder = useCallback(async () => { await save(); }, [save]);
  useEffect(() => {
    if (!profile?.id) return;
    let timerId: ReturnType<typeof setInterval> | null = null;
    const startTimer = () => {
      if (!timerId) {
        timerId = setInterval(() => { save().catch(() => {}); }, 5000);
      }
    };
    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    if (AppState.currentState === 'active') {
      startTimer();
    }

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        startTimer();
        // Re-check Pro status every time app comes back to foreground
        refreshProStatus('app_resume').catch(() => {});
      } else {
        stopTimer();
        save().catch(() => {});
      }
    });

    return () => {
      stopTimer();
      sub.remove();
    };
  }, [profile?.id, save, refreshProStatus]);
  const act = async (fn: () => Promise<void>) => {
    if (requestLock.current) return;
    requestLock.current = true; setBusy(true);
    try { await enqueue(async () => { await flush(); await fn(); }); }
    catch (e) { notify(e instanceof Error ? e.message : 'That didn’t go through. Try again.'); }
    finally { requestLock.current = false; setBusy(false); }
  };
  const profileAction = (path: string, body?: unknown, message?: string, method = 'POST') => act(async () => {
    applyProfile(await api<Profile>(path, method, body)); if (message) notify(message);
  });
  const toggleOnline = () => act(async () => {
    const isNewLife = !current.current?.partho_quest_completed && !current.current?.partho_borrowed_express && (current.current?.partho_chat_stage ?? 0) < 2;
    if (isNewLife) {
      notify('Check your messages and meet Partho first!');
      return;
    }
    const p = await api<Profile>('/profile/online', 'PUT', { online: !current.current?.online }); applyProfile(p);
    receiveDispatch(await api<Dispatch>('/dispatch'));
    notify(p.online ? 'You’re online. Nearby shops will send requests when available.' : 'You’re offline. Existing pickups still have their deadline.');
  });
  const equip = (bike: string, gear: string) => profileAction('/profile/equipment', { bike, gear }, 'Kit updated. Ready for the road.', 'PUT');
  const purchase = (item: string) => profileAction('/profile/purchase', { item }, 'Unlocked and packed for your next ride.');
  const accept = () => act(async () => {
    if (!currentOrder.current) return;
    const isNewLife = !current.current?.partho_quest_completed && !current.current?.partho_borrowed_express && (current.current?.partho_chat_stage ?? 0) < 2;
    if (isNewLife) {
      notify('Check your messages and meet Partho first!');
      return;
    }
    trackDeliveryEvent('accepted', currentOrder.current);
    changeOrder(await api<Order>(`/orders/${currentOrder.current.id}/accept`, 'POST'));
    if (current.current!.at_garage) applyProfile(await api<Profile>('/garage/leave', 'POST'));
    setPhone(false); setScreen('city'); setDestination(null); notify('Pickup clock started. Follow the route to the shop’s footpath.');
  });
  const decline = () => act(async () => {
    if (!currentOrder.current) return;
    trackDeliveryEvent('declined', currentOrder.current);
    await api(`/orders/${currentOrder.current.id}/decline`, 'POST'); changeOrder(null);
    receiveDispatch(await api<Dispatch>('/dispatch')); notify('Order closed. Explore other neighborhoods for your next request.');
  });
  const interact = () => act(async () => {
    const o = currentOrder.current; if (!o) return;
    if (o.status === 'accepted') {
      const roadPt = nearestRoad(o.pickup).point;
      const dist = Math.min(distance(position.current, o.pickup), distance(position.current, roadPt));
      if (dist > 60) {
        notify('Ride closer to the shop to pick up.');
        return;
      }
      const updated = await api<Order>(`/orders/${o.id}/pickup`, 'POST', position.current);
      trackDeliveryEvent('picked_up', o);
      changeOrder(updated); setDestination(null);
      notify('Collected! Follow the route to the dropoff location.');
    } else if (o.status === 'picked_up') {
      const roadPt = nearestRoad(o.dropoff).point;
      const dist = Math.min(distance(position.current, o.dropoff), distance(position.current, roadPt));
      if (dist > 60) {
        notify('You must reach the customer’s delivery location first!');
        return;
      }
      const result = await api<{ order: Order; profile: Profile }>(`/orders/${o.id}/deliver`, 'POST', position.current);
      trackDeliveryEvent('completed', o, {
        health_remaining: result.profile.health,
        fuel_remaining: result.profile.bikes?.[result.profile.bike]?.fuel,
      });
      applyProfile(result.profile); setReward(result.order); changeOrder(null); setDestination(null);
      playDeliverSound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  });
  const headOut = () => act(async () => { applyProfile(await api<Profile>('/garage/leave', 'POST')); setScreen('city'); notify('Check your supplies. Toggle online inside your phone.'); });
  const returnGarage = () => act(async () => {
    const p = await api<Profile>('/garage/enter', 'POST'); applyProfile(p); position.current = p.position;
    setPanel(null); setPhone(false); setDestination(null); setScreen('garage'); receiveDispatch(await api<Dispatch>('/dispatch'));
    notify('Home at last. Health and energy restored.');
  });
  const openPhone = (tab: PhoneTab = 'orders', app: PhoneApp = 'rider') => {
    setPanel(null);
    if (tab === 'wallet' || app === 'wallet') {
      setPhoneApp('wallet');
      setPhoneTab('wallet');
    } else if (app === 'chat') {
      setPhoneApp('chat');
    } else if (app === 'apps') {
      setPhoneApp('apps');
    } else {
      setPhoneApp('rider');
      setPhoneTab(tab);
    }
    setPhone(true);
  };
  const borrowParthoExpress = () => act(async () => {
    trackTutorialEvent('borrow_express');
    const p = await api<Profile>('/tutorial/partho_borrow_express', 'POST');
    applyProfile(p);
    if (current.current?.at_garage || screen === 'garage') {
      applyProfile(await api<Profile>('/garage/leave', 'POST'));
      setScreen('city');
    }
    setPhone(false);
    setPhoneApp('rider');
    setPhoneTab('orders');
    playDeliverSound();
    notify('🔑 Got the keys to The Express! Open phone & go online for orders.');
  });
  const returnParthoExpress = () => act(async () => {
    trackTutorialEvent('return_express');
    const p = await api<Profile>('/tutorial/partho_return_express', 'POST');
    applyProfile(p);
    notify("Keys returned to Partho. You're back on The Daydream!");
  });
  const setParthoChatStage = (stage: number) => act(async () => {
    trackTutorialEvent('partho_chat_stage', { stage });
    const p = await api<Profile>('/tutorial/partho_chat_stage', 'POST', { stage });
    applyProfile(p);
  });
  const navigateTo = (place: Destination) => { setDestination(place); setPhone(false); setPanel(null); if (screen === 'garage') headOut(); notify(`GPS set to ${place.name}.`); };
  const quickTravel = (place: { id: string; name: string; x: number; y: number }) => act(async () => {
    if (current.current?.online) {
      notify('Quick Travel is offline-only. Toggle offline in your phone.');
      return;
    }
    if (currentOrder.current) {
      notify('Cannot quick travel while on an active delivery.');
      return;
    }
    if ((current.current?.balance || 0) < 30) {
      notify('Not enough coins. Quick Travel costs 30 coins.');
      return;
    }
    // Transport rider directly to the nearest road location of destination
    const roadTarget = nearestRoad({ x: place.x, y: place.y }).point;
    const newPos = { x: Math.round(roadTarget.x), y: Math.round(roadTarget.y) };

    position.current = newPos;
    pending.current = { elapsed: 0, moving: 0, distance: 0 };
    const p = await api<Profile>('/profile/travel', 'POST', { destination: newPos, cost: 30 });
    applyProfile(p);
    setDestination(null);
    setPhone(false);
    setPanel(null);
    if (screen === 'garage') {
      applyProfile(await api<Profile>('/garage/leave', 'POST'));
      setScreen('city');
    }
    notify(`Quick-travelled to ${place.name}! (-30 coins)`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  });
  const openService = (place: Service) => { setServiceStop(place); setPanel('service'); };
  const useService = (action: string, coins?: number) => {
    trackEconomyEvent('service_used', { item_id: action, cost: coins });
    return profileAction('/services/use', { service_id: serviceStop?.id, action, coins }, 'All taken care of. Safe travels!');
  };
  const collision = (kind: 'traffic' | 'wall') => {
    if (Date.now() - lastCollision.current < 3500 || current.current?.dead) return;
    lastCollision.current = Date.now();
    api<Profile>('/game/collision', 'POST', { kind })
      .then(p => {
        applyProfile(p);
        notify(kind === 'traffic' ? 'Collision! Bike condition, health and energy took a hit.' : 'Watch the curb! Bike and energy took a hit.');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      })
      .catch(() => {});
  };
  const recover = (choice: 'pay' | 'restart') => act(async () => {
    const p = await api<Profile>('/recovery', 'POST', { choice, confirm_restart: choice === 'restart' }); applyProfile(p);
    position.current = p.position; clock.current = p.minutes; weather.current = p.weather; pending.current = { elapsed: 0, moving: 0, distance: 0 };
    changeOrder(null); setScreen('garage'); setPhone(false); setPanel(null); notify(choice === 'pay' ? 'Back at the garage. Your progress is safe; the delivery was cancelled.' : 'A fresh start. Take care of yourself out there.');
  });
  return { profile, catalog, loading, error, initialize, busy, screen, order, dispatch, phone, setPhone, phoneTab, setPhoneTab, phoneApp, setPhoneApp, borrowParthoExpress, returnParthoExpress, setParthoChatStage, panel, setPanel, toast, notify, reward, dismissReward: () => setReward(null), position, clock, weather, weatherAuto, pending, now, toggleOnline, equip, purchase, accept, decline, interact, headOut, returnGarage, openPhone, refreshOrder, save, destination, setDestination, navigateTo, quickTravel, serviceStop, openService, useService, collision, recover, houseAd, showHouseAd, closeHouseAd,
    proStatus,
    refreshProStatus,
    restorePurchases: async () => {
      const result = await restoreProPurchases();
      if (result.status) {
        const nowPro = result.status.isPro;
        setProStatus(result.status);
        const wasPro = lastKnownIsPro.current;
        lastKnownIsPro.current = nowPro;
        if (!wasPro && nowPro) {
          const p = current.current;
          if (p && !p.is_pro) {
            p.is_pro = true;
            if (!p.pro_free_boosts || p.pro_free_boosts < 1) {
              p.pro_free_boosts = 2;
              p.pro_boost_reset_at = (p.minutes || 0) + 10080;
            }
            await saveLocalProfile(p);
            applyProfile({ ...p });
            syncProfileToSupabase(p).catch(() => {});
          }
        }
      }
      notify(result.message);
      return result;
    },
    buyFood: (item: string) => {
      trackEconomyEvent('food_bought', { item_id: item });
      return profileAction('/food/buy', { item }, 'Food added to your bag. Tap Eat when you need it.');
    },
    eatFood: (item: string) => {
      trackEconomyEvent('food_eaten', { item_id: item });
      return profileAction('/food/eat', { item }, 'A little nourishment. Feeling better already.');
    },
    claimMilestone: (count: number) => {
      playDeliverSound();
      trackEconomyEvent('reward_claimed', { item_id: `milestone_${count}` });
      return profileAction(`/milestones/${count}/claim`, undefined, 'Milestone claimed! Coins and food added to your bag.');
    },
    carryKit: (carry: boolean) => profileAction('/gear/carry', { carry }, carry ? 'Rain kit packed.' : 'Rain kit left at home.'),
    remoteKit: () => {
      trackEconomyEvent('gear_bought', { item_id: 'remote_raincoat' });
      return profileAction('/gear/remote', undefined, 'Your rain kit is here. Equip it to stay dry.');
    },
    roadside: (action: string, coins?: number) => profileAction('/services/roadside', { action, coins }, 'Roadside help arrived. You’re ready to roll again.'),
    upgradeTank: (bike: string) => {
      trackEconomyEvent('bike_upgraded', { item_id: bike, category: 'fuel_tank' });
      return profileAction('/garage/upgrade_tank', { bike }, 'Fuel tank upgraded! Extended capacity installed and fully fueled.');
    },
    activateSpeedBoost: async (method: 'pro' | 'coins' | 'ad') => {
      setBusy(true);
      try {
        const res = await api<{ profile: Profile; message: string }>('/game/boost', 'POST', { method });
        applyProfile(res.profile);
        notify(res.message);
        playDeliverSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e: any) {
        notify(e.message || 'Could not activate Speed Boost.');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    openSpeedBoost: () => {
      setPhone(false);
      setPanel('boost');
    },
    addCoins: (coins: number, message?: string) => {
      playCoinSound();
      return profileAction('/wallet/coins', { coins }, message || `+${coins} coins added!`);
    },
    restoreAccount: async (syncCode: string): Promise<boolean> => {
      try {
        setBusy(true);
        const restored = await restoreProfileFromSyncCode(syncCode);
        if (restored) {
          applyProfile(restored);
          position.current = restored.position;
          clock.current = restored.minutes;
          weather.current = restored.weather;
          notify(`Account restored! Level ${Math.floor(restored.xp / 100) + 1}, ${restored.balance} coins.`);
          return true;
        } else {
          notify('Sync code not found in Supabase. Check the code and try again.');
          return false;
        }
      } catch (err: any) {
        notify(err?.message || 'Failed to restore account.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    user,
    authLoading,
    loginWithEmail: async (email: string, pass: string): Promise<AuthResult> => {
      setAuthLoading(true);
      try {
        const res = await signInWithEmail(email, pass);
        if (res.success && res.user) {
          await handleAuthSuccess(res.user);
        }
        return res;
      } finally {
        setAuthLoading(false);
      }
    },
    signupWithEmail: async (email: string, pass: string, name?: string): Promise<AuthResult> => {
      setAuthLoading(true);
      try {
        const res = await signUpWithEmail(email, pass, name);
        if (res.success && res.user) {
          if (name && current.current) {
            current.current.name = name;
            applyProfile({ ...current.current });
          }
          await handleAuthSuccess(res.user);
        }
        return res;
      } finally {
        setAuthLoading(false);
      }
    },
    loginWithGoogle: async (): Promise<AuthResult> => {
      setAuthLoading(true);
      try {
        const res = await signInWithGoogle();
        if (res.success && res.user) {
          await handleAuthSuccess(res.user);
        }
        return res;
      } finally {
        setAuthLoading(false);
      }
    },
    logout: async (): Promise<void> => {
      setAuthLoading(true);
      try {
        await signOutUser();
        setUser(null);
        lastProcessedUserId.current = null;
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newGuestSyncId = `CD-${part1}-${part2}`;
        await setSyncId(newGuestSyncId);
        if (current.current) {
          current.current.id = newGuestSyncId;
          await saveLocalProfile({ ...current.current });
        }
        notify('Signed out. Playing as guest.');
      } finally {
        setAuthLoading(false);
      }
    },
    syncNow: async (): Promise<boolean> => {
      if (!current.current) return false;
      try {
        await syncProfileToSupabase(current.current, true);
        notify('Cloud save synced successfully!');
        return true;
      } catch {
        notify('Failed to sync to cloud.');
        return false;
      }
    },
    borrowViper: () => profileAction('/tutorial/borrow_viper', undefined, 'Viper RR keys in hand! Feel that 1000cc rumble.'),
    packFreeRainKit: () => profileAction('/gear/remote', undefined, 'Rain kit packed for free! Ready for sudden storms.'),
    advanceTutorialStep: (step: number) => profileAction('/tutorial/step', { step }),
    finishTutorial: () => profileAction('/tutorial/return_viper', undefined, 'Training complete! Boss bonus: +50 Coins & +50 XP! You proved yourself, rookie.'),
    skipTutorial: () => profileAction('/tutorial/skip', undefined, 'Tutorial skipped. You are on your own now, rider. Stay safe!'),
    navigateToFuel: () => {
      const fuelService = catalog?.services?.find(s => s.kind === 'fuel') || { id: 'sunny-fuel', name: 'Sunshine Fuel & Air', x: 728, y: 1090, kind: 'fuel', address: 'Garden Avenue · Sunnyvale' };
      navigateTo({ id: fuelService.id, name: fuelService.name, x: fuelService.x, y: fuelService.y, kind: 'service', address: fuelService.address });
    },
    navigateToBoss: () => {
      navigateTo({ id: 'boss_shimultala', name: 'Shimultala Heights Apartments', x: 4800, y: 520, kind: 'landmark', address: 'Block A · Bongaon' });
    },
    navigateToGarage: () => {
      navigateTo({ id: 'home_garage', name: 'Home Sweet Garage', x: GARAGE.x, y: GARAGE.y, kind: 'garage', address: 'Home Sweet Garage · Sunnyvale' });
    },
    claimBridgeGoal: () => profileAction('/goals/claim_bridge', undefined, 'Goal Claimed! +50 Coins & 2 Sandwiches for crossing the RevenueCat Bridge!'),
  };
}
const GameContext = createContext<ReturnType<typeof useGameState> | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) { return <GameContext.Provider value={useGameState()}>{children}</GameContext.Provider>; }
export function useGame() { const state = useContext(GameContext); if (!state) throw new Error('GameProvider is missing.'); return state; }