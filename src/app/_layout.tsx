import '../../global.css';

import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colorScheme, useColorScheme } from 'nativewind';

import { queryClient } from '@/lib/queryClient';
import { darkColors, lightColors } from '@/theme';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { SplashOverlay } from '@/components/SplashOverlay';

// Mantiene visible el splash nativo (imagen estática de app.json) hasta que
// lo ocultamos a mano, apenas el overlay animado de abajo ya está pintado.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false });

function navThemeFor(scheme: 'light' | 'dark') {
  const c = scheme === 'light' ? lightColors : darkColors;
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };
}

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const authStatus = useAuthStore((s) => s.status);
  const pref = useThemeStore((s) => s.pref);
  const { colorScheme: active } = useColorScheme();
  const scheme = active === 'light' ? 'light' : 'dark';

  const [showSplash, setShowSplash] = useState(true);
  const dismissSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Aplica la preferencia persistida (claro / oscuro / sistema).
  useEffect(() => {
    colorScheme.set(pref);
  }, [pref]);

  useEffect(() => {
    // El overlay animado (mismo color de fondo que el splash nativo) ya está
    // pintado en este punto, así que ocultar el splash nativo es invisible.
    SplashScreen.hide();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={navThemeFor(scheme)}>
            <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: {
                  backgroundColor: scheme === 'light' ? lightColors.bg : darkColors.bg,
                },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="register" />
              <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      {showSplash ? (
        <SplashOverlay ready={authStatus !== 'loading'} onFinished={dismissSplash} />
      ) : null}
    </GestureHandlerRootView>
  );
}
