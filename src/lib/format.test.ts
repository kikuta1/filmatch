import { describe, expect, it } from "vitest";
import { formatCount, formatRating, formatRuntime, formatShortDate, formatUsd, yearOf } from "@/lib/format";

describe("format", () => {
  it("レビュアー数を短く表記する", () => {
    expect(formatCount(980)).toBe("980");
    expect(formatCount(1534)).toBe("1.5k");
  });

  it("評価が 0 のときは - にする", () => {
    expect(formatRating(7.25)).toBe("7.3");
    expect(formatRating(0)).toBe("-");
  });

  it("予算・興収が 0 のときは不明にする", () => {
    expect(formatUsd(0)).toBe("不明");
    expect(formatUsd(63_000_000)).toContain("6300");
  });

  it("上映時間を時間と分に分ける", () => {
    expect(formatRuntime(139)).toBe("139分（2時間19分）");
    expect(formatRuntime(45)).toBe("45分");
    expect(formatRuntime(null)).toBe("不明");
  });

  it("日付を短く表記する", () => {
    expect(formatShortDate("2011-01-15")).toBe("2011/1/15");
    expect(formatShortDate("")).toBe("不明");
    expect(yearOf("1999-10-15")).toBe("1999");
    expect(yearOf("")).toBe("----");
  });
});
