import { describe, expect, it } from "vitest";
import { insertInterleaved, removeUpcoming } from "@/lib/queue";

describe("insertInterleaved", () => {
  it("指定位置から1本おきに差し込む", () => {
    expect(insertInterleaved(["a", "b", "c", "d", "e"], 2, ["X", "Y"])).toEqual([
      "a", "b", "X", "c", "Y", "d", "e",
    ]);
  });

  it("後ろが足りなければ残りは続けて並べる", () => {
    expect(insertInterleaved(["a", "b", "c"], 2, ["X", "Y", "Z"])).toEqual(["a", "b", "X", "c", "Y", "Z"]);
  });

  it("位置がキューの長さを超えたら末尾に足す", () => {
    expect(insertInterleaved(["a"], 5, ["X", "Y"])).toEqual(["a", "X", "Y"]);
  });

  it("連続で差し込むと、前に差し込んだ映画とも交互になる", () => {
    const first = insertInterleaved(["a", "b", "c", "d"], 2, ["X1", "X2"]);
    expect(insertInterleaved(first, 2, ["Y1", "Y2"])).toEqual([
      "a", "b", "Y1", "X1", "Y2", "c", "X2", "d",
    ]);
  });
});

describe("removeUpcoming", () => {
  const queue = ["a", "X", "b", "X", "c", "X"];

  it("今の位置より後ろの、条件に合うものだけを取り除く", () => {
    expect(removeUpcoming(queue, 1, (s) => s === "X")).toEqual(["a", "X", "b", "c"]);
  });

  it("今表示している映画は残す", () => {
    expect(removeUpcoming(queue, 3, (s) => s === "X")).toEqual(["a", "X", "b", "X", "c"]);
  });
});
