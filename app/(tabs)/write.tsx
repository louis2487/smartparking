import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import ScrollNavigator from '@/components/ui/scroll-navigator';
import { createParkingPost, getParkingPost, updateParkingPost } from '@/lib/api';

const AUTH_USER_KEY = 'smartparking:auth:username';
type ScrollRef = {
  scrollTo: (opts: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToEnd: (opts?: { animated?: boolean }) => void;
};

export default function NoticeWriteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollRef | null>(null);
  const getMetrics = useCallback(() => ({ contentHeight, layoutHeight }), [contentHeight, layoutHeight]);
  const editId = Number(params.id);
  const isEditMode = Number.isFinite(editId) && editId > 0;

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      setLoadingPost(true);
      try {
        const post = await getParkingPost(editId);
        setTitle(post.title ?? '');
        setContent(post.content ?? '');
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '수정할 공지사항을 불러오지 못했습니다.');
      } finally {
        setLoadingPost(false);
      }
    })();
  }, [editId, isEditMode]);

  const submit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      Alert.alert('입력 필요', '제목을 입력해주세요.');
      return;
    }
    if (!c) {
      Alert.alert('입력 필요', '내용을 입력해주세요.');
      return;
    }

    const username = (await AsyncStorage.getItem(AUTH_USER_KEY))?.trim() || '관리자';

    setSaving(true);
    try {
      if (isEditMode) {
        await updateParkingPost(editId, { title: t, content: c, status: 'published' });
      } else {
        await createParkingPost(username, { title: t, content: c, status: 'published' });
      }
      Alert.alert('완료', isEditMode ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
      router.back();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
        <View style={styles.scrollStage}>
          <Animated.ScrollView
            ref={scrollRef as unknown as React.LegacyRef<any>}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setContentHeight(h)}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}>
            <ThemedText type="title">{isEditMode ? '공지사항 수정' : '공지사항 작성'}</ThemedText>

            <View style={styles.field}>
              <ThemedText style={styles.label}>제목</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="제목을 입력하세요"
                placeholderTextColor="rgba(100,116,139,0.9)"
                editable={!saving && !loadingPost}
                style={styles.input}
                maxLength={120}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>내용</ThemedText>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="내용을 입력하세요"
                placeholderTextColor="rgba(100,116,139,0.9)"
                editable={!saving && !loadingPost}
                style={[styles.input, styles.textArea]}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                maxLength={4000}
              />
            </View>

            <View style={styles.actions}>
              <Button title="취소" variant="secondary" onPress={() => router.back()} disabled={saving || loadingPost} style={styles.actionBtn} />
              <Button
                title={saving ? (isEditMode ? '수정 중...' : '등록 중...') : isEditMode ? '수정' : '등록'}
                onPress={submit}
                disabled={saving || loadingPost}
                style={styles.actionBtn}
              />
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
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollStage: {
    flex: 1,
    position: 'relative',
  },
  container: { padding: 14, paddingBottom: 24, gap: 14 },
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.55)',
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#111827',
    fontSize: 16,
  },
  textArea: {
    height: 220,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  actionBtn: { flex: 1 },
});
