import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = {
  title: "ライブラリ | FilMatch",
};

export default function LibraryPage() {
  return <LibraryView />;
}
