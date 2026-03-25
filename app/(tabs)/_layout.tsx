import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ title: '기록' }} />
      <Stack.Screen name="admin" options={{ title: '관리자 설정' }} />
      <Stack.Screen name="adminpopup" options={{ title: '팝업창 설정' }} />
      <Stack.Screen name="count" options={{ title: '현황 집계' }} />
      <Stack.Screen name="countdetail" options={{ title: '집계 상세' }} />
      <Stack.Screen name="userlist" options={{ title: '회원 목록' }} />
      <Stack.Screen name="dau_grape" options={{ title: 'DAU 그래프' }} />
      <Stack.Screen name="total_count_grape" options={{ title: '총 회원 그래프' }} />
      <Stack.Screen name="daily_count" options={{ title: '일일 가입자 그래프' }} />
    </Stack>
  );
}
