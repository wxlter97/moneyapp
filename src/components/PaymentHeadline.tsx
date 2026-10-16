import { Text, View } from 'react-native';

import type { PaymentGuidance } from '@/api/types';
import { Money } from '@/components/ui/Money';
import { paymentHeadline, segmentsText, type PaymentTone, type Segment } from '@/lib/cardPayment';
import { useColors } from '@/theme';
import { fonts } from '@/theme/typography';

function Segments({
  segments,
  currency,
  tone,
  className,
  style,
}: {
  segments: Segment[];
  currency: string;
  tone: PaymentTone;
  className: string;
  style?: object;
}) {
  return (
    <Text className={className} style={style}>
      {segments.map((s, i) =>
        typeof s === 'string' ? (
          s
        ) : (
          <Money key={i} value={s.money} currency={currency} tone={tone} className={className} style={style} />
        ),
      )}
    </Text>
  );
}

/**
 * «¿Cuánto pago hoy?» de una tarjeta, en una frase (ver
 * `lib/cardPayment.paymentHeadline`): «Paga $200 antes del 20 oct», «Vencido:
 * paga $200 hoy», «Listo ✓ hasta el corte del 3 nov»…
 */
export function PaymentHeadline({ guidance, currency }: { guidance: PaymentGuidance; currency: string }) {
  const colors = useColors();
  const h = paymentHeadline(guidance);
  const color =
    h.tone === 'expense'
      ? colors.expense
      : h.tone === 'income'
        ? colors.income
        : h.tone === 'warning'
          ? colors.text
          : colors.textMuted;
  return (
    <View
      className="gap-1"
      accessible
      accessibilityLabel={[segmentsText(h.title, currency), h.sub ? segmentsText(h.sub, currency) : '']
        .filter(Boolean)
        .join('. ')}
    >
      <Segments
        segments={h.title}
        currency={currency}
        tone={h.tone === 'warning' ? 'expense' : h.tone}
        className="text-xl"
        style={{ fontFamily: fonts.bold, color }}
      />
      {h.sub ? (
        <Segments segments={h.sub} currency={currency} tone="muted" className="text-text-muted text-xs" />
      ) : null}
    </View>
  );
}
