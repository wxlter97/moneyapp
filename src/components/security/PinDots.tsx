import { View } from 'react-native';

/** Los puntitos "●●○○" que muestran cuántos dígitos del PIN ya se cargaron. */
export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <View className="flex-row gap-4">
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          className={`h-3.5 w-3.5 rounded-full ${i < filled ? 'bg-text' : 'bg-surface-2'}`}
        />
      ))}
    </View>
  );
}
