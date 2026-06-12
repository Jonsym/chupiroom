import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

/** Navigation theme so native screen backgrounds match our dark gradient. */
const navTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.white,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

/**
 * Gate the app behind auth — but only when Supabase is actually configured.
 * Without credentials the app stays fully usable offline (no forced redirect).
 */
function useProtectedRoute() {
  const { session, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/home');
    }
  }, [session, loading, configured, segments, router]);
}

function RootNavigator() {
  useProtectedRoute();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth/welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="create-game" />
      <Stack.Screen name="players" />
      <Stack.Screen name="mode" />
      <Stack.Screen name="game" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="create-room" />
      <Stack.Screen name="rooms" />
      <Stack.Screen name="room/[code]" />
      <Stack.Screen name="room/[code]/play" />
    </Stack>
  );
}

function RootShell() {
  return (
    <>
      <RootNavigator />
      {/* Floating dock — self-hides on auth/game/summary/setup-flow routes */}
      <BottomNav />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <RootShell />
            <StatusBar style="light" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
