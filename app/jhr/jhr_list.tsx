import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { getJhrClasses, getJhrRole, JhrClass, JhrClassStatus, JhrEnrollStatus, JhrRole } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

function formatDate(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

function formatPrice(raw: string | number) {
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(num)) return `${String(raw)}원`;
  const isInteger = Math.abs(num - Math.round(num)) < 1e-9;
  return `${new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: isInteger ? 0 : 2 }).format(num)}원`;
}

function formatClassStatus(status: JhrClassStatus) {
  if (status === 'DRAFT') return '초안';
  if (status === 'OPEN') return '모집 중';
  return '모집 마감';
}

function formatEnrollStatus(status: JhrEnrollStatus) {
  if (status === 'PENDING') return '신청 완료';
  if (status === 'CONFIRMED') return '결제 완료';
  return '취소됨';
}

export default function JhrListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<JhrClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<JhrRole>('STUDENT');
  const [statusFilter, setStatusFilter] = useState<'ALL' | JhrClassStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const filteredItems = useMemo(() => items, [items]);
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    const adjustedStart = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  }, [currentPage, totalPages]);

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
      const [r, listOut] = await Promise.all([
        getJhrRole(username, password),
        getJhrClasses(username, password, statusFilter === 'ALL' ? undefined : statusFilter, currentPage, 3),
      ]);
      setRole(r.role);
      setItems(listOut.items ?? []);
      setTotalCount(typeof listOut.total_count === 'number' ? listOut.total_count : 0);
      setTotalPages(typeof listOut.total_pages === 'number' ? Math.max(1, listOut.total_pages) : 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter, currentPage]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">클래스 목록</ThemedText>
          <Button title="역할설정" variant="secondary" onPress={() => router.push('/jhr/jhr_role' as any)} style={styles.smallBtn} />
        </View>
        <ThemedText style={styles.roleText}>현재 역할: {role === 'CREATOR' ? '크리에이터' : '수강생'}</ThemedText>

        <View style={styles.filterRow}>
          {(
            [
              { value: 'ALL', label: '모두' },
              { value: 'DRAFT', label: '초안' },
              { value: 'OPEN', label: '모집 중' },
              { value: 'CLOSED', label: '모집 마감' },
            ] as const
          ).map((s) => (
            <Pressable
              key={s.value}
              onPress={() => {
                setStatusFilter(s.value);
                setCurrentPage(1);
              }}
              style={({ pressed }) => [
                styles.filterBtn,
                statusFilter === s.value ? styles.filterBtnActive : null,
                { opacity: pressed ? 0.9 : 1 },
              ]}>
              <ThemedText style={statusFilter === s.value ? styles.filterTextActive : styles.filterText}>{s.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {role === 'CREATOR' ? <Button title="강의 작성" onPress={() => router.push('/jhr/jhr_write' as any)} /> : null}
        {role === 'STUDENT' ? <Button title="내 수강 신청 목록 조회" onPress={() => router.push('/jhr/jhr_my_enrollments' as any)} /> : null}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {!loading && !error && filteredItems.length === 0 ? <ThemedText style={{ opacity: 0.8 }}>등록된 클래스가 없습니다.</ThemedText> : null}

        {!loading && !error && filteredItems.length > 0
          ? filteredItems.map((c) => (
              <Pressable
                key={c.id}
                onPress={() =>
                  router.push({
                    pathname: '/jhr/[id]',
                    params: { id: String(c.id) },
                  } as any)
                }
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}>
                <View style={styles.cardHead}>
                  <ThemedText style={styles.title}>{c.title}</ThemedText>
                  <ThemedText style={styles.badge}>{formatClassStatus(c.status)}</ThemedText>
                </View>
                <ThemedText style={styles.meta}>기간: {formatDate(c.start_date)} ~ {formatDate(c.end_date)}</ThemedText>
                <ThemedText style={styles.meta}>
                  정원: {c.current_count}/{c.capacity} | 가격: {formatPrice(c.price)}
                </ThemedText>
                {c.my_enrollment_status ? <ThemedText style={styles.me}>내 상태: {formatEnrollStatus(c.my_enrollment_status)}</ThemedText> : null}
              </Pressable>
            ))
          : null}

        {!loading && !error && totalCount > 3 ? (
          <View style={styles.pageRow}>
            {pageNumbers.map((p) => (
              <Pressable
                key={p}
                onPress={() => setCurrentPage(p)}
                style={({ pressed }) => [
                  styles.pageBtn,
                  currentPage === p ? styles.pageBtnActive : null,
                  { opacity: pressed ? 0.9 : 1 },
                ]}>
                <ThemedText style={currentPage === p ? styles.pageTextActive : styles.pageText}>{p}</ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={({ pressed }) => [styles.pageBtn, { opacity: currentPage >= totalPages ? 0.45 : pressed ? 0.9 : 1 }]}>
              <ThemedText style={styles.pageText}>{'>'}</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, gap: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  smallBtn: { height: 38, borderRadius: 10, paddingHorizontal: 12 },
  roleText: { opacity: 0.85, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterBtnActive: { backgroundColor: '#2F6BFF', borderColor: '#2F6BFF' },
  filterText: { fontSize: 12, fontWeight: '700' },
  filterTextActive: { fontSize: 12, fontWeight: '700', color: '#fff' },
  centerBox: { paddingVertical: 16 },
  errorText: { color: 'rgba(220,38,38,1)', fontWeight: '700' },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', flex: 1 },
  badge: { fontSize: 15, fontWeight: '800', opacity: 0.85 },
  meta: { fontSize: 12, opacity: 0.8 },
  me: { fontSize: 12, fontWeight: '700', color: '#2F6BFF', marginTop: 2 },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pageBtn: {
    minWidth: 28,
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.06)',
    paddingHorizontal: 6,
  },
  pageBtnActive: {
    backgroundColor: '#2F6BFF',
    borderColor: '#2F6BFF',
  },
  pageText: { fontWeight: '700', opacity: 0.9 },
  pageTextActive: { fontWeight: '700', color: '#fff' },
});
