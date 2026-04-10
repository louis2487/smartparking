import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ParkingProvider } from '@/parking-provider';
import ForceUpdateModal from '@/components/ui/ForceUpdateModal';
import { ForceUpdateProvider, useForceUpdate } from '@/force-update-provider';

function RootForceUpdateModal() {
  const { state } = useForceUpdate();
  return (
    <ForceUpdateModal
      visible={state.visible}
      currentVersion={state.currentVersion}
      latestVersion={state.latestVersion}
      storeUrl={state.storeUrl}
      message={state.message}
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ParkingProvider>
      <ForceUpdateProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="iching"
              options={{
                title: '주역 점',
                headerShadowVisible: false,
                headerStyle: { elevation: 0, shadowOpacity: 0 } as any,
              }}
            />
            <Stack.Screen name="jhr/jhr_list" options={{ title: '클래스 목록' }} />
            <Stack.Screen name="jhr/jhr_role" options={{ title: '조홍래 지원자 백엔드 과제' }} />
            <Stack.Screen name="jhr/[id]" options={{ title: '클래스 상세' }} />
            <Stack.Screen name="jhr/jhr_write" options={{ title: '강의 작성' }} />
            <Stack.Screen name="jhr/jhr_my_enrollments" options={{ title: '내 수강 신청 목록' }} />
            <Stack.Screen name="jhr/jhr_class_students" options={{ title: '강의별 수강생 목록' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: '위치 저장' }} />
            <Stack.Screen name="popup" options={{ presentation: 'modal', title: '공지' }} />
          </Stack>
          <RootForceUpdateModal />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ForceUpdateProvider>
    </ParkingProvider>
  );
}
