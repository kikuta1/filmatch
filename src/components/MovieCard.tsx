"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { TmdbImage } from "@/components/TmdbImage";
import { yearOf } from "@/lib/format";
import { useHistory } from "@/store/history";
import { GENRE_NAME, type Movie } from "@/types/movie";

export const POSTER_SIZES = "(max-width: 640px) 90vw, 500px";

/** いいねから差し込まれた理由。director があれば「同じ監督の作品」 */
export type Reason = { seedTitle: string; director?: string };

/** ポスタービュー: ポスター大表示 + 背景ブラー。ダブルタップでいいね */
export function MovieCard({
  movie,
  priority,
  reason,
}: {
  movie: Movie;
  priority?: boolean;
  /** いいねから差し込まれた映画の場合、その理由 */
  reason?: Reason;
}) {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(0);
  const like = useHistory((s) => s.likedMovieIds.has(movie.id));
  const toggleLike = useHistory((s) => s.toggleLike);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!like) toggleLike(movie);
      setBurst((b) => b + 1);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const poster = movie.poster_path!;
  const genres = movie.genre_ids.map((g) => GENRE_NAME.get(g)).filter(Boolean).slice(0, 3);

  return (
    <div className="relative h-full w-full overflow-hidden" onClick={onTap}>
      <TmdbImage
        path={poster}
        size="w342"
        alt=""
        fill
        sizes="342px"
        className="scale-125 object-cover opacity-60 blur-2xl"
      />
      <div className="absolute inset-0 bg-linear-to-b from-night/40 via-night/10 to-night" />

      <div className="relative flex h-full items-center justify-center px-6 pt-16 pb-40">
        <div className="relative aspect-2/3 h-full max-w-full overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <TmdbImage
            path={poster}
            size="w500"
            alt={`${movie.title} のポスター`}
            fill
            priority={priority}
            sizes={POSTER_SIZES}
            className="object-cover"
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 pr-20 pl-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        {reason && (
          <p className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-xs font-bold shadow-[0_0_16px_rgba(233,69,96,0.5)]">
            <HeartIcon filled className="size-3.5 shrink-0" />
            {reason.director ? (
              <span className="truncate">{reason.director} 監督の別作品</span>
            ) : (
              <>
                <span className="truncate">『{reason.seedTitle}』</span>
                <span className="-ml-1.5 shrink-0">が好きなあなたに</span>
              </>
            )}
          </p>
        )}
        <h2 className="text-2xl leading-tight font-black drop-shadow-lg">
          {movie.title}
          <span className="ml-2 text-lg font-medium text-white/70">({yearOf(movie.release_date)})</span>
        </h2>
        {movie.original_title !== movie.title && (
          <p className="mt-0.5 text-sm text-white/50">{movie.original_title}</p>
        )}
        {genres.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span key={g} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs backdrop-blur">
                {g}
              </span>
            ))}
          </p>
        )}
      </div>

      <AnimatePresence>
        {burst > 0 && (
          <motion.div
            key={burst}
            className="pointer-events-none absolute inset-0 grid place-items-center text-accent"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.3, 1], opacity: [0, 1, 1] }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.45 }}
            onAnimationComplete={() => setBurst(0)}
          >
            <HeartIcon filled className="size-32 drop-shadow-[0_0_24px_rgba(233,69,96,0.9)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
