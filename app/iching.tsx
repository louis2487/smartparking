import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';

type LineThrow = {
  throw: 6 | 7 | 8 | 9;
  from: 0 | 1;
  to: 0 | 1;
};

function getInitialThrows(): LineThrow[] {
  return [
    { throw: 8, from: 0, to: 0 },
    { throw: 8, from: 0, to: 0 },
    { throw: 8, from: 0, to: 0 },
    { throw: 8, from: 0, to: 0 },
    { throw: 8, from: 0, to: 0 },
    { throw: 8, from: 0, to: 0 },
  ];
}

function rollThrows(): LineThrow[] {
  // 아래(첫 줄)부터 위(여섯째 줄)까지 6/7/8/9 난수로 뽑습니다.
  // 6: 0 -> 1, 7: 1 -> 1, 8: 0 -> 0, 9: 1 -> 0
  const map = (t: 6 | 7 | 8 | 9): LineThrow => {
    if (t === 6) return { throw: 6, from: 0, to: 1 };
    if (t === 7) return { throw: 7, from: 1, to: 1 };
    if (t === 8) return { throw: 8, from: 0, to: 0 };
    return { throw: 9, from: 1, to: 0 };
  };

  const randThrow = (): 6 | 7 | 8 | 9 => (6 + Math.floor(Math.random() * 4)) as 6 | 7 | 8 | 9;
  return Array.from({ length: 6 }, () => map(randThrow()));
}

function toHexNumber(lines: (0 | 1)[]) {
  // bit0 = 아래줄, bit5 = 윗줄
  let n = 0;
  for (let i = 0; i < 6; i++) n |= (lines[i] ?? 0) << i;
  return n + 1; // 1~64
}

const trigramFromBottomBits = {
  '111': '乾',
  '110': '兌',
  '101': '離',
  '100': '震',
  '011': '巽',
  '010': '坎',
  '001': '艮',
  '000': '坤',
} as const;

const kingWenMap = {
  乾: { 乾: [1, '중천건'], 兌: [43, '택천쾌'], 離: [14, '화천대유'], 震: [34, '뇌천대장'], 巽: [9, '풍천소축'], 坎: [5, '수천수'], 艮: [26, '산천대축'], 坤: [11, '지천태'] },
  兌: { 乾: [10, '천택리'], 兌: [58, '중택태'], 離: [38, '화택규'], 震: [54, '뇌택귀매'], 巽: [61, '풍택중부'], 坎: [60, '수택절'], 艮: [41, '산택손'], 坤: [19, '지택림'] },
  離: { 乾: [13, '천화동인'], 兌: [49, '택화혁'], 離: [30, '중화리'], 震: [55, '뇌화풍'], 巽: [37, '풍화가인'], 坎: [63, '수화기제'], 艮: [22, '산화비'], 坤: [36, '지화명이'] },
  震: { 乾: [25, '천뢰무망'], 兌: [17, '택뢰수'], 離: [21, '화뢰서합'], 震: [51, '중뢰진'], 巽: [42, '풍뢰익'], 坎: [3, '수뢰둔'], 艮: [27, '산뢰이'], 坤: [24, '지뢰복'] },
  巽: { 乾: [44, '천풍구'], 兌: [28, '택풍대과'], 離: [50, '화풍정'], 震: [32, '뇌풍항'], 巽: [57, '중풍손'], 坎: [48, '수풍정'], 艮: [18, '산풍고'], 坤: [46, '지풍승'] },
  坎: { 乾: [6, '천수송'], 兌: [47, '택수곤'], 離: [64, '화수미제'], 震: [40, '뇌수해'], 巽: [59, '풍수환'], 坎: [29, '중수감'], 艮: [4, '산수몽'], 坤: [7, '지수사'] },
  艮: { 乾: [33, '천산돈'], 兌: [31, '택산함'], 離: [56, '화산려'], 震: [62, '뇌산소과'], 巽: [53, '풍산점'], 坎: [39, '수산건'], 艮: [52, '중산간'], 坤: [15, '지산겸'] },
  坤: { 乾: [12, '천지비'], 兌: [45, '택지췌'], 離: [35, '화지진'], 震: [16, '뇌지예'], 巽: [20, '풍지관'], 坎: [8, '수지비'], 艮: [23, '산지박'], 坤: [2, '중지곤'] },
} as const;

