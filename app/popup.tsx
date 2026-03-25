import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { getParkingUIConfig } from '@/lib/api';

const HIDE_TODAY_KEY = 'smartparking:popup:hide:today';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PopupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [widthPercent, setWidthPercent] = useState(92);
  const [height, setHeight] = useState(360);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');

  const containerStyle = useMemo(
    () => [{ width: `${widthPercent}%` as const, height, alignSelf: 'center' as const }, styles.popupFrame],
    [height, widthPercent],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const hidden = await AsyncStorage.getItem(HIDE_TODAY_KEY);
        if (hidden === todayKey()) {
          router.back();
          return;
        }
        const res = await getParkingUIConfig();
        const p = res?.config?.popup;
        if (!mounted) return;
        if (res.status !== 0 || !p?.enabled || !p.image_url) {
          router.back();
          return;
        }
        setImageUrl(p.image_url ?? null);
        setLinkUrl(p.link_url ?? null);
        setWidthPercent(p.width_percent ?? 92);
        setHeight(p.height ?? 360);
        setResizeMode(p.resize_mode === 'cover' || p.resize_mode === 'stretch' ? p.resize_mode : 'contain');
      } catch {
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={containerStyle}>
            {imageUrl ? (
              <Pressable
                style={{ flex: 1 }}
                onPress={async () => {
                  if (!linkUrl) return;
                  try {
                    await Linking.openURL(linkUrl);
                  } catch {
                    // ignore
                  }
                }}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: '100%', backgroundColor: 'rgba(120,120,120,0.12)' }}
                  contentFit={resizeMode === 'stretch' ? 'fill' : resizeMode === 'cover' ? 'cover' : 'contain'}
                />
              </Pressable>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ opacity: 0.75 }}>이미지가 없습니다.</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button title="닫기" variant="secondary" onPress={() => router.back()} />
            <Button
              title="오늘 다시 보지 않기"
              onPress={async () => {
                await AsyncStorage.setItem(HIDE_TODAY_KEY, todayKey());
                router.back();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: '#fff',
    gap: 12,
  },
  popupFrame: {
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  actions: { gap: 10 },
});

