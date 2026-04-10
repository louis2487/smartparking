import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { getMe, getParkingPosts, type ParkingPost } from '@/lib/api';

const PAGE_SIZE = 15;
const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

function formatPostDateTime(raw: string) {
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return '';
  const d = dt.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  const t = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${d} ${t}`;
}

export default function NoticeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ParkingPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [canWrite, setCanWrite] = useState(false);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
        const username = pairs[0]?.[1]?.trim() || '';
        const password = pairs[1]?.[1]?.trim() || '';
        if (username && password) {
          const me = await getMe(username, password);
          setCanWrite(me.grade === 'admin');
        } else {
          setCanWrite(false);
        }
      } catch {
        setCanWrite(false);
      }
      const res = await getParkingPosts({ status: 'published', limit: 100 });
      setItems(res.items ?? []);
      setCurrentPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '공지사항을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title">공지사항</ThemedText>
          {canWrite ? <Button title="작성" onPress={() => router.push('/write' as any)} style={styles.refreshBtn} /> : null}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorTitle}>로딩 오류</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        {!loading && !error && paginatedItems.length === 0 ? (
          <ThemedText style={styles.emptyText}>등록된 공지사항이 없습니다.</ThemedText>
        ) : null}

        {!loading && !error && paginatedItems.length > 0 ? (
          <View style={styles.listCard}>
            {paginatedItems.map((post) => (
              <Pressable
                key={post.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/idpostcard/[id]',
                    params: { id: String(post.id) },
                  } as any)
                }
                style={({ pressed }) => [styles.itemRow, { opacity: pressed ? 0.9 : 1 }]}>
                <View style={styles.dot} />
                <View style={styles.itemTextWrap}>
                  <ThemedText numberOfLines={1} style={styles.itemTitle}>
                    {post.title}
                  </ThemedText>
                </View>
                <ThemedText style={styles.itemDate} numberOfLines={1}>
                  {formatPostDateTime(post.created_at)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !error && totalPages > 1 ? (
          <View style={styles.pageBar}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pressable
                key={p}
                onPress={() => setCurrentPage(p)}
                style={({ pressed }) => [
                  styles.pageBtn,
                  currentPage === p ? styles.pageBtnActive : null,
                  { opacity: pressed ? 0.88 : 1 },
                ]}>
                <ThemedText style={[styles.pageText, currentPage === p ? styles.pageTextActive : null]}>{p}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, paddingBottom: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  refreshBtn: { height: 40, paddingHorizontal: 12, borderRadius: 10 },
  centerBox: { paddingVertical: 16 },
  errorBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,60,60,0.55)',
    backgroundColor: 'rgba(210,60,60,0.08)',
    padding: 10,
    gap: 4,
  },
  errorTitle: { fontWeight: '700' },
  errorText: { fontSize: 12, opacity: 0.9 },
  emptyText: { opacity: 0.8 },
  listCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.4)',
    overflow: 'hidden',
  },
  itemRow: {
    minHeight: 38,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(30,41,59,0.9)',
  },
  itemTextWrap: { flex: 1 },
  itemTitle: { fontSize: 15 },
  itemDate: { fontSize: 11, opacity: 0.75 },
  pageBar: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    backgroundColor: 'rgba(120,120,120,0.08)',
  },
  pageBtnActive: {
    backgroundColor: '#2F6BFF',
    borderColor: '#2F6BFF',
  },
  pageText: { fontWeight: '700', fontSize: 12 },
  pageTextActive: { color: '#fff' },
});
