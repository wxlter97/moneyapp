import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const base = 'h-12 rounded-xl items-center justify-center px-4 flex-row';
  const look =
    variant === 'primary'
      ? 'bg-primary active:opacity-80'
      : 'bg-transparent border border-border active:opacity-70';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${base} ${look} ${isDisabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#F2F4F7'} />
      ) : (
        <Text
          className={
            variant === 'primary'
              ? 'text-primary-fg font-semibold text-base'
              : 'text-text font-semibold text-base'
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
