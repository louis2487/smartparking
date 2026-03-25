import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}) {
  const tint = useThemeColor({}, 'tint');
  const bg = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');

  const colors =
    variant === 'primary'
      ? { container: tint, label: '#fff' }
      : variant === 'danger'
        ? { container: '#d23c3c', label: '#fff' }
        : { container: bg, label: text };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors.container, opacity: disabled || loading ? 0.5 : pressed ? 0.9 : 1 },
        variant === 'secondary' ? styles.secondary : undefined,
        style,
      ]}>
      {loading ? <ActivityIndicator color={colors.label} /> : <ThemedText style={{ color: colors.label }}>{title}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
  },
});

