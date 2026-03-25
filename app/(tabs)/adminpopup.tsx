import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getParkingUIConfig, updateParkingUIConfig, type ParkingUIConfig } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
const AUTH_PASS_KEY = 'smartparking:auth:password';

export default function AdminPopupScreen() {
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [widthPercentText, setWidthPercentText] = useState('92');
  const [heightText, setHeightText] = useState('360');
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');

  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const popupWidthPercent = useMemo(() => {
    const n = Number.parseInt((widthPercentText || '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(n) || n <= 0) return 92;
    return Math.min(Math.max(n, 40), 100);
  }, [widthPercentText]);

  const popupHeight = useMemo(() => {
    const n = Number.parseInt((heightText || '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(n) || n <= 0) return 360;
    return Math.min(Math.max(n, 200), 900);
  }, [heightText]);

  const loadAuth = useCallback(async () => {
    const pairs = await AsyncStorage.multiGet([AUTH_USER_KEY, AUTH_PASS_KEY]);
    setUsername(pairs[0]?.[1] ?? null);
    setPassword(pairs[1]?.[1] ?? null);
  }, []);

  const applyConfig = useCallback((cfg: ParkingUIConfig) => {
    const p = cfg.popup;
    setEnabled(!!p.enabled);
    setImageUrl(p.image_url ?? '');
    setLinkUrl(p.link_url ?? '');
    setWidthPercentText(String(p.width_percent ?? 92));
    setHeightText(String(p.height ?? 360));
    setResizeMode(p.resize_mode === 'cover' || p.resize_mode === 'stretch' ? p.resize_mode : 'contain');
  }, []);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await getParkingUIConfig();
      if (res.status !== 0) {
        Alert.alert('오류', '팝업 설정을 불러올 수 없습니다.');
        return;
      }
      applyConfig(res.config);
    } catch {
      Alert.alert('오류', '팝업 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [applyConfig]);

  useEffect(() => {
    loadAuth();
    load();
  }, [loadAuth, load]);

  const onSave = useCallback(async () => {
    if (saving) return;
    if (!username || !password) {
      Alert.alert('로그인 필요', '관리자 설정은 로그인 후 이용 가능합니다.');
      return;
    }
    setSaving(true);
    try {
      const next: ParkingUIConfig = {
        popup: {
          enabled: !!enabled,
          image_url: imageUrl.trim() ? imageUrl.trim() : null,
          link_url: linkUrl.trim() ? linkUrl.trim() : null,
          width_percent: popupWidthPercent,
          height: popupHeight,
          resize_mode: resizeMode,
        },
      };
      const res = await updateParkingUIConfig({ username, password, config: next });
      if (res.status !== 0) {
        Alert.alert('오류', res.message || '저장에 실패했습니다.');
        return;
      }
      Alert.alert('저장 완료', '팝업 설정이 저장되었습니다.');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [enabled, heightText, imageUrl, linkUrl, password, popupHeight, popupWidthPercent, resizeMode, saving, username]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">팝업창 관리</ThemedText>
        <ThemedText style={styles.sub}>팝업 이미지/링크/크기를 설정합니다.</ThemedText>

        <Pressable
          onPress={() => setEnabled((p) => !p)}
          style={({ pressed }) => [
            styles.toggle,
            { backgroundColor: enabled ? '#2F6BFF' : 'rgba(120,120,120,0.12)', opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <ThemedText style={{ fontWeight: '900', color: enabled ? '#fff' : undefined }}>
            팝업 노출: {enabled ? 'ON' : 'OFF'}
          </ThemedText>
        </Pressable>

        <ThemedText style={styles.label}>팝업 이미지 URL</ThemedText>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://..."
          autoCapitalize="none"
          style={styles.input}
        />

        <ThemedText style={styles.label}>클릭 링크(선택)</ThemedText>
        <TextInput
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="https://..."
          autoCapitalize="none"
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>너비(%, 40~100)</ThemedText>
            <TextInput value={widthPercentText} onChangeText={setWidthPercentText} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>높이(px)</ThemedText>
            <TextInput value={heightText} onChangeText={setHeightText} keyboardType="number-pad" style={styles.input} />
          </View>
        </View>

        <ThemedText style={styles.label}>표시 방식</ThemedText>
        <View style={styles.row}>
          <Pressable
            onPress={() => setResizeMode('contain')}
            style={[styles.pill, resizeMode === 'contain' ? styles.pillActive : undefined]}
          >
            <ThemedText style={{ fontWeight: '900', color: resizeMode === 'contain' ? '#fff' : undefined }}>원본</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setResizeMode('stretch')}
            style={[styles.pill, resizeMode === 'stretch' ? styles.pillActive : undefined]}
          >
            <ThemedText style={{ fontWeight: '900', color: resizeMode === 'stretch' ? '#fff' : undefined }}>맞추기</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setResizeMode('cover')}
            style={[styles.pill, resizeMode === 'cover' ? styles.pillActive : undefined]}
          >
            <ThemedText style={{ fontWeight: '900', color: resizeMode === 'cover' ? '#fff' : undefined }}>채우기</ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={onSave}
          disabled={saving || loading}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: saving || loading ? 'rgba(120,120,120,0.55)' : '#2F6BFF', opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <ThemedText style={{ fontWeight: '900', color: '#fff' }}>{saving ? '저장 중...' : '저장'}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 18, gap: 10, paddingBottom: 30 },
  sub: { opacity: 0.75 },
  toggle: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    marginTop: 6,
  },
  label: { marginTop: 4, fontWeight: '800' },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
  row: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.10)',
  },
  pillActive: { backgroundColor: '#2F6BFF', borderColor: '#2F6BFF' },
  save: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
});

