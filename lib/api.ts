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
  grade?: 'normal' | 'owner' | 'admin';
  role?: 'STUDENT' | 'CREATOR';
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

export async function checkParkingUserForPasswordReset(username: string) {
  return apiFetch<{ exists: boolean }>('/parking/auth/reset-password/check', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function resetParkingPassword(username: string, newPassword: string) {
  return apiFetch<{ status: 'ok' }>('/parking/auth/reset-password', {
    method: 'PUT',
    body: JSON.stringify({ username, new_password: newPassword }),
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

// ---------------------------
// JHR Role API
// ---------------------------

export type JhrRole = 'STUDENT' | 'CREATOR';

export type JhrRoleOut = {
  username: string;
  role: JhrRole;
};

export async function getJhrRole(username: string, password: string) {
  const qs = new URLSearchParams({ username, password });
  return apiFetch<JhrRoleOut>(`/jhr/role?${qs.toString()}`);
}

export async function setJhrRole(username: string, password: string, role: JhrRole) {
  return apiFetch<JhrRoleOut>('/jhr/role', {
    method: 'PUT',
    body: JSON.stringify({ username, password, role }),
  });
}

export type JhrClassStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type JhrEnrollStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type JhrClass = {
  id: number;
  title: string;
  description: string | null;
  price: string;
  capacity: number;
  current_count: number;
  start_date: string;
  end_date: string;
  status: JhrClassStatus;
  creator_user_id: number;
  created_at: string;
  updated_at: string;
  is_enrolled: boolean;
  my_enrollment_status: JhrEnrollStatus | null;
  my_enrollment_id: number | null;
};

export type JhrClassListOut = {
  items: JhrClass[];
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
};

export type JhrEnrollment = {
  id: number;
  user_id: number;
  username?: string | null;
  class_id: number;
  status: JhrEnrollStatus;
  applied_at: string;
  confirmed_at: string | null;
  canceled_at: string | null;
  class_title: string | null;
};

export async function getJhrClasses(
  username: string,
  password: string,
  status?: JhrClassStatus,
  page = 1,
  limit = 3,
) {
  const qs = new URLSearchParams({ username, password });
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  return apiFetch<JhrClassListOut>(`/jhr/classes?${qs.toString()}`);
}

export async function getJhrClassDetail(classId: number, username: string, password: string) {
  const qs = new URLSearchParams({ username, password });
  return apiFetch<JhrClass>(`/jhr/classes/${classId}?${qs.toString()}`);
}

export async function createJhrClass(
  username: string,
  password: string,
  payload: {
    title: string;
    description: string;
    price: number;
    capacity: number;
    start_date: string;
    end_date: string;
    status: JhrClassStatus;
  },
) {
  return apiFetch<JhrClass>('/jhr/classes', {
    method: 'POST',
    body: JSON.stringify({ username, password, ...payload }),
  });
}

export async function updateJhrClass(
  classId: number,
  username: string,
  password: string,
  payload: Partial<{
    title: string;
    description: string;
    price: number;
    capacity: number;
    start_date: string;
    end_date: string;
    status: JhrClassStatus;
  }>,
) {
  return apiFetch<JhrClass>(`/jhr/classes/${classId}`, {
    method: 'PUT',
    body: JSON.stringify({ username, password, ...payload }),
  });
}

export async function updateJhrClassStatus(
  classId: number,
  username: string,
  password: string,
  status: 'OPEN' | 'CLOSED',
) {
  return apiFetch<JhrClass>('/jhr/class-status/change', {
    method: 'PUT',
    body: JSON.stringify({ class_id: classId, username, password, status }),
  });
}

export async function createJhrEnrollment(username: string, password: string, classId: number) {
  return apiFetch<JhrEnrollment>('/jhr/enrollments', {
    method: 'POST',
    body: JSON.stringify({ username, password, class_id: classId }),
  });
}

export async function confirmJhrEnrollment(username: string, password: string, enrollmentId: number) {
  return apiFetch<JhrEnrollment>('/jhr/enrollments/confirm', {
    method: 'PUT',
    body: JSON.stringify({ username, password, enrollment_id: enrollmentId }),
  });
}

export async function cancelJhrEnrollment(username: string, password: string, enrollmentId: number) {
  return apiFetch<JhrEnrollment>('/jhr/enrollments/cancel', {
    method: 'PUT',
    body: JSON.stringify({ username, password, enrollment_id: enrollmentId }),
  });
}

export async function getMyJhrEnrollments(username: string, password: string) {
  const qs = new URLSearchParams({ username, password });
  return apiFetch<JhrEnrollment[]>(`/jhr/enrollments/me?${qs.toString()}`);
}

export async function getJhrClassStudents(classId: number, username: string, password: string) {
  const qs = new URLSearchParams({ username, password });
  return apiFetch<JhrEnrollment[]>(`/jhr/classes/${classId}/students?${qs.toString()}`);
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

// ---------------------------
// Parking Posts (Notice)
// ---------------------------

export const PARKING_NOTICE_POST_TYPE = 11;

export type ParkingPost = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  status?: 'published' | 'closed';
  author?: {
    id: number;
    username: string;
  };
  post_type?: number;
};

export type ParkingPostsOut = {
  items: ParkingPost[];
  next_cursor: string | null;
};

export async function getParkingPosts(opts?: { status?: 'published' | 'closed'; limit?: number }) {
  const qs = new URLSearchParams();
  if (opts?.status) qs.set('status', opts.status);
  if (typeof opts?.limit === 'number') qs.set('limit', String(opts.limit));
  const query = qs.toString();
  const path = `/parking/posts/type/${PARKING_NOTICE_POST_TYPE}${query ? `?${query}` : ''}`;
  return apiFetch<ParkingPostsOut>(path);
}

export async function getParkingPost(postId: number) {
  return apiFetch<ParkingPost>(`/parking/posts/${postId}`);
}

export async function updateParkingPost(
  postId: number,
  payload: { title?: string; content?: string; status?: 'published' | 'closed'; image_url?: string | null },
) {
  return apiFetch<ParkingPost>(`/parking/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteParkingPost(postId: number) {
  return apiFetch<{ ok: boolean; message?: string }>(`/parking/posts/${postId}`, {
    method: 'DELETE',
  });
}

export async function createParkingPost(
  username: string,
  payload: { title: string; content: string; status?: 'published' | 'closed'; image_url?: string | null },
) {
  const primaryUsername = (username || '').trim() || '관리자';
  const fallbackUsername = '관리자';
  const parkingPath = `/parking/posts/${encodeURIComponent(primaryUsername)}/type/${PARKING_NOTICE_POST_TYPE}`;
  try {
    return await apiFetch<ParkingPost>(parkingPath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid username/i.test(msg) && primaryUsername !== fallbackUsername) {
      return apiFetch<ParkingPost>(`/parking/posts/${encodeURIComponent(fallbackUsername)}/type/${PARKING_NOTICE_POST_TYPE}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    // 서버에 /parking/posts 라우트가 아직 반영되지 않은 구버전 대비 폴백
    if (msg.includes('404') || /not found/i.test(msg)) {
      return apiFetch<ParkingPost>(`/community/posts/${encodeURIComponent(primaryUsername)}/type/${PARKING_NOTICE_POST_TYPE}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    throw e;
  }
}

export type ParkingPostComment = {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
  parent_id?: number | null;
  is_deleted?: boolean;
};

export type ParkingPostCommentsOut = {
  items: ParkingPostComment[];
  next_cursor: string | null;
};

export async function getParkingPostComments(postId: number, cursor?: string, limit = 20) {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', String(limit));
  return apiFetch<ParkingPostCommentsOut>(`/parking/posts/${postId}/comments?${qs.toString()}`);
}

export async function createParkingPostComment(postId: number, username: string, content: string, parent_id?: number | null) {
  const primaryUsername = (username || '').trim() || '관리자';
  const fallbackUsername = '관리자';
  try {
    return await apiFetch<ParkingPostComment>(`/parking/posts/${postId}/comments/${encodeURIComponent(primaryUsername)}`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parent_id ?? null }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid username/i.test(msg) && primaryUsername !== fallbackUsername) {
      return apiFetch<ParkingPostComment>(`/parking/posts/${postId}/comments/${encodeURIComponent(fallbackUsername)}`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_id: parent_id ?? null }),
      });
    }
    throw e;
  }
}

export async function updateParkingPostComment(commentId: number, username: string, content: string) {
  return apiFetch<ParkingPostComment>(`/parking/comments/${commentId}/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function deleteParkingPostComment(commentId: number, username: string) {
  return apiFetch<{ ok?: boolean }>(`/parking/comments/${commentId}/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });
}

