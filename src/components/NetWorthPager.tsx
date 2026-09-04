import { useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { NetWorthBreakdown } from '@/api/types';
import { PURPOSE_LABEL, WALLET_PURPOSES } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { MAX_CONTENT_WIDTH } from '@/theme';
import { toNumber } from '@/lib/money';

interface Page {
  key: string;
  title: string;
  value: number;
  signed: boolean;
}

/**
 * Tarjeta de valor neto. El recuadro morado NO se mueve: sólo el contenido
 * (cifra + etiqueta) se desliza dentro de un ScrollView horizontal paginado.
 */
export function NetWorthPager({
  data,
  currency,
}: {
  data: NetWorthBreakdown;
  currency: string;
}) {
  const { width } = useWindowDimensions();
  const innerWidth = Math.min(width, MAX_CONTENT_WIDTH) - 32; // menos el px-4 de la pantalla
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const pages = useMemo<Page[]>(() => {
    const list: Page[] = [
      { key: 'net', title: 'Valor neto total', value: toNumber(data.net), signed: true },
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
      <View className="overflow-hidden rounded-2xl bg-primary">
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
              className="items-center justify-center py-10"
            >
              <Money
                value={item.value}
                currency={currency}
                signed={item.signed}
                className="text-primary-fg text-4xl font-bold"
              />
              <Text className="text-primary-fg/80 mt-1 text-sm">{item.title}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {pages.length > 1 ? (
        <View className="mt-2 flex-row justify-center gap-1.5">
          {pages.map((p, i) => (
            <View
              key={p.key}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
