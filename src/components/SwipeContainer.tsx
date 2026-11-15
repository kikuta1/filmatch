"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { BackIcon, LibraryIcon } from "@/components/icons";
import { MovieCard, POSTER_SIZES, type Reason } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { TmdbImage } from "@/components/TmdbImage";
import { fetchMovieFull } from "@/lib/client";
import { fetchRecommendations, fetchSimilarPicks, type PoolEntry } from "@/lib/recommend";
import { useHistory } from "@/store/history";
import type { Filters, Movie } from "@/types/movie";

type View = "poster" | "detail";
type End = "empty" | "exhausted" | null;

/** 残りがこの件数以下になったら次のバッチを先読みする */
const PREFETCH_THRESHOLD = 3;
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 500;
const WHEEL_LOCK_MS = 700;
/** いいね直後に差し込む類似映画の数と位置（次の映画は先読み済みなので、その後ろ） */
const INJECT_COUNT = 2;
const INJECT_OFFSET = 2;
/** 詳細ビューを開いたときに履歴へ積む state のキー */
const DETAIL_STATE = "filmatchDetail";
/** 候補プールの上限（古いものから捨てる） */
const POOL_LIMIT = 100;

const slide = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%" }),
  center: { y: 0 },
  exit: (dir: number) => ({ y: dir > 0 ? "-100%" : "100%" }),
};

