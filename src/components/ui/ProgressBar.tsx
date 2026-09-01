import { View } from 'react-native';

interface ProgressBarProps {
  /** 0..1 (se recorta). */
  progress: number;
  /** Color de la barra cuando NO hay sobregiro. */
  tone?: 'primary' | 'income';
  /** Si el gasto supera el presupuesto, se pinta en rojo. */
  over?: boolean;
}

export function ProgressBar({ progress, tone = 'primary', over = false }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const fill = over ? 'bg-expense' : tone === 'income' ? 'bg-income' : 'bg-primary';

  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <View className={`h-full rounded-full ${fill}`} style={{ width: `${pct * 100}%` }} />
    </View>
  );
}
