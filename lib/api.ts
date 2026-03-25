import { Platform } from 'react-native';

// API 단일 진입점 (앱에서는 여기만 import)
// - 환경변수 대신 고정 Base URL 사용
const API_BASE_URL = 'https://api.smartgauge.co.kr';
const API_TIMEOUT_MS = 20_000;

function getApiBaseUrl() {
  const noTrailing = API_BASE_URL.trim().replace(/\/+$/, '');
  if (Platform.OS === 'android' && /\/\/localhost(?=[:/]|$)/.test(noTrailing)) {
    return noTrailing.replace('//localhost', '//10.0.2.2');
  }
  return noTrailing;
}

async function readErrorMessage(res: Response) {
  const text = await res.text().catch(() => '');
  if (!text) return `HTTP ${res.status}`;
  try {
    const json = JSON.parse(text) as any;
    const detail = json?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((x) => (typeof x?.msg === 'string' ? x.msg : typeof x === 'string' ? x : null))
        .filter(Boolean)
        .join('\n');
      if (msg.trim()) return msg;
    }
    return text;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(
        `요청 시간이 초과되었어요. (${Math.round(API_TIMEOUT_MS / 1000)}s)\n접속 주소: ${getApiBaseUrl()}`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${msg}\n접속 주소: ${getApiBaseUrl()}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as T;
}

// ---------------------------
// App Version (Force Update)
// ---------------------------

export type ParkingAppVersionOut = {
  status: number;
  platform: 'android' | 'ios';
  current_version?: string | null;
  latest_version: string;
  min_supported_version: string;
  force_update: boolean;
  store_url?: string | null;
  message?: string | null;
};

export async function getParkingAppVersion(platform: 'android' | 'ios', currentVersion?: string | null) {
  const qs = new URLSearchParams({ platform });
  if (currentVersion) qs.set('current_version', currentVersion);
  return apiFetch<ParkingAppVersionOut>(`/parking/app/version?${qs.toString()}`);
}

// ---------------------------
// Parking UI Config (Popup)
// ---------------------------

export type ParkingUIConfig = {
  popup: {
    enabled: boolean;
    image_url: string | null;
    link_url: string | null;
    width_percent: number;
    height: number;
    resize_mode: 'contain' | 'cover' | 'stretch';
  };
};

export type ParkingUIConfigGetOut = { status: number; config: ParkingUIConfig; message?: string | null };

export async function getParkingUIConfig() {
  return apiFetch<ParkingUIConfigGetOut>('/parking/ui-config');
}

export async function updateParkingUIConfig(payload: { username: string; password: string; config: ParkingUIConfig }) {
  return apiFetch<ParkingUIConfigGetOut>('/parking/admin/ui-config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ---------------------------
// Auth API
// ---------------------------

export type ParkingUser = {
  id: number;
  username: string;
  signup_date: string;
  floor?: string | null;
  pillar_number?: string | null;
  grade?: 'normal' | 'owner';
};

export async function login(username: string, password: string) {
  return apiFetch<ParkingUser>('/parking/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function signup(username: string, password: string) {
  return apiFetch<ParkingUser>('/parking/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(username: string, password: string) {
  return apiFetch<ParkingUser>('/parking/auth/me', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function setUserFloor(floor: 'B2' | 'B3' | 'B4' | 'B5', username: string, password: string) {
  return apiFetch<ParkingUser>('/parking/auth/me/floor', {
    method: 'PUT',
    body: JSON.stringify({ floor, username, password }),
  });
}

export async function setUserPillarNumber(pillar_number: string | null, username: string, password: string) {
  return apiFetch<ParkingUser>('/parking/auth/me/pillar-number', {
    method: 'PUT',
    body: JSON.stringify({ pillar_number, username, password }),
  });
}

export type ParkingCountRow = {
  count_date: string;
  dau: number;
  total_count: number;
  daily_count: number;
};

export async function getParkingAdminCounts(username: string, password: string, limit = 30) {
  const qs = new URLSearchParams({
    username,
    password,
    limit: String(limit),
  });
  return apiFetch<ParkingCountRow[]>(`/parking/admin/counts?${qs.toString()}`);
}

export async function getParkingAdminCountDetail(username: string, password: string, countDate: string) {
  const qs = new URLSearchParams({
    username,
    password,
    count_date: countDate,
  });
  return apiFetch<ParkingCountRow>(`/parking/admin/counts/detail?${qs.toString()}`);
}

export type ParkingAdminUserRow = {
  username: string;
  floor: string | null;
  pillar_number: string | null;
  action_date: string | null;
  signup_date: string;
};

export async function getParkingAdminUsers(username: string, password: string, limit = 500) {
  const qs = new URLSearchParams({
    username,
    password,
    limit: String(limit),
  });
  return apiFetch<ParkingAdminUserRow[]>(`/parking/admin/users?${qs.toString()}`);
}

// ---------------------------
// Parking Location API
// (기존 `parking-api.ts` 로직을 그대로 이관)
// ---------------------------

export type ParkingLocation = {
  id: number;
  device_id: string;
  lot_id: string | null;
  floor: string | null;
  zone: string;
  spot: string | null;
  note: string | null;
  parked_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ParkingLocationSaveInput = {
  device_id: string;
  lot_id?: string | null;
  floor?: string | null;
  zone: string;
  spot?: string | null;
  note?: string | null;
  parked_at?: string | null;
};

export async function getCurrentParkingLocation(deviceId: string) {
  const qs = new URLSearchParams({ device_id: deviceId });
  return apiFetch<ParkingLocation | null>(`/parking/location?${qs.toString()}`);
}

export async function getParkingLocationHistory(deviceId: string, limit = 30) {
  const qs = new URLSearchParams({ device_id: deviceId, limit: String(limit) });
  return apiFetch<ParkingLocation[]>(`/parking/location/history?${qs.toString()}`);
}

export async function saveParkingLocation(input: ParkingLocationSaveInput) {
  return apiFetch<ParkingLocation>('/parking/location', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function clearParkingLocation(deviceId: string) {
  const qs = new URLSearchParams({ device_id: deviceId });
  return apiFetch<{ status: 'ok' }>(`/parking/location?${qs.toString()}`, { method: 'DELETE' });
}

