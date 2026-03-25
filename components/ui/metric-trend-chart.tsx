import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';

export type TrendPoint = {
  date: string;
  value: number;
};

type Props = {
  points: TrendPoint[];
  color?: string;
  height?: number;
};

export function MetricTrendChart({ points, color = '#2F6BFF', height = 220 }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const width = 340;
  const innerPad = 18;
  const axisLeft = 36;
  const chartW = width - axisLeft - innerPad;
  const chartH = height - innerPad * 2;

  const prepared = useMemo(() => {
    if (!points.length) return { path: '', circles: [], min: 0, max: 0, ticks: [] as Array<{ y: number; value: number }> };
    const values = points.map((p) => Number(p.value || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const tickCount = 4;

    const circles = points.map((p, i) => {
      const x = axisLeft + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
      const y = innerPad + ((max - p.value) / range) * chartH;
      return { x, y, v: p.value };
    });
    const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
      const t = i / tickCount;
      const y = innerPad + t * chartH;
      const value = Math.round(max - t * (max - min));
      return { y, value };
    });
    const path = circles.map((c) => `${c.x},${c.y}`).join(' ');
    return { path, circles, min, max, ticks };
  }, [chartH, chartW, innerPad, points]);

  const first = points[0]?.date ?? '-';
  const mid = points[Math.floor((points.length - 1) / 2)]?.date ?? '-';
  const last = points[points.length - 1]?.date ?? '-';
  const selected = selectedIdx !== null ? prepared.circles[selectedIdx] : null;

  useEffect(() => {
    // 데이터가 바뀌면 선택 상태 초기화
    setSelectedIdx(null);
  }, [points]);

  return (
    <View style={styles.wrap}>
      <View style={styles.metaRow}>
        <ThemedText style={styles.metaText}>최소: {prepared.min}</ThemedText>
        <ThemedText style={styles.metaText}>최대: {prepared.max}</ThemedText>
      </View>
      <Svg width={width} height={height} style={styles.svg}>
        <Line x1={axisLeft} y1={innerPad} x2={axisLeft} y2={height - innerPad} stroke="rgba(120,120,120,0.45)" strokeWidth={1} />
        <Line
          x1={axisLeft}
          y1={height - innerPad}
          x2={width - innerPad}
          y2={height - innerPad}
          stroke="rgba(120,120,120,0.45)"
          strokeWidth={1}
        />
        {prepared.ticks.map((t, idx) => (
          <React.Fragment key={`tick-${idx}`}>
            <Line
              x1={axisLeft}
              y1={t.y}
              x2={width - innerPad}
              y2={t.y}
              stroke="rgba(120,120,120,0.35)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText x={axisLeft - 6} y={t.y + 4} fontSize="10" fill="rgba(90,90,90,0.9)" textAnchor="end">
              {t.value}
            </SvgText>
          </React.Fragment>
        ))}
        {prepared.path ? <Polyline points={prepared.path} fill="none" stroke={color} strokeWidth={3} /> : null}
        {prepared.circles.map((c, idx) => (
          <Circle
            key={`c-${idx}`}
            cx={c.x}
            cy={c.y}
            r={selectedIdx === idx ? 5 : 3.5}
            fill={color}
            onPress={() => setSelectedIdx((prev) => (prev === idx ? null : idx))}
          />
        ))}
        {selected ? (
          <>
            <Line
              x1={selected.x}
              y1={innerPad}
              x2={selected.x}
              y2={height - innerPad}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3,4"
              opacity={0.7}
            />
            <Rect
              x={Math.max(axisLeft + 4, Math.min(selected.x - 20, width - innerPad - 42))}
              y={Math.max(innerPad, selected.y - 26)}
              width={42}
              height={18}
              rx={5}
              fill="rgba(17,24,39,0.92)"
            />
            <SvgText
              x={Math.max(axisLeft + 25, Math.min(selected.x + 1, width - innerPad - 21))}
              y={Math.max(innerPad + 13, selected.y - 13)}
              fontSize="10"
              fill="#fff"
              textAnchor="middle">
              {selected.v}
            </SvgText>
          </>
        ) : null}
      </Svg>
      <View style={styles.labelRow}>
        <ThemedText style={styles.label}>{first}</ThemedText>
        <ThemedText style={styles.label}>{mid}</ThemedText>
        <ThemedText style={styles.label}>{last}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  svg: {
    backgroundColor: 'rgba(120,120,120,0.04)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.30)',
  },
  metaRow: {
    width: 340,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    opacity: 0.8,
    fontWeight: '700',
  },
  labelRow: {
    width: 340,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    opacity: 0.8,
    fontWeight: '700',
  },
});
