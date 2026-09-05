/**
 * PIN de bloqueo: se guarda hasheado (SHA-256), nunca en texto plano, en
 * SecureStore (Keychain/Keystore) en nativo o localStorage en web — mismo
 * patrón multiplataforma que `api/tokenStorage`, pero sin duplicarlo ahí
 * porque son cosas distintas (sesión vs. bloqueo de pantalla).
 */
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export const PIN_LENGTH = 4;

const HASH_KEY = 'budget.security.pin_hash';
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

async function hash(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export const pinStore = {
  async hasPin(): Promise<boolean> {
    return (await getItem(HASH_KEY)) != null;
  },

  async setPin(pin: string): Promise<void> {
    await setItem(HASH_KEY, await hash(pin));
  },

  async verifyPin(pin: string): Promise<boolean> {
    const stored = await getItem(HASH_KEY);
    if (!stored) return false;
    return stored === (await hash(pin));
  },

  async clearPin(): Promise<void> {
    await setItem(HASH_KEY, null);
  },
};
