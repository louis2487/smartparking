import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyJhrEnrollments, JhrEnrollment, JhrEnrollStatus } from '@/lib/api';

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

export default function JhrMyEnrollmentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<JhrEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      const rows = await getMyJhrEnrollments(username, password);
      setItems((rows ?? []).filter((x) => x.status !== 'CANCELLED'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">내 수강 신청 목록</ThemedText>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : null}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {!loading && !error && items.length === 0 ? <ThemedText style={styles.emptyText}>수강 신청 내역이 없습니다.</ThemedText> : null}

        {!loading && !error
          ? items.map((row) => (
              <Pressable
                key={row.id}
                onPress={() =>
                  router.push({
                    pathname: '/jhr/[id]',
                    params: { id: String(row.class_id) },
                  } as any)
                }
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}>
                <ThemedText style={styles.cardTitle}>{row.class_title || `클래스 #${row.class_id}`}</ThemedText>
                <ThemedText style={styles.meta}>상태: {formatEnrollStatus(row.status)}</ThemedText>
                {row.status === 'PENDING' ? <ThemedText style={styles.meta}>신청일: {formatDate(row.applied_at)}</ThemedText> : null}
                {row.status === 'CONFIRMED' ? <ThemedText style={styles.meta}>결제일: {formatDate(row.confirmed_at)}</ThemedText> : null}
                {row.status === 'CANCELLED' ? (
                  <>
                    <ThemedText style={styles.meta}>결제일: {formatDate(row.confirmed_at)}</ThemedText>
                    <ThemedText style={styles.meta}>취소일: {formatDate(row.canceled_at)}</ThemedText>
                  </>
                ) : null}
              </Pressable>
            ))
          : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, gap: 10, paddingBottom: 24 },
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
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#111827' },
});
