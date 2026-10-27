import Link from "next/link";
import { FilterForm } from "@/components/FilterForm";
import { LibraryIcon } from "@/components/icons";

export default function Home() {
  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8">
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-5xl font-black tracking-tight">
              Fil<span className="text-accent">Match</span>
            </h1>
            <Link
              href="/library"
              className="mt-2 flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold ring-1 ring-white/10"
            >
              <LibraryIcon className="size-4" />
              ライブラリ
            </Link>
          </div>
          <p className="mt-2 text-sm text-white/60">映画を、速く、気軽に、おしゃれに探そう。</p>
        </header>

        <FilterForm />

        <footer className="mt-auto pt-12 text-center text-[10px] leading-relaxed text-white/30">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
      </div>
    </main>
  );
}
