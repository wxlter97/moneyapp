import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { errorMessage } from '@/api/errors';
import { config } from '@/config';
import { useAuthStore } from '@/store/auth';
import { Button } from './ui/Button';

// Requerido por expo-auth-session: cierra la pestaña/hoja del navegador
// abierta para el login en cuanto Google redirige de vuelta a la app.
WebBrowser.maybeCompleteAuthSession();

const { iosClientId, androidClientId, webClientId } = config.google;
const GOOGLE_CONFIGURED = Boolean(iosClientId || androidClientId || webClientId);

interface GoogleSignInButtonProps {
  /** 'login' (default): crea cuenta o entra a una ya vinculada, desde
   * Ingresar/Crear cuenta. 'link': vincula Google a la cuenta YA
   * autenticada, desde Herramientas → Cuenta -- nunca crea una cuenta. */
  mode?: 'login' | 'link';
  onLinked?: () => void;
}

/**
 * "Continuar con Google" (Capa 4). Sin client IDs configurados (variables
 * `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`) el botón ni se muestra -- no tiene
 * sentido ofrecer un login que no puede completar el flujo OAuth real.
 */
export function GoogleSignInButton({ mode = 'login', onLinked }: GoogleSignInButtonProps) {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const linkGoogleAccount = useAuthStore((s) => s.linkGoogleAccount);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) return;

    let cancelled = false;
    setSubmitting(true);
    setError(null);
    const action = mode === 'link' ? linkGoogleAccount(idToken) : signInWithGoogle(idToken);
    action
      .then(() => {
        if (!cancelled && mode === 'link') onLinked?.();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            errorMessage(
              err,
              mode === 'link' ? 'No se pudo vincular con Google.' : 'No se pudo continuar con Google.',
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  if (!GOOGLE_CONFIGURED) return null;

  return (
    <View className="gap-2">
      <Button
        label={mode === 'link' ? 'Vincular cuenta de Google' : 'Continuar con Google'}
        variant="ghost"
        loading={submitting}
        disabled={!request}
        onPress={() => {
          setError(null);
          void promptAsync();
        }}
      />
      {error ? <Text className="text-expense text-center text-xs">{error}</Text> : null}
    </View>
  );
}
