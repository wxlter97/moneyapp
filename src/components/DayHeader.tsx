import { Text, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { formatDayHeader, isFutureDay } from '@/lib/date';
import { formatSigned } from '@/lib/money';
import { fonts } from '@/theme/typography';

interface DayHeaderProps {
  date: ISODate;
  /** Neto del día, si corresponde mostrarlo (listas con montos mezclados
   * ingreso/gasto). Se omite en listas de una sola cartera, donde ya hay
   * un saldo corriente por fila. */
  net?: number;
  currency?: string;
}

/**
 * Encabezado de un grupo de movimientos por día -- común a `ListaTab` y al
 * detalle de una cartera. Marca "· próximo" cuando la fecha es posterior a
 * hoy: una transacción real con fecha futura (alguien la cargó a mano de
 * antemano) se veía igual que cualquier día del historial, sin nada que
 * avise que todavía no pasó (hallazgo de la auditoría de producto, §11 --
 * "1 dic" arriba de "ayer" sin separación). El amarillo de identidad, no
 * semántico: "próximo" no es ni bueno ni malo, es un estado.
 */
export function DayHeader({ date, net, currency = 'USD' }: DayHeaderProps) {
  const future = isFutureDay(date);

  return (
    <View className="flex-row items-baseline justify-between gap-2 pb-1 pt-3">
      <View className="flex-row items-baseline gap-1.5">
        <Text className="text-text-muted text-xs font-semibold uppercase tracking-wide">
          {formatDayHeader(date)}
        </Text>
        {future ? (
          <Text className="text-primary text-[10px] font-bold uppercase tracking-wide">próximo</Text>
        ) : null}
      </View>
      {net !== undefined ? (
        <Text
          className={net >= 0 ? 'text-income text-xs' : 'text-expense text-xs'}
          style={{ fontFamily: fonts.semibold }}
        >
          {formatSigned(net, currency)}
        </Text>
      ) : null}
    </View>
  );
}
