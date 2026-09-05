import '../../global.css';

import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colorScheme } from 'nativewind';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';

import { queryClient } from '@/lib/queryClient';
import { applyGlobalFont } from '@/lib/globalFont';
import { darkColors, lightColors } from '@/theme';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { SplashOverlay } from '@/components/SplashOverlay';
import { SnackbarHost } from '@/components/ui/Snackbar';

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
  // No delegamos "sistema" a `colorScheme.set('system')`: en la versión web de
  // nativewind eso sólo resetea el observable interno pero además fuerza la
  // clase `.dark` a "quitada" sin importar el sistema real (ver
  // react-native-css-interop/runtime/web/color-scheme.js) — con el SO en
  // oscuro, la variante "sistema" se quedaba mostrando la paleta clara en
  // todo lo que se pinta con clases de Tailwind (o sea, casi toda la UI).
  // Resolvemos nosotros mismos a un valor concreto ('light' | 'dark') a
  // partir del `Appearance` real del sistema y se lo pasamos siempre así:
  // más simple y sin ese caso especial roto, en ambas plataformas.
  // Ojo: NO usar el hook `useColorScheme` de 'react-native' acá — en este
  // bundle web no re-renderiza al cambiar el esquema del SO en caliente
  // (`Appearance.addChangeListener` sí lo hace, y es lo mismo que usa por
  // dentro; posible desajuste de instancias entre bundlers). Suscripción
  // manual, misma API, funciona en las tres plataformas.
  const [systemScheme, setSystemScheme] = useState(() => Appearance.getColorScheme());
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme: next }) => setSystemScheme(next));
    return () => sub.remove();
  }, []);
  const scheme: 'light' | 'dark' =
    pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [showSplash, setShowSplash] = useState(true);
  const dismissSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Aplica el esquema ya resuelto (nunca el literal 'system', ver arriba).
  useEffect(() => {
    colorScheme.set(scheme);
  }, [scheme]);

  useEffect(() => {
    // Recién cuando la fuente ya está registrada montamos el árbol real
    // (más abajo): así ningún `<Text>` llega a pintarse una vez con la
    // fuente de sistema y se queda así (defaultProps no re-renderiza solo).
    if (fontsLoaded) applyGlobalFont();
  }, [fontsLoaded]);

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
            {fontsLoaded ? (
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
            ) : null}
            <SnackbarHost />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      {showSplash ? (
        <SplashOverlay
          ready={fontsLoaded && authStatus !== 'loading'}
          onFinished={dismissSplash}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}
