import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MetricTrendChart } from '@/components/ui/metric-trend-chart';
import { getParkingAdminCounts, type ParkingCountRow } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function TotalCountGraphScreen() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ParkingCountRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
      const username = pairs[0]?.[1] ?? '';
      const password = pairs[1]?.[1] ?? '';
      if (!username || !password) {
        Alert.alert('로그인 필요', '다시 로그인 후 이용해주세요.');
        return;
      }
      const list = await getParkingAdminCounts(username, password, 30);
      setRows(list);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '총 회원 그래프 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const points = useMemo(
    () =>
      [...rows]
        .reverse()
        .map((r) => ({ date: r.count_date.slice(5), value: Number(r.total_count || 0) })),
    [rows],
  );

  const latest = rows[0]?.total_count ?? 0;
  const prev = rows[1]?.total_count ?? 0;
  const delta = latest - prev;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">총 회원 그래프</ThemedText>
        <ThemedText style={styles.sub}>날짜별 누적 회원 수 추이</ThemedText>
        <Button title={loading ? '불러오는 중...' : '새로고침'} onPress={load} disabled={loading} />

        <View style={styles.summary}>
          <ThemedText>최신: {latest}</ThemedText>
          <ThemedText>전일 대비: {delta >= 0 ? `+${delta}` : `${delta}`}</ThemedText>
        </View>

        <MetricTrendChart points={points} color="#059669" />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, gap: 10, paddingBottom: 30 },
  sub: { opacity: 0.75 },
  summary: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
});
