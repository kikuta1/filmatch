"use client";

import { useState } from "react";
import { formatCount } from "@/lib/format";
import { DECADES, GENRE_NAME, type Movie } from "@/types/movie";

/** 傾向の文章を出すのに必要ないいね数 */
const MIN_FOR_HEADLINE = 3;
const TOP_GENRES = 8;

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** レビュアー数の中央値から「どれくらい有名作が好きか」を言葉にする */
function popularityType(medianVotes: number) {
  if (medianVotes < 300) return { label: "隠れた名作ハンター", note: "知る人ぞ知る作品が好み" };
  if (medianVotes < 3000) return { label: "バランス型", note: "話題作も隠れた名作も楽しむ" };
  return { label: "話題作派", note: "多くの人に観られた作品が好み" };
}

function decadeOf(date: string) {
  return DECADES.find((d) => date >= d.from && date <= d.to)?.id;
}

export function TasteInsights({ movies }: { movies: Movie[] }) {
  if (!movies.length) {
    return (
      <p className="py-20 text-center text-sm text-white/50">
        いいねした映画がまだありません。
        <br />
        探索画面でいいねすると、あなたの好みの傾向がここに表示されます。
      </p>
    );
  }

  const genreCounts = new Map<number, number>();
  for (const m of movies) for (const g of m.genre_ids) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  const genres = [...genreCounts]
    .filter(([id]) => GENRE_NAME.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRES)
    .map(([id, count]) => ({ name: GENRE_NAME.get(id)!, count }));

  const decades = DECADES.map((d) => ({
    id: d.id,
    label: d.id === "older" ? "〜70s" : d.label.replace(/^19|^20/, "’"),
    fullLabel: d.label,
    count: movies.filter((m) => decadeOf(m.release_date) === d.id).length,
  }));

  const rated = movies.filter((m) => m.vote_count > 0);
  const avgRating = rated.length ? rated.reduce((s, m) => s + m.vote_average, 0) / rated.length : 0;
  const medianVotes = median(movies.map((m) => m.vote_count));
  const type = popularityType(medianVotes);

  const topGenre = genres[0];
  const topDecade = [...decades].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-linear-to-br from-accent/25 to-card p-5 ring-1 ring-white/10">
        <p className="text-xs font-bold tracking-widest text-white/60">あなたの映画の好み</p>
        {movies.length >= MIN_FOR_HEADLINE && topGenre ? (
          <p className="mt-2 text-xl leading-snug font-black">
            「{topGenre.name}」×「{topDecade.fullLabel}」の
            <br />
            {type.label}
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/80">
            あと {MIN_FOR_HEADLINE - movies.length} 本いいねすると、好みのタイプを判定します
          </p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="いいね" value={`${movies.length}`} unit="本" />
        <StatTile label="平均評価" value={avgRating ? avgRating.toFixed(1) : "-"} unit="/ 10" />
        <StatTile label="レビュアー数" value={formatCount(Math.round(medianVotes))} unit="人 (中央値)" />
      </div>
      <p className="-mt-6 text-xs text-white/50">{type.note}（レビュアー数の中央値で判定）</p>

      <GenreBars genres={genres} total={movies.length} />
      <DecadeColumns decades={decades} />
    </div>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-card px-3 py-3">
      <p className="text-[10px] text-white/50">{label}</p>
      <p className="mt-1 text-2xl leading-none font-black tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] text-white/50">{unit}</p>
    </div>
  );
}

/** ジャンル別: 横棒（単一系列なので1色。値は棒の端に表示） */
function GenreBars({ genres, total }: { genres: { name: string; count: number }[]; total: number }) {
  const max = Math.max(...genres.map((g) => g.count), 1);
  return (
    <section>
      <h3 className="text-sm font-bold">好きなジャンル</h3>
      <p className="mb-3 text-xs text-white/50">いいねした {total} 本のうち、そのジャンルを含む本数</p>
      <ul className="flex flex-col gap-2.5">
        {genres.map((g) => (
          <li key={g.name} className="flex items-center gap-3 text-xs" title={`${g.name}: ${g.count}本`}>
            <span className="w-24 shrink-0 truncate text-white/80">{g.name}</span>
            <span className="relative h-2.5 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-accent"
                style={{ width: `${(g.count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-bold tabular-nums text-white/80">{g.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 年代別: 縦棒（年代は順序があるので左から古い順）。最大の棒だけ値を直接表示し、他はタップで表示 */
function DecadeColumns({
  decades,
}: {
  decades: { id: string; label: string; fullLabel: string; count: number }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...decades.map((d) => d.count), 1);
  const peak = decades.reduce((a, b) => (b.count > a.count ? b : a));
  const shown = decades.find((d) => d.id === active);

  return (
    <section>
      <h3 className="text-sm font-bold">好きな年代</h3>
      <p className="mb-3 h-4 text-xs text-white/50">
        {shown ? `${shown.fullLabel}: ${shown.count}本` : "棒をタップすると本数を表示"}
      </p>
      <div className="flex h-36 items-end gap-[2px] border-b border-white/15" role="img" aria-label="年代別のいいね数">
        {decades.map((d) => {
          const isPeak = d.id === peak.id && d.count > 0;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive((a) => (a === d.id ? null : d.id))}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(d.id)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              aria-label={`${d.fullLabel}: ${d.count}本`}
            >
              {isPeak && (
                <span className="mb-1 text-xs font-bold tabular-nums text-white/80">{d.count}</span>
              )}
              <span
                className={`w-3/5 rounded-t-[4px] bg-accent transition-opacity ${
                  active && active !== d.id ? "opacity-40" : ""
                }`}
                // 最大の棒の上に値ラベルを置く余白を残すため、全棒を同じ比率で 85% に収める
                style={{ height: `${(d.count / max) * 85}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {decades.map((d) => (
          <span key={d.id} className="flex-1 text-center text-[10px] text-white/50">
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>年代別のいいね数</caption>
        <tbody>
          {decades.map((d) => (
            <tr key={d.id}>
              <th>{d.fullLabel}</th>
              <td>{d.count}本</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
