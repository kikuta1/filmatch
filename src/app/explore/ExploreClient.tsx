"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SwipeContainer } from "@/components/SwipeContainer";
import { findDecade, type Filters } from "@/types/movie";

export function ExploreClient() {
  const params = useSearchParams();
  const key = params.toString();

  const filters = useMemo<Filters>(() => {
    const genres = (params.get("genres") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    return { genres, decade: findDecade(params.get("decade"))?.id ?? null };
  }, [params]);

  // 条件が変わったらキューを作り直す
  return <SwipeContainer key={key} filters={filters} />;
}
