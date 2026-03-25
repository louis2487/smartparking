import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { getMe, login } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';
const AUTH_FLOOR_KEY = 'smartparking:auth:floor';

export default function Index() {
  const router = useRouter();
  const didBootstrap = useRef(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    let mounted = true;
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
        const u = pairs[0]?.[1] ?? null;
        const p = pairs[1]?.[1] ?? null;

        if (!u || !p) {
          router.replace('/(auth)/login');
          return;
        }

        await login(u, p);
        const me = await getMe(u, p);
        if (me.floor) await AsyncStorage.setItem(AUTH_FLOOR_KEY, String(me.floor));
        else await AsyncStorage.removeItem(AUTH_FLOOR_KEY);
        router.replace('/(tabs)');
      } catch {
        await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_PASS_KEY, AUTH_FLOOR_KEY]).catch(() => {});
        router.replace('/(auth)/login');
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (booting) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // replace로 화면이 바뀌므로, 여기까지 도달하면 잠깐의 공백만 보여줍니다.
  return null;
}

