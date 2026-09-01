/**
 * Almacenamiento de los tokens JWT, multiplataforma.
 *
 * - Nativo (iOS/Android): expo-secure-store (Keychain / Keystore).
 * - Web: localStorage. No es "secure" pero es lo estándar para una SPA;
 *   el backend rota el refresh y lo pone en blacklist, así que el blast
 *   radius de un token filtrado es acotado.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'budget.jwt.access';
const REFRESH_KEY = 'budget.jwt.refresh';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string | null): Promise<void> {
  if (isWeb) {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }
  if (value == null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export const tokenStorage = {
  async get(): Promise<TokenPair | null> {
    const [access, refresh] = await Promise.all([
      getItem(ACCESS_KEY),
      getItem(REFRESH_KEY),
    ]);
    if (!access || !refresh) return null;
    return { access, refresh };
  },

  async save(tokens: TokenPair): Promise<void> {
    await Promise.all([
      setItem(ACCESS_KEY, tokens.access),
      setItem(REFRESH_KEY, tokens.refresh),
    ]);
  },

  /** Actualiza solo el access (tras un refresh sin rotación de refresh). */
  async saveAccess(access: string): Promise<void> {
    await setItem(ACCESS_KEY, access);
  },

  async clear(): Promise<void> {
    await Promise.all([setItem(ACCESS_KEY, null), setItem(REFRESH_KEY, null)]);
  },
};
