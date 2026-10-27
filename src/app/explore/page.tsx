import { Suspense } from "react";
import { ExploreClient } from "./ExploreClient";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-night" />}>
      <ExploreClient />
    </Suspense>
  );
}
