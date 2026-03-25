import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getParkingAdminUsers, type ParkingAdminUserRow } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

function fmt(v: string | null | undefined) {
  if (!v) return '-';
  return String(v).replace('T', ' ').slice(0, 19);
}

export default function ParkingUserListScreen() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ParkingAdminUserRow[]>([]);
  const [sortMode, setSortMode] = useState<'signup' | 'action'>('signup');

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
      const list = await getParkingAdminUsers(username, password, 1000);
      setRows(list);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '회원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const toTs = (v: string | null | undefined) => {
      if (!v) return 0;
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : 0;
    };
    if (sortMode === 'action') {
      copy.sort((a, b) => toTs(b.action_date) - toTs(a.action_date));
      return copy;
    }
    copy.sort((a, b) => toTs(b.signup_date) - toTs(a.signup_date));
    return copy;
  }, [rows, sortMode]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">회원 목록</ThemedText>
        <ThemedText style={styles.sub}>parking_users 정보를 표 형태로 표시합니다.</ThemedText>
        <View style={styles.sortRow}>
          <Pressable
            onPress={() => setSortMode('signup')}
            style={({ pressed }) => [
              styles.sortBtn,
              sortMode === 'signup' ? styles.sortBtnActive : undefined,
              { opacity: pressed ? 0.9 : 1 },
            ]}>
            <ThemedText style={[styles.sortBtnText, sortMode === 'signup' ? styles.sortBtnTextActive : undefined]}>가입일 정렬</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setSortMode('action')}
            style={({ pressed }) => [
              styles.sortBtn,
              sortMode === 'action' ? styles.sortBtnActive : undefined,
              { opacity: pressed ? 0.9 : 1 },
            ]}>
            <ThemedText style={[styles.sortBtnText, sortMode === 'action' ? styles.sortBtnTextActive : undefined]}>활성일 정렬</ThemedText>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrap}>
          <View>
            <View style={[styles.row, styles.headRow]}>
              <ThemedText style={[styles.cell, styles.head, { width: 120 }]}>username</ThemedText>
              <ThemedText style={[styles.cell, styles.head, styles.centerCell, { width: 50 }]}>floor</ThemedText>
              <ThemedText style={[styles.cell, styles.head, styles.centerCell, { width: 40 }]}>p</ThemedText>
              <ThemedText style={[styles.cell, styles.head, { width: 180 }]}>action_date</ThemedText>
              <ThemedText style={[styles.cell, styles.head, { width: 180 }]}>signup_date</ThemedText>
            </View>
            {sortedRows.map((row, idx) => (
              <View key={`${row.username}-${idx}`} style={styles.row}>
                <ThemedText style={[styles.cell, { width: 120 }]}>{row.username}</ThemedText>
                <ThemedText style={[styles.cell, styles.centerCell, { width: 50 }]}>{row.floor || '-'}</ThemedText>
                <ThemedText style={[styles.cell, styles.centerCell, { width: 40 }]}>{row.pillar_number || '-'}</ThemedText>
                <ThemedText style={[styles.cell, { width: 180 }]}>{fmt(row.action_date)}</ThemedText>
                <ThemedText style={[styles.cell, { width: 180 }]}>{fmt(row.signup_date)}</ThemedText>
              </View>
            ))}
            {!loading && rows.length === 0 ? (
              <View style={styles.emptyBox}>
                <ThemedText style={styles.sub}>표시할 회원이 없습니다.</ThemedText>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, gap: 10, paddingBottom: 30 },
  sub: { opacity: 0.75 },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.45)',
    backgroundColor: 'rgba(120,120,120,0.10)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  sortBtnActive: {
    backgroundColor: '#2F6BFF',
    borderColor: '#2F6BFF',
  },
  sortBtnText: {
    fontWeight: '800',
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.04)',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,120,0.25)',
  },
  headRow: {
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(120,120,120,0.25)',
    fontSize: 13,
  },
  centerCell: {
    textAlign: 'center',
  },
  head: {
    fontWeight: '800',
  },
  emptyBox: {
    padding: 12,
  },
});
