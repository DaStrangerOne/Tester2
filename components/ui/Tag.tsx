import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface TagProps {
  label: string;
  color?: string;
}

export function Tag({ label, color = Colors.accent }: TagProps) {
  return (
    <View style={[styles.tag, { borderColor: color + '44', backgroundColor: color + '11' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    letterSpacing: 0.3,
  },
});
