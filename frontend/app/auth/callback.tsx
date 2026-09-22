import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/game/supabase';
import { Label } from '@/src/components/ui';
import { useTheme } from '@/src/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors: c } = useTheme();
  const [status, setStatus] = useState('Verifying rider passport...');

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          if (active) setStatus('Authentication failed. Returning to game...');
        } else if (session) {
          if (active) setStatus('Authenticated! Loading your garage...');
        }
      } catch (err) {
        console.warn('[Auth Callback Error]', err);
      } finally {
        setTimeout(() => {
          if (active) {
            router.replace('/');
          }
        }, 400);
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface, gap: 14 }}>
      <ActivityIndicator size="large" color={c.brand} />
      <Label display style={{ fontSize: 16 }}>{status}</Label>
    </View>
  );
}
