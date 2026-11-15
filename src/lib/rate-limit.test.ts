import { describe, expect, it } from "vitest";
import { RATE_LIMIT, WINDOW_MS, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("上限までは許可し、残り回数を減らしていく", () => {
    const now = 1_000_000;
    expect(rateLimit("ip-a", now)).toEqual({ ok: true, remaining: RATE_LIMIT - 1, retryAfterSec: 0 });
    expect(rateLimit("ip-a", now + 1).remaining).toBe(RATE_LIMIT - 2);
  });

  it("上限を超えたら拒否し、再試行までの秒数を返す", () => {
    const now = 2_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) expect(rateLimit("ip-b", now).ok).toBe(true);

    const denied = rateLimit("ip-b", now + 10_000);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterSec).toBe(50);
  });

  it("ウィンドウを過ぎた分は数えない（スライディングウィンドウ）", () => {
    const now = 3_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) rateLimit("ip-c", now);
    expect(rateLimit("ip-c", now + WINDOW_MS - 1).ok).toBe(false);
    expect(rateLimit("ip-c", now + WINDOW_MS).ok).toBe(true);
  });

  it("IP ごとに独立して数える", () => {
    const now = 4_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) rateLimit("ip-d", now);
    expect(rateLimit("ip-d", now).ok).toBe(false);
    expect(rateLimit("ip-e", now).ok).toBe(true);
  });
});
