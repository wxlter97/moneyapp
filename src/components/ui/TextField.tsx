import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View className="gap-1.5">
        <Text className="text-text-muted text-sm">{label}</Text>
        <TextInput
          ref={ref}
          placeholderTextColor="#6B7480"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`h-12 rounded-xl border bg-surface px-3 text-text ${
            error ? 'border-expense' : focused ? 'border-primary' : 'border-border'
          }`}
          {...rest}
        />
        {error ? <Text className="text-expense text-xs">{error}</Text> : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';
