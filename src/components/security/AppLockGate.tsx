import { useEffect, useRef, useState } from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';

import { LockScreen } from './LockScreen';
import { isBiometricAvailable } from '@/lib/security/biometrics';
import { useSecurityStore } from '@/store/security';

/**
 * Envuelve el contenido autenticado y lo tapa con `LockScreen` cuando hace
 * falta. El padre (`(app)/_layout.tsx`) ya garantiza que el store de
 * seguridad esté hidratado antes de montar esto, así el estado inicial de
 * `locked` puede leerse directo del store sin arriesgar un flash de
 * contenido sin bloquear mientras carga.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const enabled = useSecurityStore((s) => s.enabled);
  const [locked, setLocked] = useState(enabled);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasActive = appState.current === 'active';
      const stillEnabled = useSecurityStore.getState().enabled;
      if (wasActive && next !== 'active' && stillEnabled) {
        setLocked(true);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked ? (
        <LockScreen biometricAvailable={biometricAvailable} onUnlock={() => setLocked(false)} />
      ) : null}
    </View>
  );
}
