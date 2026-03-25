import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { getParkingAdminCountDetail, type ParkingCountRow } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function ParkingCountDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ countDate?: string }>();
  const countDate = useMemo(() => {
    const raw = params.countDate;
    return typeof raw === 'string' ? raw : '';
  }, [params.countDate]);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ParkingCountRow | null>(null);

  const load = useCallback(async () => {
    if (!countDate) return;
    setLoading(true);
    try {
      const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
      const username = pairs[0]?.[1] ?? '';
      const password = pairs[1]?.[1] ?? '';
      if (!username || !password) {
        Alert.alert('로그인 필요', '다시 로그인 후 이용해주세요.');
        return;
      }
      const row = await getParkingAdminCountDetail(username, password, countDate);
      setDetail(row);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '상세 집계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [countDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">집계 상세</ThemedText>
        <ThemedText style={styles.sub}>{countDate || '-'}</ThemedText>
        <Button title={loading ? '불러오는 중...' : '새로고침'} onPress={load} disabled={loading || !countDate} />

        <View style={styles.card}>
          <Pressable onPress={() => router.push('/dau_grape' as any)} style={({ pressed }) => [styles.graphBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <ThemedText style={styles.graphBtnText}>그래프 보기</ThemedText>
          </Pressable>
          <ThemedText style={styles.label}>dau (오늘 활성사용자 수)</ThemedText>
          <ThemedText type="subtitle">{detail?.dau ?? 0}</ThemedText>
        </View>
        <View style={styles.card}>
          <Pressable
            onPress={() => router.push('/total_count_grape' as any)}
            style={({ pressed }) => [styles.graphBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <ThemedText style={styles.graphBtnText}>그래프 보기</ThemedText>
          </Pressable>
          <ThemedText style={styles.label}>total_count (총 회원 수)</ThemedText>
          <ThemedText type="subtitle">{detail?.total_count ?? 0}</ThemedText>
        </View>
        <View style={styles.card}>
          <Pressable onPress={() => router.push('/daily_count' as any)} style={({ pressed }) => [styles.graphBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <ThemedText style={styles.graphBtnText}>그래프 보기</ThemedText>
          </Pressable>
          <ThemedText style={styles.label}>daily_count (오늘 가입자 수)</ThemedText>
          <ThemedText type="subtitle">{detail?.daily_count ?? 0}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, gap: 10, paddingBottom: 30 },
  sub: { opacity: 0.75 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.06)',
    padding: 12,
    gap: 6,
    position: 'relative',
  },
  label: {
    opacity: 0.85,
    fontWeight: '700',
  },
  graphBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    backgroundColor: 'rgba(120,120,120,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 1,
  },
  graphBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
