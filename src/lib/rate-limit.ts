/**
 * IP アドレスベースのスライディングウィンドウ Rate Limiter（インメモリ）。
 * 単一サーバー前提の MVP 実装。複数インスタンス構成では Redis 等に置き換える。
 */
export const RATE_LIMIT = 120;
export const WINDOW_MS = 60_000;

const hits = new Map<string, number[]>();

export function rateLimit(key: string, now = Date.now()) {
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) sweep(windowStart);
  return { ok: true, remaining: RATE_LIMIT - recent.length, retryAfterSec: 0 };
}

function sweep(windowStart: number) {
  for (const [key, times] of hits) {
    if (times[times.length - 1] <= windowStart) hits.delete(key);
  }
}
