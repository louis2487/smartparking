import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ParkingLocation } from '@/lib/api';
import { useParking } from '@/parking-provider';

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function Item({ item }: { item: ParkingLocation }) {
  return (
    <ThemedView style={styles.item}>
      <View style={styles.itemTop}>
        <ThemedText type="subtitle">
          {item.floor ? `${item.floor} ` : ''}
          {item.zone}
          {item.spot ? `-${item.spot}` : ''}
        </ThemedText>
        <ThemedText style={styles.time}>{formatWhen(item.parked_at)}</ThemedText>
      </View>
      {item.note ? <ThemedText style={styles.note}>{item.note}</ThemedText> : null}
      {item.is_active ? <ThemedText style={styles.active}>현재 위치</ThemedText> : null}
    </ThemedView>
  );
}

export default function HistoryScreen() {
  const { history, refreshing, error, refreshHistory } = useParking();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="title">기록</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>저장할 때마다 히스토리가 쌓입니다.</ThemedText>
        </View>
        <Button title="새로고침" variant="secondary" onPress={() => refreshHistory()} loading={refreshing} style={{ width: 110 }} />
      </View>

      {error ? (
        <ThemedView style={styles.errorBox}>
          <ThemedText style={styles.errorText}>서버 연결이 안 될 수 있어요.</ThemedText>
          <ThemedText style={styles.errorTextSmall}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      <FlatList
        data={history}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => <Item item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshHistory()} />}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <ThemedText type="subtitle">아직 기록이 없어요.</ThemedText>
            <ThemedText style={{ opacity: 0.8 }}>홈에서 위치를 저장하면 여기에서 확인할 수 있어요.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  list: {
    gap: 10,
    paddingBottom: 12,
  },
  item: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  time: {
    opacity: 0.8,
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    opacity: 0.9,
  },
  active: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(10,126,164,0.14)',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.35)',
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
