import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { captureException } from '@/lib/sentry';
import { fonts } from '@/theme/typography';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad de último recurso: sin esto, un error de render en
 * cualquier pantalla dejaba la app en blanco (o con la pantalla roja de
 * dev) sin ninguna forma de recuperarse salvo forzar el cierre. Reporta a
 * Sentry (no-op sin `EXPO_PUBLIC_SENTRY_DSN`, ver `lib/sentry.ts`) y ofrece
 * "Reintentar" -- vuelve a montar el árbol entero, que alcanza para la
 * mayoría de los casos (un error puntual de una pantalla, no del estado
 * global). Sólo clases de React pueden implementar
 * `getDerivedStateFromError`/`componentDidCatch`, no hay equivalente con
 * hooks todavía.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    captureException(error);
  }

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
          <Text
            className="text-text text-center text-base"
            style={{ fontFamily: fonts.semibold }}
          >
            Algo salió mal
          </Text>
          <Text className="text-text-muted text-center text-sm leading-5">
            La app tuvo un error inesperado. Podés intentar de nuevo -- si sigue pasando,
            escribinos a me@wxlter.dev.
          </Text>
          <Button label="Reintentar" onPress={() => this.setState({ error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}
