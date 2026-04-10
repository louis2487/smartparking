import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import JhrIdPostCard from './jhr_idpostcard';

export default function JhrClassDetailRouteScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText>유효하지 않은 클래스 ID입니다.</ThemedText>
      </ThemedView>
    );
  }

  return <JhrIdPostCard classId={id} />;
}
