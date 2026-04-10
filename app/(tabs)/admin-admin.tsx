import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';

export default function AdminOnlyScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <Button title="현황 집계" variant="secondary" onPress={() => router.push('/count-admin' as any)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    gap: 12,
  },
});

