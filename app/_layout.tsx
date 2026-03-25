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
