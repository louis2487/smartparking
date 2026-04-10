import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getJhrClassStudents, JhrEnrollment, JhrEnrollStatus } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

function formatEnrollStatus(status: JhrEnrollStatus) {
  if (status === 'PENDING') return '신청 완료';
  if (status === 'CONFIRMED') return '결제 완료';
  return '취소됨';
}

function formatDate(raw?: string | null) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export default function JhrClassStudentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ class_id?: string; title?: string }>();
  const classId = Number(params.class_id);
  const classTitle = useMemo(() => (params.title ? String(params.title) : '강의별 수강생 목록'), [params.title]);

  const [items, setItems] = useState<JhrEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(classId) || classId <= 0) {
      setError('유효하지 않은 강의 ID입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
      const username = pairs[0]?.[1] ?? null;
      const password = pairs[1]?.[1] ?? null;
      if (!username || !password) {
        router.replace('/(auth)/login');
        return;
      }
      const rows = await getJhrClassStudents(classId, username, password);
      setItems(rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [classId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
        <ThemedText type="title">{classTitle}</ThemedText>
        <ThemedText style={styles.sub}>총 {items.length}명</ThemedText>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {!loading && !error && items.length === 0 ? <ThemedText style={styles.emptyText}>수강생이 없습니다.</ThemedText> : null}

        {!loading && !error
          ? items.map((row) => (
              <View key={row.id} style={styles.card}>
                <ThemedText style={styles.name}>{row.username || `user_id:${row.user_id}`}</ThemedText>
                <ThemedText style={styles.meta}>상태: {formatEnrollStatus(row.status)}</ThemedText>
                <ThemedText style={styles.meta}>신청일: {formatDate(row.applied_at)}</ThemedText>
              </View>
            ))
          : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, gap: 10, paddingBottom: 24 },
  sub: { opacity: 0.85, fontWeight: '700' },
  centerBox: { paddingVertical: 16 },
  errorText: { color: 'rgba(220,38,38,1)', fontWeight: '700' },
  emptyText: { opacity: 0.8 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
  name: { fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#111827' },
});