/** 縦スワイプ（映画切替）+ 横スワイプ（ビュー切替）制御と映画キューの管理 */
export function SwipeContainer({ filters }: { filters: Filters }) {
  const [queue, setQueue] = useState<Movie[]>([]);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("poster");
  const [direction, setDirection] = useState(1);
  const [end, setEnd] = useState<End>(null);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  /** いいねから差し込んだ映画 → 表示する理由（きっかけの映画・同じ監督） */
  const [reasons, setReasons] = useState<Record<number, Reason>>({});
  const loadingRef = useRef(false);
  const queueRef = useRef<Movie[]>([]);
  const indexRef = useRef(0);
  /** いいね直後の差し込みで使わなかった類似映画 */
  const poolRef = useRef<PoolEntry[]>([]);
  const wheelLockRef = useRef(0);

  const markSeen = useHistory((s) => s.markSeen);
  const clearSeen = useHistory((s) => s.clearSeen);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { seenMovieIds, likedMovieIds } = useHistory.getState();
      const batch = await fetchRecommendations({
        filters,
        likedIds: [...likedMovieIds],
        excludeIds: new Set([...seenMovieIds, ...queueRef.current.map((m) => m.id)]),
        pool: poolRef.current.map((e) => e.movie),
      });
      setMock(batch.mock);
      setError(null);
      // 読み込み中にいいねで差し込まれた映画と重複しないようにする
      const queued = new Set(queueRef.current.map((m) => m.id));
      const fresh = batch.movies.filter((m) => !queued.has(m.id));
      if (fresh.length) {
        queueRef.current = [...queueRef.current, ...fresh];
        setQueue(queueRef.current);
        // プールから使った映画は取り除き、きっかけのいいね映画を表示できるようにする
        const used = new Set(fresh.map((m) => m.id));
        const fromPool = poolRef.current.filter((e) => used.has(e.movie.id));
        poolRef.current = poolRef.current.filter((e) => !used.has(e.movie.id));
        if (fromPool.length) {
          setReasons((r) => ({
            ...r,
            ...Object.fromEntries(
              fromPool.map((e) => [e.movie.id, { seedTitle: e.seedTitle, director: e.director }]),
            ),
          }));
        }
      } else {
        setEnd(batch.empty ? "empty" : "exhausted");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      loadingRef.current = false;
    }
  }, [filters]);

  const injectSimilar = useCallback(
    async (liked: Movie) => {
      const { seenMovieIds } = useHistory.getState();
      const { picks, rest } = await fetchSimilarPicks({
        seed: liked,
        filters,
        excludeIds: new Set([...seenMovieIds, ...queueRef.current.map((m) => m.id)]),
        count: INJECT_COUNT,
      });
      // 取得中に他の経路で入った映画は除く
      const queued = new Set(queueRef.current.map((m) => m.id));

      // 差し込まなかった残りは候補プールへ（次のバッチの「似た映画」枠で使う）
      const pooled = new Set(poolRef.current.map((e) => e.movie.id));
      const additions = rest
        .filter((c) => !queued.has(c.movie.id) && !pooled.has(c.movie.id))
        .map((c) => ({ ...c, seedId: liked.id, seedTitle: liked.title }));
      poolRef.current = [...poolRef.current, ...additions].slice(-POOL_LIMIT);

      const freshPicks = picks.filter((c) => !queued.has(c.movie.id));
      if (!freshPicks.length) return;
      const fresh = freshPicks.map((c) => c.movie);
      const at = Math.min(indexRef.current + INJECT_OFFSET, queueRef.current.length);
      queueRef.current = [
        ...queueRef.current.slice(0, at),
        ...fresh,
        ...queueRef.current.slice(at),
      ];
      setQueue(queueRef.current);
      setReasons((r) => ({
        ...r,
        ...Object.fromEntries(
          freshPicks.map((c) => [c.movie.id, { seedTitle: liked.title, director: c.director }]),
        ),
      }));
      setEnd(null);
    },
    [filters],
  );

  // いいねが増えたら即座に類似映画を差し込む（ボタン・ダブルタップどちらの経路でも）
  useEffect(
    () =>
      useHistory.subscribe((state, prev) => {
        for (const id of state.likedMovieIds) {
          if (prev.likedMovieIds.has(id)) continue;
          const movie = queueRef.current.find((m) => m.id === id);
          if (movie) injectSimilar(movie);
        }
        // いいねを取り消したら、その映画由来の候補もプールから外す
        for (const id of prev.likedMovieIds) {
          if (state.likedMovieIds.has(id)) continue;
          poolRef.current = poolRef.current.filter((e) => e.seedId !== id);
        }
      }),
    [injectSimilar],
  );

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // 詳細ビューを履歴に1つ積み、ブラウザの「戻る」（ボタン・スワイプジェスチャー）で
  // ページを離れずにポスタービューへ戻れるようにする
  useEffect(() => {
    const inDetail = !!window.history.state?.[DETAIL_STATE];
    if (view === "detail" && !inDetail) {
      window.history.pushState({ ...window.history.state, [DETAIL_STATE]: true }, "");
    } else if (view === "poster" && inDetail) {
      window.history.back();
    }
  }, [view]);

  useEffect(() => {
    const onPopState = () => {
      if (!window.history.state?.[DETAIL_STATE]) setView("poster");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const current = queue[index] as Movie | undefined;
  const next = queue[index + 1] as Movie | undefined;

  useEffect(() => {
    if (current) markSeen(current.id);
    // 今と次の映画の詳細を先読みしておく（横スワイプ時に待たせない）
    for (const m of [current, next]) if (m) fetchMovieFull(m.id).catch(() => {});
    if (!end && !error && queue.length - index - 1 <= PREFETCH_THRESHOLD) loadMore();
  }, [current, next, index, queue.length, end, error, loadMore, markSeen]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (delta < 0 && index === 0) return;
      // キュー末尾の先は読み込み中カードとして1枚だけ進める
      if (delta > 0 && index >= queue.length) return;
      setDirection(delta);
      setIndex((i) => i + delta);
      setView("poster");
    },
    [index, queue.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") go(1);
      else if (e.key === "ArrowUp" || e.key === "k") go(-1);
      else if (e.key === "ArrowRight") setView("detail");
      else if (e.key === "ArrowLeft" || e.key === "Escape") setView("poster");
      else return;
      e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      // 詳細ビューではホイールは内容のスクロールに使う
      if (view !== "poster" || Math.abs(e.deltaY) < 30) return;
      const now = Date.now();
      if (now < wheelLockRef.current) return;
      wheelLockRef.current = now + WHEEL_LOCK_MS;
      go(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [go, view]);

  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    const vertical = Math.abs(offset.y) > Math.abs(offset.x);
    if (view === "poster" && vertical) {
      if (offset.y < -SWIPE_DISTANCE || velocity.y < -SWIPE_VELOCITY) go(1);
      else if (offset.y > SWIPE_DISTANCE || velocity.y > SWIPE_VELOCITY) go(-1);
    } else if (view === "poster") {
      if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) setView("detail");
    } else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) {
      setView("poster");
    }
  };

  const retry = () => {
    setError(null);
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-night select-none">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current?.id ?? `placeholder-${index}`}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
          drag={current ? (view === "poster" ? true : "x") : "y"}
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={onDragEnd}
          className="absolute inset-0"
        >
          {current ? (
            <>
              <motion.div
                className="flex h-full w-[200%]"
                animate={{ x: view === "poster" ? "0%" : "-50%" }}
                transition={{ type: "spring", stiffness: 320, damping: 36 }}
              >
                <div className="h-full w-1/2">
                  <MovieCard movie={current} priority reason={reasons[current.id]} />
                </div>
                <div className="h-full w-1/2">
                  <MovieDetail movie={current} />
                </div>
              </motion.div>
              <div className="absolute right-3 bottom-[max(1.75rem,env(safe-area-inset-bottom))] z-10">
                <ActionBar
                  movie={current}
                  detailOpen={view === "detail"}
                  onToggleDetail={() => setView((v) => (v === "poster" ? "detail" : "poster"))}
                />
              </div>
            </>
          ) : (
            <EndState end={end} error={error} onRetry={retry} onReset={clearSeen} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* 次のポスターを先に読み込んでおく（同じ sizes にしてブラウザキャッシュに乗せる） */}
      {next?.poster_path && (
        <div aria-hidden className="pointer-events-none absolute size-px overflow-hidden opacity-0">
          <TmdbImage path={next.poster_path} size="w500" alt="" fill sizes={POSTER_SIZES} loading="eager" />
        </div>
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-linear-to-b from-black/50 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-6">
        <Link
          href="/"
          aria-label="条件を変更"
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/30 backdrop-blur-md"
        >
          <BackIcon className="size-5" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums">
            {queue.length ? `${Math.min(index + 1, queue.length)} / ${queue.length}` : "- / -"}
          </span>
          <span className="text-[10px] text-white/60">
            {mock && <b className="mr-1 text-accent">DEMO</b>}
            {view === "poster" ? "↑ スワイプで次へ ・ ← で詳細" : "→ スワイプでポスターへ"}
          </span>
        </div>
        <Link
          href="/library"
          aria-label="ライブラリ"
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/30 backdrop-blur-md"
        >
          <LibraryIcon className="size-5" />
        </Link>
      </header>
    </div>
  );
}

function EndState({
  end,
  error,
  onRetry,
  onReset,
}: {
  end: End;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
}) {
  if (error) {
    return (
      <Center>
        <p className="text-white/80">{error}</p>
        <button type="button" onClick={onRetry} className="rounded-full bg-accent px-6 py-2.5 font-bold">
          再試行
        </button>
      </Center>
    );
  }
  if (end === "empty") {
    return (
      <Center>
        <p className="text-white/80">条件に合う映画が見つかりませんでした</p>
        <Link href="/" className="rounded-full bg-accent px-6 py-2.5 font-bold">
          条件を変える
        </Link>
      </Center>
    );
  }
  if (end === "exhausted") {
    return (
      <Center>
        <p className="text-white/80">この条件の映画はすべて表示済みです</p>
        <div className="flex gap-3">
          <Link href="/" className="rounded-full bg-card px-5 py-2.5 font-bold">
            条件を変える
          </Link>
          <button
            type="button"
            onClick={() => {
              onReset();
              location.reload();
            }}
            className="rounded-full bg-accent px-5 py-2.5 font-bold"
          >
            履歴をリセット
          </button>
        </div>
      </Center>
    );
  }
  return (
    <Center>
      <div className="size-10 animate-spin rounded-full border-4 border-white/15 border-t-accent" />
      <p className="text-sm text-white/60">映画を探しています…</p>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">{children}</div>;
}
