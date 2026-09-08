import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, openSave, Catalog, Destination, Dispatch, Order, Point, Profile, Service, Weather } from './api';
import { configureWorld, GARAGE } from './world';
import * as Haptics from 'expo-haptics';

export type PhoneTab = 'orders' | 'gps' | 'wallet' | 'food' | 'kit' | 'milestones' | 'care';
function useGameState() {
  const [profile, setProfile] = useState<Profile | null>(null), [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<'garage' | 'city'>('garage');
  const [order, setOrder] = useState<Order | null>(null), [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [phone, setPhone] = useState(false), [phoneTab, setPhoneTab] = useState<PhoneTab>('orders');
  const [panel, setPanel] = useState<'help' | 'world' | 'pause' | 'gear' | 'status' | 'service' | null>(null);
  const [serviceStop, setServiceStop] = useState<Service | null>(null), [destination, setDestination] = useState<Destination | null>(null);
  const [toast, setToast] = useState(''), [reward, setReward] = useState<Order | null>(null), [now, setNow] = useState(Date.now() / 1000);
  const position = useRef<Point>({ ...GARAGE }), clock = useRef(540), weather = useRef<Weather>('sunny'), weatherAuto = useRef(true);
  const pending = useRef({ elapsed: 0, moving: 0, distance: 0 });
  const current = useRef<Profile | null>(null), currentOrder = useRef<Order | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve()), requestLock = useRef(false), lastCollision = useRef(0);
  const notify = useCallback((message: string) => setToast(message), []);
  const applyProfile = useCallback((p: Profile) => { current.current = p; setProfile(p); if (p.dead) { setPhone(false); setPanel(null); setReward(null); setDestination(null); } }, []);
  const receiveDispatch = useCallback((d: Dispatch) => {
    const old = currentOrder.current;
    if (old?.status === 'accepted' && old.pickup_deadline && old.pickup_deadline < Date.now() / 1000 && d.orders[0]?.id !== old.id) notify('Pickup missed. The shop automatically cancelled this order.');
    currentOrder.current = d.orders[0] || null; setOrder(currentOrder.current); setDispatch(d);
  }, [notify]);
  const changeOrder = (o: Order | null) => { currentOrder.current = o; setOrder(o); };
  useEffect(() => { const id = setInterval(() => setNow(Date.now() / 1000), 500); return () => clearInterval(id); }, []);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 4300); return () => clearTimeout(id); } }, [toast]);
  const initialize = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = await openSave();
      position.current = p.position; clock.current = p.minutes; weather.current = p.weather;
      applyProfile(p); setScreen(p.at_garage ? 'garage' : 'city');
      const loadedCatalog=await api<Catalog>('/catalog'); configureWorld(loadedCatalog.world,loadedCatalog.server_time); setCatalog(loadedCatalog); receiveDispatch(await api<Dispatch>('/dispatch'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect to your garage.'); }
    finally { setLoading(false); }
  }, [applyProfile, receiveDispatch]);
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
    const id = setInterval(() => { save().catch(() => notify('Signal is weak. Your last save will retry automatically.')); }, 3000);
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') save().catch(() => {}); });
    return () => { clearInterval(id); sub.remove(); };
  }, [profile?.id, save, notify]);
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
    const p = await api<Profile>('/profile/online', 'PUT', { online: !current.current?.online }); applyProfile(p);
    receiveDispatch(await api<Dispatch>('/dispatch'));
    notify(p.online ? 'You’re online. Nearby shops will send requests when available.' : 'You’re offline. Existing pickups still have their deadline.');
  });
  const equip = (bike: string, gear: string) => profileAction('/profile/equipment', { bike, gear }, 'Kit updated. Ready for the road.', 'PUT');
  const purchase = (item: string) => profileAction('/profile/purchase', { item }, 'Unlocked and packed for your next ride.');
  const accept = () => act(async () => {
    if (!currentOrder.current) return;
    changeOrder(await api<Order>(`/orders/${currentOrder.current.id}/accept`, 'POST'));
    if (current.current!.at_garage) applyProfile(await api<Profile>('/garage/leave', 'POST'));
    setPhone(false); setScreen('city'); setDestination(null); notify('Pickup clock started. Follow the route to the shop’s footpath.');
  });
  const decline = () => act(async () => {
    if (!currentOrder.current) return;
    await api(`/orders/${currentOrder.current.id}/decline`, 'POST'); changeOrder(null);
    receiveDispatch(await api<Dispatch>('/dispatch')); notify('Order closed. Explore other neighborhoods for your next request.');
  });
  const interact = () => act(async () => {
    const o = currentOrder.current; if (!o) return;
    if (o.status === 'accepted') {
      changeOrder(await api<Order>(`/orders/${o.id}/pickup`, 'POST', position.current)); setDestination(null);
      notify('Collected! The pickup timer is over. Deliver at your own pace.');
    } else if (o.status === 'picked_up') {
      const result = await api<{ order: Order; profile: Profile }>(`/orders/${o.id}/deliver`, 'POST', position.current);
      applyProfile(result.profile); setReward(result.order); changeOrder(null); setDestination(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  });
  const headOut = () => act(async () => { applyProfile(await api<Profile>('/garage/leave', 'POST')); setScreen('city'); notify('Check your supplies. Toggle online inside your phone.'); });
  const returnGarage = () => act(async () => {
    const p = await api<Profile>('/garage/enter', 'POST'); applyProfile(p); position.current = p.position;
    setPanel(null); setPhone(false); setDestination(null); setScreen('garage'); receiveDispatch(await api<Dispatch>('/dispatch'));
    notify('Home at last. Health and energy restored.');
  });
  const openPhone = (tab: PhoneTab = 'orders') => { setPanel(null); setPhoneTab(tab); setPhone(true); };
  const navigateTo = (place: Destination) => { setDestination(place); setPhone(false); setPanel(null); if (screen === 'garage') headOut(); notify(`GPS set to ${place.name}.`); };
  const openService = (place: Service) => { setServiceStop(place); setPanel('service'); };
  const useService = (action: string) => profileAction('/services/use', { service_id: serviceStop?.id, action }, 'All taken care of. Safe travels!');
  const collision = (kind: 'traffic' | 'wall') => {
    if (Date.now() - lastCollision.current < 3100 || current.current?.dead) return;
    lastCollision.current = Date.now();
    enqueue(async () => { await flush(); applyProfile(await api<Profile>('/game/collision', 'POST', { kind })); notify(kind === 'traffic' ? 'Collision! Bike condition, health and energy took a hit.' : 'Watch the buildings! Your bike and energy took a hit.'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); }).catch(e => notify(e.message));
  };
  const recover = (choice: 'pay' | 'restart') => act(async () => {
    const p = await api<Profile>('/recovery', 'POST', { choice, confirm_restart: choice === 'restart' }); applyProfile(p);
    position.current = p.position; clock.current = p.minutes; weather.current = p.weather; pending.current = { elapsed: 0, moving: 0, distance: 0 };
    changeOrder(null); setScreen('garage'); setPhone(false); setPanel(null); notify(choice === 'pay' ? 'Back at the garage. Your progress is safe; the delivery was cancelled.' : 'A fresh start. Take care of yourself out there.');
  });
  return { profile, catalog, loading, error, initialize, busy, screen, order, dispatch, phone, setPhone, phoneTab, setPhoneTab, panel, setPanel, toast, notify, reward, dismissReward: () => setReward(null), position, clock, weather, weatherAuto, pending, now, toggleOnline, equip, purchase, accept, decline, interact, headOut, returnGarage, openPhone, refreshOrder, save, destination, setDestination, navigateTo, serviceStop, openService, useService, collision, recover,
    buyFood: (item: string) => profileAction('/food/buy', { item }, 'Food added to your bag. Tap Eat when you need it.'),
    eatFood: (item: string) => profileAction('/food/eat', { item }, 'A little nourishment. Feeling better already.'),
    claimMilestone: (count: number) => profileAction(`/milestones/${count}/claim`, undefined, 'Milestone claimed! Coins and food added to your bag.'),
    carryKit: (carry: boolean) => profileAction('/gear/carry', { carry }, carry ? 'Rain kit packed.' : 'Rain kit left at home.'),
    remoteKit: () => profileAction('/gear/remote', undefined, 'Your rain kit is here. Equip it to stay dry.'),
    roadside: (action: string) => profileAction('/services/roadside', { action }, 'Roadside help arrived. You’re ready to roll again.'),
  };
}
const GameContext = createContext<ReturnType<typeof useGameState> | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) { return <GameContext.Provider value={useGameState()}>{children}</GameContext.Provider>; }
export function useGame() { const state = useContext(GameContext); if (!state) throw new Error('GameProvider is missing.'); return state; }