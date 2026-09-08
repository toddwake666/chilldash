import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from '@/src/game/GameContext';

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true)

export default function RootLayout() {
  // Prewarm icon assets before the first screen, including Expo Go on Android.
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font, ...MaterialCommunityIcons.font,
    Fredoka: require('../assets/fonts/Fredoka.ttf'),
    Nunito: require('../assets/fonts/Nunito.ttf'),
  });
  if (!fontsLoaded && !fontError) return null;
  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <QueryClientProvider client={queryClient}>
            <GameProvider><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></GameProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
