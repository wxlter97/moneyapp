import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, ...rest }, ref) => (
    <View className="gap-1.5">
      <Text className="text-text-muted text-sm">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor="#6B7480"
        className={`h-12 rounded-xl border bg-surface px-3 text-text ${
          error ? 'border-expense' : 'border-border'
        }`}
        {...rest}
      />
      {error ? <Text className="text-expense text-xs">{error}</Text> : null}
    </View>
  ),
);

TextField.displayName = 'TextField';
