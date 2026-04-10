import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { createJhrClass, getJhrClassDetail, getJhrRole, updateJhrClass } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

const toLocalInput = (raw?: string | null) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatPriceInput = (raw: string) => {
  const compact = raw.replace(/,/g, '').trim();
  if (!compact) return '';

  const parsed = Number(compact);
  if (Number.isFinite(parsed)) {
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.trunc(parsed));
  }

  const digits = compact.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = Number(digits);
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(num);
};

export default function JhrWriteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = Number(params.id);
  const isEditMode = Number.isFinite(editId) && editId > 0;

  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [capacity, setCapacity] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canSubmit = useMemo(() => !saving && title.trim() && startDate.trim() && endDate.trim(), [saving, title, startDate, endDate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
        const u = pairs[0]?.[1] ?? null;
        const p = pairs[1]?.[1] ?? null;
        if (!u || !p) {
          router.replace('/(auth)/login');
          return;
        }
        const role = await getJhrRole(u, p);
        if (role.role !== 'CREATOR') {
          Alert.alert('권한 없음', '크리에이터만 강의를 작성할 수 있습니다.');
          router.back();
          return;
        }
        setUsername(u);
        setPassword(p);

        if (isEditMode) {
          const detail = await getJhrClassDetail(editId, u, p);
          setTitle(detail.title || '');
          setDescription(detail.description || '');
          setPrice(formatPriceInput(detail.price || '0'));
          setCapacity(String(detail.capacity || 30));
          setStartDate(toLocalInput(detail.start_date));
          setEndDate(toLocalInput(detail.end_date));
        }
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, isEditMode, editId]);

  const submit = async () => {
    if (!username || !password) return;
    const t = title.trim();
    if (!t) {
      Alert.alert('입력 필요', '제목을 입력해주세요.');
      return;
    }
    const p = Number(price.replace(/,/g, ''));
    const c = Number(capacity);
    if (!Number.isFinite(p) || p < 0) {
      Alert.alert('입력 오류', '가격은 0 이상의 숫자여야 합니다.');
      return;
    }
    if (!Number.isInteger(c) || c <= 0) {
      Alert.alert('입력 오류', '정원은 1 이상의 정수여야 합니다.');
      return;
    }
    const sd = new Date(startDate);
    const ed = new Date(endDate);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
      Alert.alert('입력 오류', '시작일/종료일 형식을 확인해주세요.');
      return;
    }
    if (ed <= sd) {
      Alert.alert('입력 오류', '종료일은 시작일보다 이후여야 합니다.');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await updateJhrClass(editId, username, password, {
          title: t,
          description: description.trim(),
          price: p,
          capacity: c,
          start_date: sd.toISOString(),
          end_date: ed.toISOString(),
        });
      } else {
        await createJhrClass(username, password, {
          title: t,
          description: description.trim(),
          price: p,
          capacity: c,
          start_date: sd.toISOString(),
          end_date: ed.toISOString(),
          status: 'DRAFT',
        });
      }
      Alert.alert('완료', isEditMode ? '강의가 수정되었습니다.' : '강의가 생성되었습니다.');
      router.replace('/jhr/jhr_list');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedText type="title">{isEditMode ? '강의 수정' : '강의 작성'}</ThemedText>

          {loading ? <ThemedText>불러오는 중...</ThemedText> : null}

          <ThemedText style={styles.label}>제목</ThemedText>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="강의 제목" />

          <ThemedText style={styles.label}>설명</ThemedText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            placeholder="강의 설명"
            multiline
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <ThemedText style={styles.label}>가격</ThemedText>
              <TextInput
                value={price}
                onChangeText={(t) => setPrice(formatPriceInput(t))}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="예: 10,000"
              />
            </View>
            <View style={styles.half}>
              <ThemedText style={styles.label}>정원</ThemedText>
              <TextInput value={capacity} onChangeText={setCapacity} style={styles.input} keyboardType="number-pad" />
            </View>
          </View>

          <ThemedText style={styles.label}>시작일</ThemedText>
          <TextInput value={startDate} onChangeText={setStartDate} style={styles.input} placeholder="YYYY-MM-DD" />

          <ThemedText style={styles.label}>종료일</ThemedText>
          <TextInput value={endDate} onChangeText={setEndDate} style={styles.input} placeholder="YYYY-MM-DD" />

          {!isEditMode ? <ThemedText style={styles.fixedStatus}>작성 시 상태는 DRAFT로 고정됩니다.</ThemedText> : null}

          <View style={styles.actionRow}>
            <Button title="취소" variant="secondary" onPress={() => router.back()} style={styles.actionBtn} />
            <Button title={saving ? '저장 중...' : isEditMode ? '수정' : '생성'} onPress={submit} disabled={!canSubmit} style={styles.actionBtn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, gap: 8, paddingBottom: 24 },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(120,120,120,0.05)',
    color: '#111827',
  },
  textArea: { minHeight: 120 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 8 },
  fixedStatus: { fontSize: 12, opacity: 0.8, marginTop: 2, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1 },
});
