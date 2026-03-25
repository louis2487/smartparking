import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  scrollY: Animated.Value;
  getMetrics: () => { contentHeight: number; layoutHeight: number };
  onTop: () => void;
  onBottom: () => void;

  topOffset?: number;
  bottomOffset?: number;
  rightOffset?: number; // 우측 여백
  barWidth?: number; // 스크롤 너비(얇게: 3~4 추천)
  trackOpacity?: number; // 트랙 투명도(더 투명하게: 0.15~0.25)
  thumbOpacity?: number; // thumb 투명도
  thumbColor?: string; // thumb 색상
  buttonOpacity?: number; // 버튼 투명도(더 투명하게: 0.25~0.4)
  showButtons?: boolean; // 맨 위/아래 버튼 표시 여부
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function ScrollNavigator({
  scrollY,
  getMetrics,
  onTop,
  onBottom,

  topOffset = 0,
  bottomOffset = 0,
  rightOffset = 10,

  barWidth = 3,
  trackOpacity = 0.22,
  thumbOpacity = 0.65,
  thumbColor = '#FF0000',
  buttonOpacity = 1,
  showButtons = true,
}: Props) {
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [trackHeight, setTrackHeight] = useState(1);

  useEffect(() => {
    const metrics = getMetrics();
    setContentHeight((prev) => (prev !== metrics.contentHeight ? metrics.contentHeight : prev));
    setLayoutHeight((prev) => (prev !== metrics.layoutHeight ? metrics.layoutHeight : prev));
  }, [getMetrics]);

  const safeContent = Math.max(contentHeight, 0);
  const safeLayout = Math.max(layoutHeight, 1);
  const maxScroll = Math.max(safeContent - safeLayout, 0);

  const thumbHeight = useMemo(() => {
    if (trackHeight <= 1) return 40;
    if (safeContent <= 0 || safeLayout <= 0) return 40;
    const ratio = clamp(safeLayout / safeContent, 0, 1);
    const h = trackHeight * ratio;
    return clamp(h, 28, trackHeight);
  }, [trackHeight, safeLayout, safeContent]);

  const maxTranslateY = useMemo(() => {
    if (trackHeight <= 1 || thumbHeight <= 0) return 0;
    return Math.max(trackHeight - thumbHeight, 0);
  }, [trackHeight, thumbHeight]);

  const zeroValue = useRef(new Animated.Value(0)).current;
  const translateY = useMemo(() => {
    if (maxScroll > 0 && maxTranslateY > 0) {
      return scrollY.interpolate({
        inputRange: [0, maxScroll],
        outputRange: [0, maxTranslateY],
        extrapolate: 'clamp',
      });
    }
    return zeroValue;
  }, [scrollY, maxScroll, maxTranslateY, zeroValue]);

  const isScrollable = contentHeight > layoutHeight + 20;
  if (!isScrollable) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: topOffset,
          bottom: bottomOffset,
          right: rightOffset,
        },
      ]}>
      <View
        pointerEvents="none"
        style={[styles.track, { width: barWidth }]}
        onLayout={(e) => setTrackHeight(e.nativeEvent.layout.height)}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: `rgba(255,255,255,${trackOpacity})`,
              borderRadius: 999,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            {
              width: barWidth,
              height: thumbHeight,
              opacity: thumbOpacity,
              backgroundColor: thumbColor,
              transform: [{ translateY }],
            },
          ]}
        />
      </View>

      {showButtons && (
        <View style={styles.buttons} pointerEvents="box-none">
          <Pressable onPress={onTop} style={[styles.fab, { opacity: buttonOpacity }]} hitSlop={10}>
            <Ionicons name="chevron-up" size={20} color="#111" />
          </Pressable>

          <View style={{ height: 10 }} />

          <Pressable onPress={onBottom} style={[styles.fab, { opacity: buttonOpacity }]} hitSlop={10}>
            <Ionicons name="chevron-down" size={20} color="#111" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: 52,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  track: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 999,
  },
  thumb: {
    borderRadius: 999,
  },
  buttons: {
    position: 'absolute',
    right: 32,
    bottom: 0,
    alignItems: 'center',
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

