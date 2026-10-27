"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { filtersToParams } from "@/lib/recommend";
import { useHydrated } from "@/lib/use-hydrated";
import { useHistory } from "@/store/history";
import { DECADES, GENRES, type DecadeId } from "@/types/movie";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
        active
          ? "border-accent bg-accent text-white shadow-[0_0_16px_rgba(233,69,96,0.55)]"
          : "border-white/15 bg-card text-white/80 hover:border-white/40"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterForm() {
  const router = useRouter();
  const [genres, setGenres] = useState<number[]>([]);
  const [decade, setDecade] = useState<DecadeId | null>(null);
  const seenCount = useHistory((s) => s.seenMovieIds.size);
  const likedCount = useHistory((s) => s.likedMovieIds.size);
  const clearSeen = useHistory((s) => s.clearSeen);
  const hydrated = useHydrated();

  const toggleGenre = (id: number) =>
    setGenres((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const start = () => {
    router.push(`/explore?${filtersToParams({ genres, decade })}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 flex items-baseline justify-between text-sm font-bold tracking-wider text-white/60">
          ジャンル
          <span className="text-xs font-normal">複数選択可</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Chip key={g.id} active={genres.includes(g.id)} onClick={() => toggleGenre(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wider text-white/60">年代</h2>
        <div className="flex flex-wrap gap-2">
          {DECADES.map((d) => (
            <Chip
              key={d.id}
              active={decade === d.id}
              onClick={() => setDecade((cur) => (cur === d.id ? null : d.id))}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={start}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-black tracking-widest text-white shadow-[0_8px_32px_rgba(233,69,96,0.45)] transition active:scale-[0.98]"
        >
          探索開始
        </button>
        <p className="text-xs text-white/50">
          {genres.length === 0 && decade === null
            ? "未選択なら全ジャンル・全年代から探索します"
            : "選んだ条件で探索します"}
        </p>
        {hydrated && (
          <p className="text-xs text-white/40">
            いいね {likedCount} 件 ・ 表示済み {seenCount} 件
            {seenCount > 0 && (
              <>
                {" ・ "}
                <button type="button" onClick={clearSeen} className="underline hover:text-white/70">
                  表示履歴をリセット
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
