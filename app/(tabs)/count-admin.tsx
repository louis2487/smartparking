import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { getParkingAdminCounts, type ParkingCountRow } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function ParkingCountAdminScreen() {
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
      Alert.alert('오류', e instanceof Error ? e.message : '집계 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">현황 집계</ThemedText>
        <ThemedText style={styles.sub}>Admin 전용 요약: 총 회원 / 오늘 가입</ThemedText>
        <Button title={loading ? '불러오는 중...' : '새로고침'} onPress={load} disabled={loading} />

        <View style={styles.list}>
          {rows.map((row) => (
            <View key={row.count_date} style={styles.item}>
              <ThemedText style={styles.date}>{row.count_date}</ThemedText>
              <ThemedText>총 회원: {row.total_count}</ThemedText>
              <ThemedText>오늘 가입: {row.daily_count}</ThemedText>
            </View>
          ))}
          {!loading && rows.length === 0 ? <ThemedText style={styles.empty}>표시할 집계가 없습니다.</ThemedText> : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, gap: 10, paddingBottom: 30 },
  sub: { opacity: 0.75 },
  list: { gap: 10, marginTop: 4 },
  item: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.06)',
    padding: 12,
    gap: 4,
  },
  date: { fontWeight: '800' },
  empty: { opacity: 0.75 },
});

