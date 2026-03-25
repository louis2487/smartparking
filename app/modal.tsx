import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ParkingMap } from '@/components/parking-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import ScrollNavigator from '@/components/ui/scroll-navigator';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useParking } from '@/parking-provider';

type Floor = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

type ScrollRef = {
  scrollTo: (opts: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToEnd: (opts?: { animated?: boolean }) => void;
};

export default function ModalScreen() {
  const router = useRouter();
  const { current, save, refreshing, refreshCurrent, refreshHistory } = useParking();

  const [floor, setFloor] = useState<Floor>('B1');
  const [zone, setZone] = useState<Zone | null>(null);
  const [spot, setSpot] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const scrollRef = React.useRef<ScrollRef | null>(null);
  const getMetrics = useCallback(() => ({ contentHeight, layoutHeight }), [contentHeight, layoutHeight]);

  const inputBg = useThemeColor({}, 'background');
  const inputText = useThemeColor({}, 'text');
  const border = useMemo(() => ({ borderColor: 'rgba(120,120,120,0.35)' }), []);

  useEffect(() => {
    if (!current) return;
    const f = (current.floor || '').toUpperCase();
    if (f === 'B1' || f === 'B2' || f === 'B3' || f === 'B4' || f === 'B5') setFloor(f);
    const z = (current.zone || '').toUpperCase();
    if (z === 'A' || z === 'B' || z === 'C' || z === 'D' || z === 'E' || z === 'F' || z === 'G') setZone(z);
    setSpot(current.spot ?? null);
    setNote(current.note ?? '');
  }, [current]);

  const canSave = Boolean(zone);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <ThemedView style={styles.screen}>
        <View style={styles.scrollStage}>
          <Animated.ScrollView
            ref={scrollRef as unknown as React.LegacyRef<any>}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setContentHeight(h)}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}>
            <ThemedText type="title">위치 저장</ThemedText>
            <ThemedText style={{ opacity: 0.8 }}>구역과 번호(선택)를 저장하면 홈에서 바로 확인할 수 있어요.</ThemedText>

            {error ? (
              <ThemedView style={styles.errorBox}>
                <ThemedText style={styles.errorText}>저장 실패</ThemedText>
                <ThemedText style={styles.errorTextSmall}>{error}</ThemedText>
              </ThemedView>
            ) : null}

            <ParkingMap
              floor={floor}
              zone={zone}
              onChangeFloor={(f) => setFloor(f)}
              onChangeZone={(z) => setZone(z)}
            />

            <ThemedView style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="subtitle">번호/기둥(선택)</ThemedText>
                <TextInput
                  value={spot ?? ''}
                  onChangeText={(t) => setSpot(t.trim() ? t : null)}
                  placeholder="예: 101 / B-12 / 3층-기둥7"
                  placeholderTextColor="rgba(120,120,120,0.8)"
                  style={[styles.input, border, { backgroundColor: inputBg, color: inputText }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="subtitle">메모(선택)</ThemedText>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="예: 엘리베이터 B 앞 / 기둥 옆"
                  placeholderTextColor="rgba(120,120,120,0.8)"
                  style={[styles.input, styles.inputMulti, border, { backgroundColor: inputBg, color: inputText }]}
                  multiline
                />
              </View>
            </ThemedView>

            <View style={styles.buttons}>
              <Button
                title="저장"
                onPress={async () => {
                  if (!zone) return;
                  setSaving(true);
                  setError(null);
                  try {
                    await save({ floor, zone, spot, note: note.trim() ? note.trim() : null });
                    await Promise.all([refreshCurrent(), refreshHistory()]);
                    router.back();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSaving(false);
                  }
                }}
                loading={saving}
                disabled={!canSave}
              />
              <Button title="취소" variant="secondary" onPress={() => router.back()} disabled={saving || refreshing} />
            </View>
          </Animated.ScrollView>

          <ScrollNavigator
            scrollY={scrollY}
            getMetrics={getMetrics}
            onTop={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            onBottom={() => scrollRef.current?.scrollToEnd({ animated: true })}
            rightOffset={10}
            topOffset={12}
            bottomOffset={12}
            barWidth={3}
            trackOpacity={0.22}
            thumbOpacity={0.65}
            thumbColor="#FF0000"
            buttonOpacity={0.35}
            showButtons
          />
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollStage: {
    flex: 1,
    position: 'relative',
  },
  container: {
    padding: 18,
    gap: 12,
    paddingBottom: 26,
  },
  form: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
  },
  field: {
    gap: 8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputMulti: {
    height: 92,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  buttons: {
    gap: 10,
    marginTop: 6,
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
});
