"use client";

import { useEffect, useState } from "react";
import { ExternalIcon } from "@/components/icons";
import { TmdbImage } from "@/components/TmdbImage";
import { fetchMovieFull } from "@/lib/client";
import { filmarksSearchUrl } from "@/lib/filmarks";
import { formatRuntime, formatShortDate, formatUsd, yearOf } from "@/lib/format";
import type { Movie, MovieFull, WatchProvider } from "@/types/movie";

type State = { id: number; data?: MovieFull; error?: string };

/** 詳細ビュー: スチル画像グリッド + 映画情報 */
export function MovieDetail({ movie }: { movie: Movie }) {
  const [state, setState] = useState<State | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchMovieFull(movie.id).then(
      (data) => alive && setState({ id: movie.id, data }),
      (e: Error) => alive && setState({ id: movie.id, error: e.message }),
    );
    return () => {
      alive = false;
    };
  }, [movie.id, retry]);

  const current = state?.id === movie.id ? state : null;
  const full = current?.data;
  const d = full?.detail;

  // このスクロール領域より外側の touch-action は効かないため、ここでも縦パンのみに限定する。
  // そうしないと横スワイプをブラウザの「戻る」ジェスチャーも拾ってしまう
  return (
    <div className="h-full touch-pan-y overflow-y-auto overscroll-x-none overscroll-y-contain bg-night">
      <div className="pt-16 pr-20 pb-[max(2rem,env(safe-area-inset-bottom))] pl-4">
        <h2 className="text-2xl leading-tight font-black">
          {movie.title}
          <span className="ml-2 text-base font-medium text-white/60">({yearOf(movie.release_date)})</span>
        </h2>
        {movie.original_title !== movie.title && (
          <p className="text-sm text-white/50">{movie.original_title}</p>
        )}

        <Stills full={full} movie={movie} />

        {current?.error && (
          <div className="mt-6 rounded-xl bg-card p-4 text-sm">
            <p className="text-white/70">{current.error}</p>
            <button
              type="button"
              className="mt-2 font-bold text-accent"
              onClick={() => setRetry((r) => r + 1)}
            >
              再読み込み
            </button>
          </div>
        )}

        {!current && <InfoSkeleton />}

        {full && d && (
          <>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Pill label="上映時間" value={d.runtime ? `${d.runtime}分` : "不明"} />
              <Pill label="公開日" value={formatShortDate(d.release_date)} />
              <Pill label="評価" value={d.vote_average ? `★ ${d.vote_average.toFixed(1)}` : "-"} />
            </dl>

            {d.genres.length > 0 && (
              <p className="mt-4 flex flex-wrap gap-1.5">
                {d.genres.map((g) => (
                  <span key={g.id} className="rounded-full border border-accent/60 px-3 py-1 text-xs text-accent">
                    {g.name}
                  </span>
                ))}
              </p>
            )}

            {(d.tagline || d.overview) && (
              <Section title="あらすじ">
                {d.tagline && <p className="mb-2 text-lg font-bold">「{d.tagline}」</p>}
                {d.overview && <p className="text-sm leading-relaxed text-white/80">{d.overview}</p>}
              </Section>
            )}

            <People full={full} />

            <Section title="作品データ">
              <dl className="divide-y divide-white/10 rounded-xl bg-card text-sm">
                <Row label="上映時間" value={formatRuntime(d.runtime)} />
                <Row
                  label="制作国"
                  value={d.production_countries.map((c) => c.name).join("、") || "不明"}
                />
                <Row
                  label="制作・配給"
                  value={d.production_companies.slice(0, 3).map((c) => c.name).join("、") || "不明"}
                />
                <Row label="予算" value={formatUsd(d.budget)} />
                <Row label="興行収入" value={formatUsd(d.revenue)} />
              </dl>
            </Section>

            <Providers full={full} />

            <a
              href={filmarksSearchUrl(d.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-night active:scale-[0.98]"
            >
              Filmarksで見る
              <ExternalIcon className="size-4" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function Stills({ full, movie }: { full?: MovieFull; movie: Movie }) {
  if (!full) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        <div className="col-span-2 aspect-video animate-pulse rounded-xl bg-card" />
        <div className="aspect-video animate-pulse rounded-lg bg-card" />
        <div className="aspect-video animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  const stills = full.images.backdrops.map((b) => b.file_path);
  if (!stills.length && movie.backdrop_path) stills.push(movie.backdrop_path);
  if (!stills.length) return null;

  return (
    <div className="mt-4 grid grid-cols-2 gap-1.5">
      {stills.map((path, i) => (
        <div
          key={path}
          className={`relative aspect-video overflow-hidden bg-card ${i === 0 ? "col-span-2 rounded-xl" : "rounded-lg"}`}
        >
          <TmdbImage
            path={path}
            size={i === 0 ? "w1280" : "w780"}
            alt={`${movie.title} のシーン ${i + 1}`}
            fill
            sizes={i === 0 ? "(max-width: 640px) 100vw, 640px" : "(max-width: 640px) 50vw, 320px"}
            className="object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}

function People({ full }: { full: MovieFull }) {
  const people = [
    ...full.credits.crew.map((c) => ({ ...c, role: "監督" })),
    ...full.credits.cast.map((c) => ({ ...c, role: c.character })),
  ];
  if (!people.length) return null;

  return (
    <Section title="監督・キャスト">
      <ul className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1">
        {people.map((p, i) => (
          <li key={`${p.id}-${i}`} className="w-20 shrink-0 text-center">
            <div className="relative mx-auto size-16 overflow-hidden rounded-full bg-card ring-1 ring-white/10">
              {p.profile_path ? (
                <TmdbImage path={p.profile_path} size="w185" alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-lg font-bold text-white/40">
                  {p.name.slice(0, 1)}
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-bold">{p.name}</p>
            <p className="line-clamp-1 text-[10px] text-white/50">{p.role}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Providers({ full }: { full: MovieFull }) {
  const wp = full.watchProviders;
  const groups: [string, WatchProvider[]][] = wp
    ? [
        ["見放題", wp.flatrate],
        ["レンタル", wp.rent],
        ["購入", wp.buy],
      ]
    : [];
  const visible = groups.filter(([, list]) => list.length);

  return (
    <Section title="配信サービス">
      {visible.length === 0 ? (
        <p className="text-sm text-white/50">国内の配信情報はありません</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(([label, list]) => (
            <div key={label}>
              <p className="mb-1.5 text-xs text-white/50">{label}</p>
              <ul className="flex flex-wrap gap-2">
                {list.map((p) => (
                  <li key={p.provider_id} className="flex items-center gap-2 rounded-lg bg-card py-1 pr-3 pl-1 text-xs">
                    {p.logo_path ? (
                      <span className="relative size-7 overflow-hidden rounded-md">
                        <TmdbImage path={p.logo_path} size="w342" alt="" fill sizes="28px" />
                      </span>
                    ) : (
                      <span className="size-1" />
                    )}
                    {p.provider_name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-white/30">配信情報提供: JustWatch</p>
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-2.5 text-xs font-bold tracking-widest text-white/50">{title}</h3>
      {children}
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-2 py-2.5">
      <dt className="text-[10px] text-white/50">{label}</dt>
      <dd className="mt-0.5 text-xs font-bold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-20 shrink-0 text-white/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      <div className="h-14 animate-pulse rounded-xl bg-card" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-card" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-card" />
    </div>
  );
}
