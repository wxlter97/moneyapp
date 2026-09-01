import { Text, View } from 'react-native';

import type { Account } from '@/api/types';
import { Money } from '@/components/ui/Money';

const TYPE_LABEL: Record<Account['type'], string> = {
  checking: 'Corriente',
  savings: 'Ahorro',
  credit: 'Tarjeta',
  cash: 'Efectivo',
};

export function AccountRow({ account }: { account: Account }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text className="text-text text-base" numberOfLines={1}>
          {account.name}
          {account.card_last4 ? (
            <Text className="text-text-muted"> ···· {account.card_last4}</Text>
          ) : null}
        </Text>
        <Text className="text-text-muted text-xs">
          {TYPE_LABEL[account.type]}
          {account.visibility === 'private' ? ' · privada' : ''}
        </Text>
      </View>
      <Money
        value={account.current_balance}
        currency={account.currency}
        tone={account.type === 'credit' ? 'expense' : 'default'}
        className="text-base font-semibold"
      />
    </View>
  );
}
