import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { NetWorthBreakdown } from '@/api/types';
import { PURPOSE_LABEL, WALLET_PURPOSES } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { Icon } from '@/components/ui/Icon';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';
import { toNumber } from '@/lib/money';

interface Page {
  key: string;
  title: string;
  value: number;
  signed: boolean;
}

/**
 * Tarjeta de valor neto. La tarjeta (superficie neutra, sin relleno de
 * color) NO se mueve: sólo el contenido (cifra + etiqueta) se desliza
 * dentro de un ScrollView horizontal paginado. El acento queda reducido al
 * ícono y a los puntos de paginación — la cifra en sí, al ser lo más
 * grande de la pantalla, se lee en el color de texto normal para no
 * competir con el resto del look monocromático.
 */
export function NetWorthPager({
  data,
  currency,
  maxWidth = MAX_CONTENT_WIDTH,
}: {
  data: NetWorthBreakdown;
  currency: string;
  /** Ancho máximo de la columna que lo contiene -- por defecto el fijo de
   * casi toda la app, pero una pantalla que se ensancha en desktop (ver
   * `wallets.tsx`) tiene que pasar el mismo ancho acá, o esta card queda
   * más angosta que el resto del contenido debajo. */
  maxWidth?: number;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const innerWidth = Math.min(width, maxWidth) - 32; // menos el px-4 de la pantalla
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const pages = useMemo<Page[]>(() => {
    // `by_purpose` ya suma TODAS las carteras de cada tipo, sin mirar
    // `counts_toward_net_worth` (ver docstring de `net_worth_breakdown` en
    // el backend) -- sumar los 4 tipos da el bruto real, carteras excluidas
    // del neto incluidas, a diferencia de `data.net` que sí las descarta.
    const gross = WALLET_PURPOSES.reduce((sum, p) => sum + toNumber(data.by_purpose[p]), 0);
    const list: Page[] = [
      { key: 'net', title: 'Valor neto total', value: toNumber(data.net), signed: true },
      { key: 'gross', title: 'Todas las carteras (bruto)', value: gross, signed: true },
    ];
    for (const p of WALLET_PURPOSES) {
      const v = toNumber(data.by_purpose[p]);
      if (v !== 0) {
        list.push({
          key: p,
          title: `Carteras de ${PURPOSE_LABEL[p].toLowerCase()}`,
          value: v,
          signed: true,
        });
      }
    }
    return list;
  }, [data]);

  return (
    <View>
      <View
        className="overflow-hidden rounded-3xl border border-border bg-surface"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          elevation: 1,
        }}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / innerWidth);
            setIndex((prev) => (prev === next ? prev : next));
          }}
        >
          {pages.map((item) => (
            <View
              key={item.key}
              style={{ width: innerWidth }}
              className="items-center justify-center gap-2 py-9"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-2">
                <Icon name="trending" size={16} color={colors.primary} />
              </View>
              <Money
                value={item.value}
                currency={currency}
                signed={item.signed}
                hero
                className="text-text text-[40px] leading-[44px]"
              />
              <Text className="text-text-muted text-sm">{item.title}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {pages.length > 1 ? (
        <View className="mt-2 flex-row justify-center gap-1.5">
          {/* En touch (mobile) el swipe ya cambia de página -- el punto es
              solo indicador. En web (mouse/teclado, sin swipe) es la única
              forma de saltar a una página sin arrastrar, así que acá sí
              necesita ser interactivo (hallazgo de la auditoría de
              producto: "no responde a click en los dots ni a drag"). */}
          {pages.map((p, i) => (
            <Pressable
              key={p.key}
              onPress={() => {
                setIndex(i);
                scroller.current?.scrollTo({ x: i * innerWidth, animated: true });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${p.title}`}
              accessibilityState={{ selected: i === index }}
              hitSlop={8}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
