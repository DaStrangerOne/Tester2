import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const SEVERITY_CONFIG = {
  low: { color: '#00ff41', label: 'LOW' },
  medium: { color: '#ffaa00', label: 'MED' },
  high: { color: '#ff6600', label: 'HIGH' },
  critical: { color: '#ff2222', label: 'CRIT' },
};

interface Props {
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function SeverityBadge({ severity }: Props) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <View style={[styles.badge, { borderColor: config.color, backgroundColor: config.color + '18' }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.8,
  },
});