function mapBinaryToKingWen(baseBinaryTopToBottom: string) {
  // baseBinary는 윗->아랫. 주역은 아래->위로 읽으므로 재배열.
  const linesBottomToTop = baseBinaryTopToBottom.split('').reverse().join('');
  const lowerBits = linesBottomToTop.slice(0, 3); // 초효~삼효
  const upperBits = linesBottomToTop.slice(3, 6); // 사효~상효

  const lowerTri = trigramFromBottomBits[lowerBits as keyof typeof trigramFromBottomBits];
  const upperTri = trigramFromBottomBits[upperBits as keyof typeof trigramFromBottomBits];
  if (!lowerTri || !upperTri) return null;

  // 매핑 테이블은 [하괘][상괘] 형태입니다. (예: 하괘=坎, 상괘=乾 => 천수송(6))
  const hit = kingWenMap[lowerTri]?.[upperTri];
  if (!hit) return null;
  const [kingWenNo, name] = hit;

  return { kingWenNo, name, upperTri, lowerTri, baseBinary: baseBinaryTopToBottom, linesBottomToTop };
}

function lineText(v: 0 | 1) {
  // 너무 과하지 않게 "조금만" 길게
  return v ? '━━━' : '━   ━';
}

export default function IChingScreen() {
  const text = useThemeColor({}, 'text');
  const [throws, setThrows] = useState<LineThrow[]>(() => getInitialThrows());

  const baseLines = useMemo(() => throws.map((t) => t.from) as (0 | 1)[], [throws]);
  const changedLines = useMemo(() => throws.map((t) => t.to) as (0 | 1)[], [throws]);
  const throwsTopDown = useMemo(() => throws.slice().reverse(), [throws]); // 윗줄 -> 아랫줄

  const baseHexNumber = useMemo(() => toHexNumber(baseLines), [baseLines]);
  const changedHexNumber = useMemo(() => toHexNumber(changedLines), [changedLines]);

  const baseBinary = useMemo(() => baseLines.slice().reverse().join(''), [baseLines]);
  const changedBinary = useMemo(() => changedLines.slice().reverse().join(''), [changedLines]);
  const baseKingWen = useMemo(() => mapBinaryToKingWen(baseBinary), [baseBinary]);
  const changedKingWen = useMemo(() => mapBinaryToKingWen(changedBinary), [changedBinary]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title">주역 점</ThemedText>
          <ThemedText style={{ opacity: 0.75 }}>6·7·8·9를 6번 뽑아 본괘/변괘를 함께 표시합니다.</ThemedText>
        </View>

        <ThemedView style={styles.card}>
          <View style={styles.hexGrid}>
            <View style={styles.throwCol}>
              <ThemedText style={[styles.hexTitle, { textAlign: 'right', alignSelf: 'center' }]}>효</ThemedText>
              <View style={styles.hexBox}>
                {throwsTopDown.map((t, idx) => (
                  <ThemedText key={idx} style={[styles.throwText, { color: text }]}>
                    {t.throw}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.footerBox}>
                <ThemedText style={styles.footerPlaceholder}> </ThemedText>
                <ThemedText style={styles.footerPlaceholder}> </ThemedText>
              </View>
            </View>

            <View style={styles.hexCol}>
              <ThemedText style={[styles.hexTitle, { textAlign: 'right', alignSelf: 'center' }]}>본괘</ThemedText>
              <View style={styles.hexBox}>
                {throwsTopDown.map((t, idx) => (
                  <ThemedText key={idx} style={[styles.line, { color: text }]} numberOfLines={1}>
                    {lineText(t.from)}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.footerBox}>
                
                <ThemedText style={styles.hexName}>{baseKingWen?.name ?? '-'}</ThemedText>
              </View>
            </View>

            <View style={styles.hexCol}>
              <ThemedText style={[styles.hexTitle, { textAlign: 'right', alignSelf: 'center' }]}>변괘</ThemedText>
              <View style={styles.hexBox}>
                {throwsTopDown.map((t, idx) => (
                  <ThemedText key={idx} style={[styles.line, { color: text }]} numberOfLines={1}>
                    {lineText(t.to)}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.footerBox}>
                
                <ThemedText style={styles.hexName}>{changedKingWen?.name ?? '-'}</ThemedText>
              </View>
            </View>
          </View>

        
        </ThemedView>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="뽑기" onPress={() => setThrows(rollThrows())} style={{ flex: 1 }} />
          <Button
            title="초기화"
            variant="secondary"
            onPress={() => setThrows(getInitialThrows())}
            style={{ flex: 1 }}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 18,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(120,120,120,0.06)',
  },
  hexGrid: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  throwCol: {
    width: 34,
    gap: 8,
  },
  hexCol: {
    flex: 1,
    gap: 8,
  },
  hexTitle: {
    fontWeight: '900',
    opacity: 0.85,
  },
  hexBox: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 6,

  },
  footerBox: {
    gap: 4,
  },
  hexName: {
    alignSelf: 'center',
    fontSize: 16,
    lineHeight: 18,
    paddingVertical: 0,
  },
  footerPlaceholder: {
    opacity: 0,
  },
  line: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 22,
  },
  throwText: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
  },
});

