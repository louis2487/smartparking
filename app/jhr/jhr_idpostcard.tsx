import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import {
  cancelJhrEnrollment,
  confirmJhrEnrollment,
  createJhrEnrollment,
  getJhrClassDetail,
  getJhrRole,
  getMyJhrEnrollments,
  JhrClass,
  JhrClassStatus,
  JhrEnrollStatus,
  JhrRole,
  updateJhrClassStatus,
} from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';
const KST_TIME_ZONE = 'Asia/Seoul';
const kstYmdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function fmtDate(raw?: string | null) {
  if (!raw) return '-';
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

export default function JhrIdPostCard({ classId }: { classId: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [role, setRole] = useState<JhrRole>('STUDENT');
  const [item, setItem] = useState<JhrClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDeadlineText, setCancelDeadlineText] = useState<string | null>(null);

  const getKstDateParts = (d: Date) => {
    const parts = kstYmdFormatter.formatToParts(d);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
    return { y, m, day };
  };

  const formatCancelDeadline = (raw: string | null | undefined) => {
    if (!raw) return null;
    const base = new Date(raw);
    if (Number.isNaN(base.getTime())) return null;
    const kstBase = getKstDateParts(base);
    if (!kstBase) return null;
    const deadline = new Date(Date.UTC(kstBase.y, kstBase.m - 1, kstBase.day + 7));
    const yy = String(deadline.getUTCFullYear()).slice(-2);
    const mm = String(deadline.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(deadline.getUTCDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(classId) || classId <= 0) {
      setError('유효하지 않은 클래스 ID입니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
      const u = pairs[0]?.[1] ?? null;
      const p = pairs[1]?.[1] ?? null;
      if (!u || !p) {
        router.replace('/(auth)/login');
        return;
      }
      setUsername(u);
      setPassword(p);
      const [r, detail] = await Promise.all([getJhrRole(u, p), getJhrClassDetail(classId, u, p)]);
      setRole(r.role);
      setItem(detail);
      setCancelDeadlineText(null);
      if (detail.my_enrollment_status === 'CONFIRMED' && detail.my_enrollment_id) {
        try {
          const enrollments = await getMyJhrEnrollments(u, p);
          const mine = enrollments.find((x) => x.id === detail.my_enrollment_id);
          const deadline = formatCancelDeadline(mine?.applied_at);
          setCancelDeadlineText(deadline);
        } catch {
          setCancelDeadlineText(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [classId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const onEnroll = async () => {
    if (!username || !password || !item) return;
    setLoadingAction(true);
    try {
      await createJhrEnrollment(username, password, item.id);
      await load();
      Alert.alert('완료', `수강 ${formatEnrollStatus('PENDING')} 되었습니다.`);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '신청에 실패했습니다.');
    } finally {
      setLoadingAction(false);
    }
  };

  const onConfirm = async () => {
    if (!username || !password || !item?.my_enrollment_id) return;
    setLoadingAction(true);
    try {
      await confirmJhrEnrollment(username, password, item.my_enrollment_id);
      await load();
      Alert.alert('완료', `${formatEnrollStatus('CONFIRMED')} 처리되었습니다.`);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '확정에 실패했습니다.');
    } finally {
      setLoadingAction(false);
    }
  };

  const onCancel = async () => {
    if (!username || !password || !item?.my_enrollment_id) return;
    setLoadingAction(true);
    try {
      await cancelJhrEnrollment(username, password, item.my_enrollment_id);
      await load();
      Alert.alert('완료', `${formatEnrollStatus('CANCELLED')} 처리되었습니다.`);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '취소에 실패했습니다.');
    } finally {
      setLoadingAction(false);
    }
  };

  const onChangeStatus = async (nextStatus: 'OPEN' | 'CLOSED') => {
    if (!username || !password || !item) return;
    if (nextStatus === 'OPEN' && item.status !== 'DRAFT') {
      Alert.alert('안내', '모집 시작은 초안 상태에서만 가능합니다.');
      return;
    }
    setLoadingAction(true);
    try {
      await updateJhrClassStatus(item.id, username, password, nextStatus);
      await load();
      Alert.alert('완료', `상태가 ${nextStatus === 'OPEN' ? '모집 중' : '모집 마감'}으로 변경되었습니다.`);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '상태 변경에 실패했습니다.');
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (!item) {
    return <ThemedText>클래스를 찾을 수 없습니다.</ThemedText>;
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
        <ThemedText type="title" style={styles.titleText}>
          {item.title}
        </ThemedText>
        <View style={styles.sectionDivider} />
        <ThemedText style={styles.content}>{item.description || '(설명 없음)'}</ThemedText>
        <View style={styles.sectionDivider} />
        <ThemedText style={styles.meta}>상태: {formatClassStatus(item.status)}</ThemedText>
        <ThemedText style={styles.meta}>
          정원: {item.current_count}/{item.capacity}
        </ThemedText>
        <ThemedText style={styles.meta}>기간: {fmtDate(item.start_date)} ~ {fmtDate(item.end_date)}</ThemedText>
        <ThemedText style={styles.meta}>가격: {formatPrice(item.price)}</ThemedText>
        <View style={styles.sectionDivider} />

        {role === 'STUDENT' ? (
          <View style={styles.actions}>
            {!item.my_enrollment_id ? (
              <Button title={loadingAction ? '처리 중...' : '수강 신청'} onPress={onEnroll} disabled={loadingAction || item.status !== 'OPEN'} />
            ) : null}

            {item.my_enrollment_status === 'PENDING' ? (
              <Button
                title={loadingAction ? '처리 중...' : '결제 확정'}
                onPress={onConfirm}
                disabled={loadingAction}
                variant="secondary"
              />
            ) : null}

            {item.my_enrollment_status === 'CONFIRMED' ? (
              <Button
                title={loadingAction ? '처리 중...' : `수강 취소${cancelDeadlineText ? `(${cancelDeadlineText}까지 가능)` : ''}`}
                onPress={onCancel}
                disabled={loadingAction}
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}

        {role === 'CREATOR' ? (
          <View style={styles.creatorActionsWrap}>
            <View style={styles.creatorActions}>
              <Button title="내용 수정" variant="secondary" onPress={() => router.push(`/jhr/jhr_write?id=${item.id}` as any)} style={styles.creatorActionBtn} />
              {item.status === 'DRAFT' ? (
                <Button
                  title={loadingAction ? '처리 중...' : '모집 시작'}
                  onPress={() => onChangeStatus('OPEN')}
                  disabled={loadingAction}
                  style={styles.creatorActionBtn}
                />
              ) : null}
              {item.status === 'OPEN' ? (
                <Button
                  title={loadingAction ? '처리 중...' : '모집 마감'}
                  onPress={() => onChangeStatus('CLOSED')}
                  disabled={loadingAction}
                  style={styles.creatorActionBtn}
                />
              ) : null}
            </View>
            <Button
              title="수강생 목록 조회"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/jhr/jhr_class_students',
                  params: { class_id: String(item.id), title: item.title || `클래스 #${item.id}` },
                } as any)
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, gap: 8, paddingBottom: 24 },
  centerBox: { padding: 20 },
  errorBox: { padding: 12 },
  errorText: { color: 'rgba(220,38,38,1)', fontWeight: '700' },
  titleText: { color: '#111827' },
  meta: { fontSize: 15, lineHeight: 22, color: '#111827' },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 4, color: '#111827' },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(120,120,120,0.45)',
    marginVertical: 2,
  },
  actions: { gap: 8, marginBottom: 10 },
  creatorActionsWrap: { gap: 8, marginTop: 2 },
  creatorActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  creatorActionBtn: { flex: 1 },
});
