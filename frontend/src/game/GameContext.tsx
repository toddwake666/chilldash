import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, openSave, Order, Point, Profile, Weather } from './api';
import { GARAGE } from './world';
import * as Haptics from 'expo-haptics';

function useGameState() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<'garage' | 'city'>('garage');
  const [order, setOrder] = useState<Order | null>(null);
  const [phone, setPhone] = useState(false);
  const [phoneTab, setPhoneTab] = useState<'orders' | 'gps' | 'wallet'>('orders');
  const [panel, setPanel] = useState<'help' | 'world' | 'pause' | 'gear' | null>(null);
  const [toast, setToast] = useState('');
  const [reward, setReward] = useState<Order | null>(null);
  const position = useRef<Point>({ ...GARAGE });
  const clock = useRef(540);
  const weather = useRef<Weather>('sunny');
  const weatherAuto = useRef(true);
  const requestLock = useRef(false);

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 4200); return () => clearTimeout(id); } }, [toast]);
  const refreshOrder = useCallback(async () => {
    const items = await api<Order[]>('/orders');
    setOrder(items[0] || null);
  }, []);
  const initialize = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = await openSave();
      position.current = p.position; clock.current = p.minutes; weather.current = p.weather;
      setProfile(p);
      await refreshOrder();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect to your garage.'); }
    finally { setLoading(false); }
  }, [refreshOrder]);
  useEffect(() => { initialize(); }, [initialize]);

  const save = useCallback(async () => {
    if (!profile) return;
    await api('/profile/progress', 'PUT', { position: position.current, minutes: clock.current, weather: weather.current });
  }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const id = setInterval(() => { save().catch(() => notify('Signal is weak. Keep riding; we’ll retry your save.')); }, 12000);
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') save().catch(() => {}); });
    return () => { clearInterval(id); subscription.remove(); };
  }, [profile, save, notify]);

  const act = async (fn: () => Promise<void>) => {
    if (requestLock.current) return;
    requestLock.current = true; setBusy(true);
    try { await fn(); } catch (e) { notify(e instanceof Error ? e.message : 'That didn’t go through. Try again.'); }
    finally { requestLock.current = false; setBusy(false); }
  };
  const toggleOnline = () => act(async () => {
    const p = await api<Profile>('/profile/online', 'PUT', { online: !profile?.online });
    setProfile(p); await refreshOrder();
    notify(p.online ? 'You’re online! A fresh delivery is on your phone.' : 'You’re offline. Enjoy a little free ride.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  });
  const equip = (bike: string, gear: string) => act(async () => {
    setProfile(await api<Profile>('/profile/equipment', 'PUT', { bike, gear }));
  });
  const purchase = (item: string) => act(async () => {
    const p = await api<Profile>('/profile/purchase', 'POST', { item });
    setProfile(p); notify('Unlocked! Your next ride just got an upgrade.');
  });
  const accept = () => act(async () => {
    if (!order) return;
    setOrder(await api<Order>(`/orders/${order.id}/accept`, 'POST'));
    setPhone(false); if (screen === 'garage') setScreen('city');
    notify('Order accepted. Follow the yellow route to pick up!');
  });
  const decline = () => act(async () => {
    if (!order) return;
    await api(`/orders/${order.id}/decline`, 'POST');
    setOrder(null); await refreshOrder(); notify('No worries. A new opportunity awaits.');
  });
  const interact = () => act(async () => {
    if (!order) return;
    if (order.status === 'accepted') {
      setOrder(await api<Order>(`/orders/${order.id}/pickup`, 'POST', position.current));
      notify('All packed! Follow your GPS to the customer.');
    } else if (order.status === 'picked_up') {
      const result = await api<{ order: Order; profile: Profile }>(`/orders/${order.id}/deliver`, 'POST', position.current);
      setProfile(result.profile); setReward(result.order); setOrder(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await save();
    }
  });
  const headOut = () => act(async () => {
    await save(); setScreen('city');
    notify('Hold the arrows to ride. Go online when you’re ready.');
  });
  const returnGarage = () => act(async () => {
    const p = await api<Profile>('/profile/online', 'PUT', { online: false });
    await save();
    setProfile({ ...p, position: position.current, minutes: clock.current, weather: weather.current });
    if (order?.status === 'offered') setOrder(null);
    setPanel(null); setScreen('garage');
  });
  const openPhone = (tab: 'orders' | 'gps' | 'wallet' = 'orders') => { setPhoneTab(tab); setPhone(true); };
  const dismissReward = () => { setReward(null); refreshOrder().catch(() => notify('Couldn’t check for orders. Open your phone to retry.')); };
  return { profile, loading, error, initialize, busy, screen, order, phone, setPhone, phoneTab, setPhoneTab, panel, setPanel, toast, notify, reward, dismissReward, position, clock, weather, weatherAuto, toggleOnline, equip, purchase, accept, decline, interact, headOut, returnGarage, openPhone, refreshOrder, save };
}

const GameContext = createContext<ReturnType<typeof useGameState> | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  return <GameContext.Provider value={useGameState()}>{children}</GameContext.Provider>;
}
export function useGame() {
  const state = useContext(GameContext);
  if (!state) throw new Error('GameProvider is missing.');
  return state;
}