"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** サーバー描画・ハイドレーション中は false。localStorage 由来の表示の出し分けに使う */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
