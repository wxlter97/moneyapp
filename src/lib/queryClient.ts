import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // La caché persistida (ver `queryPersister.ts`) restaura queries
      // "inactivas" al arrancar la app -- si `gcTime` fuera el default (5 min),
      // React Query las tira antes de que el usuario llegue a verlas. 24h para
      // que lo último visto sobreviva un reinicio completo de la app.
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        // No reintentar errores de cliente (4xx): 401 lo maneja el interceptor.
        if (axios.isAxiosError(error) && error.response) {
          const s = error.response.status;
          if (s >= 400 && s < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
