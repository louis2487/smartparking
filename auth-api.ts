import { apiFetch } from '@/api-client';

export type ParkingUser = {
  id: number;
  username: string;
  signup_date: string;
  floor?: string | null;
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

export async function setUserFloor(
  floor: 'B2' | 'B3' | 'B4' | 'B5',
  username: string,
  password: string,
) {
  return apiFetch<ParkingUser>('/parking/auth/me/floor', {
    method: 'PUT',
    body: JSON.stringify({ floor, username, password }),
  });
}

