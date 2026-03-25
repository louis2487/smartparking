export function compareSemver(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na === nb) continue;
    return na < nb ? -1 : 1;
  }
  return 0;
}

function parseSemver(v: string) {
  const raw = v.trim().replace(/^v/i, '');
  const main = raw.split(/[+-]/)[0] ?? '';
  const parts = main
    .split('.')
    .map((x) => Number.parseInt(x, 10))
    .filter((n) => Number.isFinite(n));
  return parts.length ? parts : [0];
}

