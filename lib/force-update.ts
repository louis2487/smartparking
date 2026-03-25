import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { compareSemver } from '@/lib/version';

export type ForceUpdateState = {
  visible: boolean;
  currentVersion?: string | null;
  latestVersion?: string | null;
  storeUrl?: string | null;
  message?: string | null;
};

type ForceUpdateExtra = {
  minVersion?: string;
  latestVersion?: string;
  message?: string;
  androidStoreUrl?: string;
  iosStoreUrl?: string;
};

function readExtra(): ForceUpdateExtra | null {
  const expoExtra = (Constants.expoConfig?.extra ?? null) as any;
  const manifestExtra = ((Constants as any).manifest?.extra ?? null) as any;
  const extra = expoExtra ?? manifestExtra;
  const cfg = (extra?.forceUpdate ?? null) as any;
  if (!cfg || typeof cfg !== 'object') return null;
  return cfg as ForceUpdateExtra;
}

function readCurrentVersion() {
  return (Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? null) as string | null;
}

export function getForceUpdateState(): ForceUpdateState {
  const cfg = readExtra();
  const currentVersion = readCurrentVersion();
  const minVersion = cfg?.minVersion ?? null;
  const latestVersion = cfg?.latestVersion ?? minVersion ?? null;
  const message = cfg?.message ?? null;

  const storeUrl =
    Platform.OS === 'android'
      ? (cfg?.androidStoreUrl ?? null)
      : Platform.OS === 'ios'
        ? (cfg?.iosStoreUrl ?? null)
        : null;

  const visible =
    !!minVersion && !!currentVersion ? compareSemver(currentVersion, minVersion) < 0 : !!minVersion && !currentVersion;

  return { visible, currentVersion, latestVersion, storeUrl, message };
}

