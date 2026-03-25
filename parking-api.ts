import { apiFetch } from '@/api-client';

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

