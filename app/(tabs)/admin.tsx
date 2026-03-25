import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';

export default function AdminScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <Button title="팝업창 설정" variant="secondary" onPress={() => router.push('/adminpopup' as any)} />
      <Button title="현황 집계" variant="secondary" onPress={() => router.push('/count' as any)} />
      <Button title="회원 목록" variant="secondary" onPress={() => router.push('/userlist' as any)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    gap: 12,
  },
  header: {
    gap: 6,
  },
  sub: {
    opacity: 0.75,
  },
  placeholder: {
    opacity: 0.8,
  },
});

