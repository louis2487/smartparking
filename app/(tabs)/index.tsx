import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useForceUpdate } from '@/force-update-provider';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getMe, getParkingAppVersion, setUserFloor, setUserPillarNumber } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';
const AUTH_FLOOR_KEY = 'smartparking:auth:floor';
const AUTH_PILLAR_KEY = 'smartparking:auth:pillar_number';
const SETTLE_URL_HTTP = 'http://sejonghermes.iptime.org';

const FLOORS = [
  { key: 'B2', label: 'B2', img: require('../../assets/images/floors/B2.png') },
  { key: 'B3', label: 'B3', img: require('../../assets/images/floors/B3.png') },
  { key: 'B4', label: 'B4', img: require('../../assets/images/floors/B4.png') },
  { key: 'B5', label: 'B5', img: require('../../assets/images/floors/B5.png') },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const modalText = '#111827';
  const didRedirectAuth = useRef(false);
  const didCheckVersion = useRef(false);
  const didFetchMe = useRef(false);
  const didOpenPopup = useRef(false);
  const { setFromServer } = useForceUpdate();

  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<(typeof FLOORS)[number]['key'] | null>(null);
  const [pillarNumber, setPillarNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userGrade, setUserGrade] = useState<'normal' | 'owner' | 'admin'>('normal');
  const [pillarModalOpen, setPillarModalOpen] = useState(false);
  const [pillarInput, setPillarInput] = useState('');
  const [pillarSaving, setPillarSaving] = useState(false);
  const [pillarError, setPillarError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY, AUTH_FLOOR_KEY, AUTH_PILLAR_KEY]);
      const u = pairs[0];
      const p = pairs[1];
      const f = pairs[2];
      const pn = pairs[3];
      if (!mounted) return;
      setUsername(u?.[1] ?? null);
      setPassword(p?.[1] ?? null);
      const floor = (f?.[1] || '').trim().toUpperCase();
      if (floor === 'B2' || floor === 'B3' || floor === 'B4' || floor === 'B5') {
        setSelected(floor);
      }
      const pillar = (pn?.[1] || '').trim();
      setPillarNumber(pillar ? pillar : null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (didCheckVersion.current) return;
    didCheckVersion.current = true;

    const p = Platform.OS;
    if (p !== 'android' && p !== 'ios') return;

    const currentVersion =
      ((Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? null) as string | null) ?? null;

    (async () => {
      try {
        const res = await getParkingAppVersion(p, currentVersion);
        setFromServer(res);
      } catch {
        // 서버 체크 실패 시에는 app.json(extra.forceUpdate) 기반 기본값을 유지합니다.
      }
    })();
  }, [setFromServer]);

  useEffect(() => {
    if (username === undefined || password === undefined) {
      // 로딩 중이면 대기
      return;
    }
    if (!username || !password) {
      if (didRedirectAuth.current) return;
      didRedirectAuth.current = true;
      router.replace('/(auth)/login');
    }
  }, [username, password, router]);

  useEffect(() => {
    if (didFetchMe.current) return;
    if (!username || !password) return;
    didFetchMe.current = true;
    (async () => {
      try {
        const me = await getMe(username, password);
        setUserGrade((me.grade as 'normal' | 'owner' | 'admin') || 'normal');
        const pn = (me.pillar_number || '').trim();
        setPillarNumber(pn ? pn : null);
      } catch {
        setUserGrade('normal');
      }
    })();
  }, [username, password]);

  useEffect(() => {
    if (didOpenPopup.current) return;
    // 로그인 완료 상태에서 1회만 시도
    if (!username || !password) return;
    didOpenPopup.current = true;
    router.push('/popup' as any);
  }, [password, router, username]);

  const cardBorder = useMemo(() => ({ borderColor: 'rgba(120,120,120,0.35)' }), []);

  const openSettle = async () => {
    // 해당 서버는 HTTPS(443)가 종종 타임아웃이라, HTTP를 기본으로 오픈합니다.
    try {
      await WebBrowser.openBrowserAsync(SETTLE_URL_HTTP);
    } catch {
      // 일부 환경에서 WebBrowser가 실패하면 Linking으로 폴백
      await Linking.openURL(SETTLE_URL_HTTP);
    }
  };

  const onPick = async (floor: (typeof FLOORS)[number]['key']) => {
    setSelected(floor);
    setError(null);
    if (!username || !password) {
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    try {
      await setUserFloor(floor, username, password);
      await AsyncStorage.setItem(AUTH_FLOOR_KEY, floor);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const openPillarModal = () => {
    const init = (pillarNumber || '').trim();
    setPillarInput(init);
    setPillarError(null);
    setPillarModalOpen(true);
  };

  const savePillar = async () => {
    setPillarError(null);
    if (!username || !password) {
      router.replace('/(auth)/login');
      return;
    }
    const raw = pillarInput.trim();
    if (raw && !/^\d+$/.test(raw)) {
      setPillarError('숫자만 입력해주세요.');
      return;
    }
    setPillarSaving(true);
    try {
      const res = await setUserPillarNumber(raw ? raw : null, username, password);
      const pn = (res.pillar_number || '').trim();
      setPillarNumber(pn ? pn : null);
      if (pn) await AsyncStorage.setItem(AUTH_PILLAR_KEY, pn);
      else await AsyncStorage.removeItem(AUTH_PILLAR_KEY);
      setPillarModalOpen(false);
    } catch (e) {
      setPillarError(e instanceof Error ? e.message : String(e));
    } finally {
      setPillarSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topRight}>
        <Button title="공지사항" variant="secondary" onPress={() => router.push('/list' as any)} style={styles.topRightBtn} />
        <Button title="주차정산" variant="secondary" onPress={openSettle} style={styles.topRightBtn} />
      </View>

      <ThemedText type="title">내 차 위치</ThemedText>
      <ThemedText style={styles.subtitle}>B2~B5 중 현재 층을 선택하세요. 선택하면 계정에 저장됩니다.</ThemedText>

      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>저장에 실패했어요.</ThemedText>
          <ThemedText style={styles.errorTextSmall}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      <View style={styles.grid}>
        {FLOORS.map((f) => {
          const active = selected === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => onPick(f.key)}
              disabled={loading}
              style={({ pressed }) => [
                styles.tile,
                cardBorder,
                active ? { borderColor: tint, borderWidth: 2 } : null,
                { opacity: loading ? 0.6 : pressed ? 0.92 : 1 },
              ]}>
              <Image source={f.img} style={styles.tileImage} contentFit="cover" />
              <View style={styles.tileLabel}>
                <ThemedText style={{ color: text, fontWeight: '900', fontSize: 18 }}>{f.label}</ThemedText>
                {active ? (
                  <Pressable
                    onPress={(e) => {
                      // 타일 onPress(층 선택)와 분리
                      e.stopPropagation();
                      openPillarModal();
                    }}
                    disabled={loading}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <ThemedText style={{ color: tint, fontWeight: '900' }}>
                      {pillarNumber ? `기둥 ${pillarNumber}` : '기둥번호 입력'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <ThemedText style={styles.caption}>
          {(username || '사용자') + '님의 차량은 ' + selected + '층' + (pillarNumber ? ` 기둥 ${pillarNumber}` : '') + '에 있습니다.'}
        </ThemedText>
      ) : null}

      {userGrade === 'owner' ? (
        <View style={styles.ownerButtonsWrap}>
          <View style={styles.ownerButtonsRow}>
            <Button
              title="관리자 설정"
              variant="secondary"
              onPress={() => router.push('/admin' as any)}
              style={styles.ownerButton}
            />
            <Button title="주역 점" variant="secondary" onPress={() => router.push('/iching' as any)} style={styles.ownerButton} />
          </View>
          <Button
            title="조홍래 지원자 백엔드 과제"
            variant="secondary"
            onPress={() => router.push('/jhr/jhr_list' as any)}
            style={styles.ownerButtonFull}
          />
        </View>
      ) : null}

      {userGrade === 'admin' ? (
        <View style={styles.adminButtonsRow}>
          <Button
            title="총 회원수"
            variant="secondary"
            onPress={() => router.push('/total_count_grape' as any)}
            style={styles.ownerButton}
          />
          <Button
            title="오늘 가입자 수"
            variant="secondary"
            onPress={() => router.push('/daily_count' as any)}
            style={styles.ownerButton}
          />
        </View>
      ) : null}

      <Modal transparent visible={pillarModalOpen} animationType="fade" onRequestClose={() => setPillarModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => (pillarSaving ? null : setPillarModalOpen(false))}>
          <Pressable style={styles.modalCard} onPress={() => null}>
            <ThemedText type="title" style={[styles.modalTitle, { color: modalText }]}>
              기둥번호 입력
            </ThemedText>
            {selected ? (
              <ThemedText style={[styles.modalSubtitle, { color: modalText }]}>
                현재 층: {selected}
                {pillarNumber ? ` / 기존: ${pillarNumber}` : ''}
              </ThemedText>
            ) : null}

            <TextInput
              value={pillarInput}
              onChangeText={(t) => setPillarInput(t)}
              placeholder="예: 12"
              placeholderTextColor="rgba(100,116,139,0.9)"
              keyboardType="number-pad"
              autoFocus
              editable={!pillarSaving}
              style={[
                styles.modalInput,
                {
                  color: modalText,
                  borderColor: pillarError ? 'rgba(220,38,38,0.55)' : 'rgba(15,23,42,0.18)',
                },
              ]}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={savePillar}
            />

            {pillarError ? <ThemedText style={styles.modalError}>{pillarError}</ThemedText> : null}

            <View style={styles.modalButtons}>
              <Button
                title="취소"
                variant="secondary"
                onPress={() => setPillarModalOpen(false)}
                disabled={pillarSaving}
                style={{ flex: 1 }}
              />
              <Button title={pillarSaving ? '저장 중...' : '저장'} onPress={savePillar} disabled={pillarSaving} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 28,
    marginTop:10,
    gap: 12,
  },
  topRight: {
    position: 'absolute',
    top: 24,
    right: 14,
    zIndex: 10,
    flexDirection: 'row',
    gap: 8,
  },
  topRightBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  subtitle: {
    opacity: 0.8,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
  tileImage: {
    width: '100%',
    height: 120,
  },
  tileLabel: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    marginTop: 2,
    opacity: 0.85,
    fontSize: 16,
    fontWeight: '600',
  },
  ownerButtonsWrap: {
    marginTop: 12,
    gap: 10,
  },
  ownerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adminButtonsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  ownerButton: {
    flex: 1,
  },
  ownerButtonFull: {
    width: '100%',
  },
  currentFloorText: {
    marginTop: 4,
    opacity: 0.85,
    fontWeight: '700',
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,60,60,0.55)',
    backgroundColor: 'rgba(210,60,60,0.08)',
    gap: 4,
  },
  errorText: {
    fontWeight: '700',
  },
  errorTextSmall: {
    opacity: 0.8,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.18)',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  modalTitle: {
    fontSize: 18,
  },
  modalSubtitle: {
    opacity: 0.85,
  },
  modalInput: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalError: {
    color: 'rgba(220,38,38,1)',
    fontWeight: '700',
  },
});
