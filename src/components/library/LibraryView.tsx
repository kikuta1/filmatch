"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { BackIcon, BookmarkIcon, CloseIcon, HeartIcon } from "@/components/icons";
import { TasteInsights } from "@/components/library/TasteInsights";
import { MovieDetail } from "@/components/MovieDetail";
import { TmdbImage } from "@/components/TmdbImage";
import { yearOf } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { useSavedMovies } from "@/lib/use-saved-movies";
import { useHistory } from "@/store/history";
import type { Movie } from "@/types/movie";

type Tab = "liked" | "bookmarked" | "taste";

export function LibraryView() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("liked");
  const [opened, setOpened] = useState<Movie | null>(null);
  const likedIds = useHistory((s) => s.likedMovieIds);
  const bookmarkedIds = useHistory((s) => s.bookmarkedMovieIds);
  const liked = useSavedMovies(likedIds);
  const bookmarked = useSavedMovies(bookmarkedIds);

  const tabs: { id: Tab; label: string }[] = [
    { id: "liked", label: `いいね ${hydrated ? likedIds.size : ""}` },
    { id: "bookmarked", label: `保存 ${hydrated ? bookmarkedIds.size : ""}` },
    { id: "taste", label: "傾向" },
  ];

  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto max-w-xl px-4 pb-10">
        <header className="sticky top-0 z-10 -mx-4 bg-night/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="トップへ戻る"
              className="grid size-10 place-items-center rounded-full bg-card"
            >
              <BackIcon className="size-5" />
            </Link>
            <h1 className="text-xl font-black">ライブラリ</h1>
          </div>
          <nav className="mt-3 flex gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 border-b-2 py-2.5 text-sm font-bold transition-colors ${
                  tab === t.id ? "border-accent text-white" : "border-transparent text-white/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="pt-5">
          {!hydrated ? null : tab === "taste" ? (
            <TasteInsights movies={liked.movies} />
          ) : (
            <PosterGrid
              {...(tab === "liked" ? liked : bookmarked)}
              total={tab === "liked" ? likedIds.size : bookmarkedIds.size}
              empty={
                tab === "liked"
                  ? "いいねした映画がまだありません"
                  : "保存した映画がまだありません"
              }
              onOpen={setOpened}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {opened && <DetailSheet key={opened.id} movie={opened} onClose={() => setOpened(null)} />}
      </AnimatePresence>
    </main>
  );
}

function PosterGrid({
  movies,
  loading,
  total,
  empty,
  onOpen,
}: {
  movies: Movie[];
  loading: boolean;
  total: number;
  empty: string;
  onOpen: (m: Movie) => void;
}) {
  const likedIds = useHistory((s) => s.likedMovieIds);
  const bookmarkedIds = useHistory((s) => s.bookmarkedMovieIds);

  if (!total) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <p className="text-sm text-white/50">{empty}</p>
        <Link href="/" className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold">
          映画を探す
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
      {movies.map((m) => (
        <li key={m.id}>
          <button type="button" onClick={() => onOpen(m)} className="block w-full text-left active:scale-[0.97]">
            <span className="relative block aspect-2/3 overflow-hidden rounded-lg bg-card ring-1 ring-white/10">
              {m.poster_path && (
                <TmdbImage
                  path={m.poster_path}
                  size="w342"
                  alt={`${m.title} のポスター`}
                  fill
                  sizes="(max-width: 640px) 33vw, 190px"
                  className="object-cover"
                />
              )}
              <span className="absolute top-1 right-1 flex gap-0.5">
                {likedIds.has(m.id) && (
                  <span className="grid size-5 place-items-center rounded-full bg-accent">
                    <HeartIcon filled className="size-3" />
                  </span>
                )}
                {bookmarkedIds.has(m.id) && (
                  <span className="grid size-5 place-items-center rounded-full bg-black/60">
                    <BookmarkIcon filled className="size-3" />
                  </span>
                )}
              </span>
            </span>
            <span className="mt-1.5 line-clamp-1 text-xs font-bold">{m.title}</span>
            <span className="text-[10px] text-white/50">{yearOf(m.release_date)}</span>
          </button>
        </li>
      ))}
      {loading &&
        Array.from({ length: Math.max(0, total - movies.length) }, (_, i) => (
          <li key={`loading-${i}`} className="aspect-2/3 animate-pulse rounded-lg bg-card" />
        ))}
    </ul>
  );
}

/** 一覧から開く詳細。右スワイプか × で閉じる */
function DetailSheet({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    if (offset.x > 80 || velocity.x > 500) onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-night"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 36 }}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragEnd={onDragEnd}
    >
      <MovieDetail movie={movie} />
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
      >
        <CloseIcon className="size-5" />
      </button>
      <div className="absolute right-3 bottom-[max(1.75rem,env(safe-area-inset-bottom))]">
        <ActionBar movie={movie} />
      </div>
    </motion.div>
  );
}
