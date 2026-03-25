import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getOrCreateDeviceId } from '@/device-id';
import {
  clearParkingLocation,
  getCurrentParkingLocation,
  getParkingLocationHistory,
  ParkingLocation,
  ParkingLocationSaveInput,
  saveParkingLocation,
} from '@/lib/api';

type ParkingContextValue = {
  deviceId: string | null;
  current: ParkingLocation | null;
  history: ParkingLocation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshCurrent: () => Promise<void>;
  refreshHistory: (limit?: number) => Promise<void>;
  save: (input: Omit<ParkingLocationSaveInput, 'device_id'>) => Promise<ParkingLocation>;
  clear: () => Promise<void>;
};

const ParkingContext = createContext<ParkingContextValue | null>(null);

const LAST_KEY = 'smartparking:parking:last';

export function ParkingProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [current, setCurrent] = useState<ParkingLocation | null>(null);
  const [history, setHistory] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [id, last] = await Promise.all([getOrCreateDeviceId(), AsyncStorage.getItem(LAST_KEY)]);
        if (!mounted) return;
        setDeviceId(id);
        if (last) {
          try {
            setCurrent(JSON.parse(last) as ParkingLocation);
          } catch {
            // ignore
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshCurrent = useCallback(async () => {
    if (!deviceId) return;
    setRefreshing(true);
    setError(null);
    try {
      const loc = await getCurrentParkingLocation(deviceId);
      setCurrent(loc);
      if (loc) await AsyncStorage.setItem(LAST_KEY, JSON.stringify(loc));
      else await AsyncStorage.removeItem(LAST_KEY);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [deviceId]);

  const refreshHistory = useCallback(
    async (limit = 30) => {
      if (!deviceId) return;
      setRefreshing(true);
      setError(null);
      try {
        const rows = await getParkingLocationHistory(deviceId, limit);
        setHistory(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRefreshing(false);
      }
    },
    [deviceId],
  );

  const save = useCallback(
    async (input: Omit<ParkingLocationSaveInput, 'device_id'>) => {
      if (!deviceId) throw new Error('deviceId not ready');
      setError(null);
      const saved = await saveParkingLocation({ device_id: deviceId, ...input });
      setCurrent(saved);
      await AsyncStorage.setItem(LAST_KEY, JSON.stringify(saved));
      return saved;
    },
    [deviceId],
  );

  const clear = useCallback(async () => {
    if (!deviceId) return;
    setError(null);
    await clearParkingLocation(deviceId);
    setCurrent(null);
    await AsyncStorage.removeItem(LAST_KEY);
    await refreshHistory();
  }, [deviceId, refreshHistory]);

  useEffect(() => {
    if (!deviceId) return;
    // 초기 로딩 시 백엔드에서 최신 상태로 동기화
    refreshCurrent();
    refreshHistory();
  }, [deviceId, refreshCurrent, refreshHistory]);

  const value = useMemo<ParkingContextValue>(
    () => ({
      deviceId,
      current,
      history,
      loading,
      refreshing,
      error,
      refreshCurrent,
      refreshHistory,
      save,
      clear,
    }),
    [deviceId, current, history, loading, refreshing, error, refreshCurrent, refreshHistory, save, clear],
  );

  return <ParkingContext.Provider value={value}>{children}</ParkingContext.Provider>;
}

export function useParking() {
  const ctx = useContext(ParkingContext);
  if (!ctx) throw new Error('useParking must be used within ParkingProvider');
  return ctx;
}

