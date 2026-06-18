import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

interface EnhancedTestModeToggleProps {
  isEnhanced: boolean;
  onToggle: (val: boolean) => void;
}

export function EnhancedTestModeToggle({ isEnhanced, onToggle }: EnhancedTestModeToggleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {isEnhanced ? 'Arttırılmış Test Modu Açık (Kalemle İşaretle)' : 'Klasik Test Modu Açık (Şıklara Tıkla)'}
      </Text>
      <Switch
        value={isEnhanced}
        onValueChange={onToggle}
        trackColor={{ false: '#374151', true: '#8B5CF6' }}
        thumbColor={isEnhanced ? '#F3F4F6' : '#9CA3AF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginVertical: 8,
  },
  label: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
