import { Platform } from 'react-native';

function getApiBaseUrl() {
  const raw = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000').trim();
  const noTrailing = raw.replace(/\/+$/, '');
  if (Platform.OS === 'android' && /\/\/localhost(?=[:/]|$)/.test(noTrailing)) {
    return noTrailing.replace('//localhost', '//10.0.2.2');
  }
  return noTrailing;
}

function getTimeoutMs() {
  const raw = (process.env.EXPO_PUBLIC_API_TIMEOUT_MS || '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  // Railway/서버 콜드스타트 등 첫 요청이 느릴 수 있어 기본값을 넉넉히 둡니다.
  return 20_000;
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
  const timeoutMs = getTimeoutMs();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
        `요청 시간이 초과되었어요. (${Math.round(timeoutMs / 1000)}s)\n접속 주소: ${getApiBaseUrl()}`,
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

