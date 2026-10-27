"use client";

import { motion } from "framer-motion";
import { BookmarkIcon, EyeIcon, HeartIcon, InfoIcon, StarIcon } from "@/components/icons";
import { formatCount, formatRating } from "@/lib/format";
import { useHistory } from "@/store/history";
import type { Movie } from "@/types/movie";

type Props = {
  movie: Movie;
  /** 省略すると詳細ボタンを出さない（ライブラリの詳細表示など） */
  detailOpen?: boolean;
  onToggleDetail?: () => void;
};

function RoundButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.8 }}
      animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`grid size-12 place-items-center rounded-full backdrop-blur-md transition-colors ${
        active
          ? "bg-accent text-white shadow-[0_0_20px_rgba(233,69,96,0.75)]"
          : "bg-black/35 text-white"
      }`}
    >
      {children}
    </motion.button>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-white drop-shadow" aria-label={label}>
      <div className="grid size-10 place-items-center rounded-full bg-black/35 backdrop-blur-md">
        {icon}
      </div>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

export function ActionBar({ movie, detailOpen, onToggleDetail }: Props) {
  const liked = useHistory((s) => s.likedMovieIds.has(movie.id));
  const bookmarked = useHistory((s) => s.bookmarkedMovieIds.has(movie.id));
  const toggleLike = useHistory((s) => s.toggleLike);
  const toggleBookmark = useHistory((s) => s.toggleBookmark);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-0.5">
        <RoundButton active={liked} label="いいね" onClick={() => toggleLike(movie)}>
          <HeartIcon filled={liked} className="size-6" />
        </RoundButton>
        <span className="text-xs font-bold drop-shadow">Good</span>
      </div>
      <Stat
        icon={<EyeIcon className="size-5" />}
        value={formatCount(movie.vote_count)}
        label={`レビュアー数 ${movie.vote_count}`}
      />
      <Stat
        icon={<StarIcon filled className="size-5 text-yellow-300" />}
        value={formatRating(movie.vote_average)}
        label={`評価平均 ${movie.vote_average}`}
      />
      <div className="flex flex-col items-center gap-0.5">
        <RoundButton active={bookmarked} label="ブックマーク" onClick={() => toggleBookmark(movie)}>
          <BookmarkIcon filled={bookmarked} className="size-6" />
        </RoundButton>
        <span className="text-xs font-bold drop-shadow">保存</span>
      </div>
      {onToggleDetail && (
        <RoundButton active={!!detailOpen} label="詳細を表示" onClick={onToggleDetail}>
          <InfoIcon className="size-6" />
        </RoundButton>
      )}
    </div>
  );
}
