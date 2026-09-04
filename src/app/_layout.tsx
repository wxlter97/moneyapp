import '../../global.css';

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme, useColorScheme } from 'nativewind';

import { queryClient } from '@/lib/queryClient';
import { darkColors, lightColors } from '@/theme';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';

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
  const pref = useThemeStore((s) => s.pref);
  const { colorScheme: active } = useColorScheme();
  const scheme = active === 'light' ? 'light' : 'dark';

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Aplica la preferencia persistida (claro / oscuro / sistema).
  useEffect(() => {
    colorScheme.set(pref);
  }, [pref]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={navThemeFor(scheme)}>
            <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: scheme === 'light' ? lightColors.bg : darkColors.bg,
                },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(app)" />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
