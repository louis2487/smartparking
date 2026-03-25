import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Floor = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

const FLOOR_BG: Record<Floor, string> = {
  B1: 'rgba(255,149,0,0.14)', // 주황
  B2: 'rgba(52,199,89,0.14)', // 초록
  B3: 'rgba(255,59,48,0.14)', // 빨강
  B4: 'rgba(0,122,255,0.14)', // 파랑
  B5: 'rgba(175,82,222,0.14)', // 보라
};

export function ParkingMap({
  floor,
  zone,
  onChangeFloor,
  onChangeZone,
}: {
  floor: Floor;
  zone: Zone | null;
  onChangeFloor: (f: Floor) => void;
  onChangeZone: (z: Zone) => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'background');
  const floorBg = FLOOR_BG[floor];

  const selectStyle = <T extends string>(value: T, current: T) => ({
    borderColor: value === current ? tint : 'rgba(120,120,120,0.35)',
    borderWidth: value === current ? 2 : StyleSheet.hairlineWidth,
  });

  const stroke = 'rgba(40,40,40,0.75)';
  const dash = 'rgba(40,40,40,0.35)';

  const zoneFill = (z: Zone) => (zone === z ? 'rgba(10,126,164,0.22)' : 'rgba(120,120,120,0.08)');
  const zoneStroke = (z: Zone) => (zone === z ? tint : 'rgba(120,120,120,0.45)');

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle">층/구역 선택</ThemedText>
      <ThemedText style={styles.help}>도면에서 구역(A~G)을 터치해 선택하고, 층(B1~B5)을 저장하세요.</ThemedText>

      <View style={styles.row}>
        {(['B1', 'B2', 'B3', 'B4', 'B5'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => onChangeFloor(f)}
            style={({ pressed }) => [
              styles.pill,
              selectStyle(f, floor),
              { opacity: pressed ? 0.9 : 1, backgroundColor: floor === f ? tint : 'rgba(120,120,120,0.12)' },
            ]}>
            <ThemedText style={{ color: floor === f ? '#fff' : text, fontWeight: '800' }}>{f}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapWrap}>
        <Svg viewBox="0 0 1000 750" preserveAspectRatio="xMidYMid meet" style={styles.mapSvg}>
          <Rect x={0} y={0} width={1000} height={750} fill={bg} />
          {/* 선택 층에 따른 배경 색상 */}
          <Rect x={0} y={0} width={1000} height={750} fill={floorBg} />

          {/* 외곽 프레임 */}
          <Path
            d={[
              // (40,30)~(960,720) + 좌측하단 ㄱ자 노치: (320,420)
              'M 66 30',
              'H 934',
              'Q 960 30 960 56',
              'V 694',
              'Q 960 720 934 720',
              'H 320',
              'V 485',
              'H 40',
              'V 56',
              'Q 40 30 66 30',
              'Z',
            ].join(' ')}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 건물 윤곽(참고용) */}
          <G>
            {/* 103동 */}
            <Rect
              x={100}
              y={160}
              width={150}
              height={170}
              rx={16}
              ry={16}
              fill="rgba(255,255,255,0.04)"
              stroke={dash}
              strokeWidth={5}
            />
            <SvgText x={175} y={250} fontSize={28} fontWeight="800" fill={stroke} textAnchor="middle">
              103
            </SvgText>

            {/* 101/102동 윤곽 */}
            <Rect
              x={565}
              y={160}
              width={150}
              height={170}
              rx={14}
              ry={14}
              fill="rgba(255,255,255,0.02)"
              stroke={dash}
              strokeWidth={4}
            />
            <Rect
              x={565}
              y={410}
              width={150}
              height={170}
              rx={14}
              ry={14}
              fill="rgba(255,255,255,0.02)"
              stroke={dash}
              strokeWidth={4}
            />
            <SvgText x={640} y={250} fontSize={28} fontWeight="800" fill={stroke} textAnchor="middle">
              101
            </SvgText>
            <SvgText x={640} y={500} fontSize={28} fontWeight="800" fill={stroke} textAnchor="middle">
              102
            </SvgText>


          
          </G>

          {/* A: 상단 벽 주차 */}
          <G>
            <Rect
              x={40}
              y={30}
              width={920}
              height={65}
              rx={22}
              ry={22}
              fill={zoneFill('A')}
              stroke={zoneStroke('A')}
              strokeWidth={6}
              onPress={() => onChangeZone('A')}
            />
            {/* A 배지(구역 표시): 선택 테두리도 함께 위로 */}
            <SvgText
              x={520}
              y={65}
              fontSize={40}
              fontWeight="900"
              fill={stroke}
              textAnchor="middle"
              alignmentBaseline="middle"
              onPress={() => onChangeZone('A')}>
              A
            </SvgText>
          </G>

          {/* B: 우측 벽 주차 */}
          <G>
            <Rect
              x={900}
              y={30}
              width={60}
              height={690}
              rx={22}
              ry={22}
              fill={zoneFill('B')}
              stroke={zoneStroke('B')}
              strokeWidth={6}
              onPress={() => onChangeZone('B')}
            />
            <SvgText x={950} y={415} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle" transform="rotate(90 950 380)">
              B
            </SvgText>
          </G>

          {/* C: 하단 벽 주차 */}
          <G>
            <Rect
              x={320}
              y={665}
              width={640}
              height={55}
              rx={22}
              ry={22}
              fill={zoneFill('C')}
              stroke={zoneStroke('C')}
              strokeWidth={6}
              onPress={() => onChangeZone('C')}
            />
            <SvgText x={640} y={705} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle">
              C
            </SvgText>
          </G>

          {/* D: 101·102동 사이 주차 */}
          <G>
            <Rect
              x={540}
              y={130}
              width={200}
              height={480}
              rx={16}
              ry={16}
              fill={zoneFill('D')}
              stroke={zoneStroke('D')}
              strokeWidth={6}
              onPress={() => onChangeZone('D')}
            />
            <SvgText x={640} y={385} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle">
              D
            </SvgText>
          </G>

          {/* G: 103동 우측 벽 주차 */}
          <G>
            <Rect
              x={320}
              y={150}
              width={60}
              height={210}
              rx={35}
              ry={35}
              fill={zoneFill('G')}
              stroke={zoneStroke('G')}
              strokeWidth={6}
              onPress={() => onChangeZone('G')}
            />
            <SvgText x={350} y={265} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle">
              G
            </SvgText>
          </G>

          {/* F: 103동 하단 주차 */}
          <G>
            <Rect
              x={40}
              y={425}
              width={280}
              height={60}
              rx={42}
              ry={42}
              fill={zoneFill('F')}
              stroke={zoneStroke('F')}
              strokeWidth={6}
              onPress={() => onChangeZone('F')}
            />
            <SvgText x={180} y={470} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle">
              F
            </SvgText>
          </G>

          {/* E: 중앙 수직 주차 (G에서 아래로) */}
          <G>
            <Rect
              x={320}
              y={480}
              width={60}
              height={240}
              rx={42}
              ry={42}
              fill={zoneFill('E')}
              stroke={zoneStroke('E')}
              strokeWidth={6}
              onPress={() => onChangeZone('E')}
            />
            <SvgText x={350} y={605} fontSize={40} fontWeight="900" fill={stroke} textAnchor="middle">
              E
            </SvgText>
          </G>
        </Svg>
      </View>

      <View style={styles.zoneRow}>
        {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((z) => {
          const selected = zone === z;
          return (
            <Pressable
              key={z}
              onPress={() => onChangeZone(z)}
              style={({ pressed }) => [
                styles.zoneChip,
                {
                  borderColor: selected ? tint : 'rgba(120,120,120,0.35)',
                  backgroundColor: selected ? tint : 'rgba(120,120,120,0.12)',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}>
              <ThemedText style={{ color: selected ? '#fff' : text, fontWeight: '800' }}>{z}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText style={styles.selected}>
        선택됨: {floor} {zone ? `${zone} 구역` : '구역 미선택'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
  },
  help: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  mapSvg: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  zoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  zoneChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selected: {
    opacity: 0.8,
  },
});

