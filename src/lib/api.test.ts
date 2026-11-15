import { describe, expect, it } from "vitest";
import { parseFilters, parseId, parsePage } from "@/lib/api";

describe("parseId", () => {
  it("正の整数だけを受け付ける", () => {
    expect(parseId("550")).toBe(550);
    expect(parseId("abc")).toBeNull();
    expect(parseId("-1")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId("1234567890")).toBeNull();
  });
});

describe("parsePage", () => {
  it("未指定は null（ランダムページ）、不正値は undefined", () => {
    expect(parsePage(null)).toBeNull();
    expect(parsePage("")).toBeNull();
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBeUndefined();
    expect(parsePage("501")).toBeUndefined();
    expect(parsePage("x")).toBeUndefined();
  });
});

describe("parseFilters", () => {
  const parse = (query: string) => parseFilters(new URLSearchParams(query));

  it("ジャンルと年代を読み取る", () => {
    expect(parse("genres=28,12&decade=2020s")).toEqual({
      genres: [28, 12],
      decade: "2020s",
      matchAll: false,
    });
  });

  it("未指定なら全ジャンル・全年代", () => {
    expect(parse("")).toEqual({ genres: [], decade: null, matchAll: false });
  });

  it("match=all でジャンルの AND 検索になる", () => {
    expect(parse("genres=16,35&match=all")?.matchAll).toBe(true);
  });

  it("不正なジャンル・年代は null", () => {
    expect(parse("genres=28,abc")).toBeNull();
    expect(parse("genres=-1")).toBeNull();
    expect(parse("decade=1960s")).toBeNull();
  });
});
