const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1534 → "1.5k" */
export function formatCount(n: number) {
  return compact.format(n).toLowerCase();
}

export function formatRating(n: number) {
  return n ? n.toFixed(1) : "-";
}

export function formatUsd(n: number) {
  return n > 0 ? usd.format(n) : "不明";
}

export function formatRuntime(min: number | null) {
  if (!min) return "不明";
  const h = Math.floor(min / 60);
  return h ? `${min}分（${h}時間${min % 60}分）` : `${min}分`;
}

/** "2011-01-15" → "2011/1/15" */
export function formatShortDate(date: string) {
  if (!date) return "不明";
  return date.split("-").map(Number).join("/");
}

export function yearOf(date: string) {
  return date ? date.slice(0, 4) : "----";
}
