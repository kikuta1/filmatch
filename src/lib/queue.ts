/** 探索キュー（これから表示する映画の並び）の操作 */

/**
 * at の位置から1本おきに items を差し込む。
 * 例: queue=[a,b,c,d], at=2, items=[X,Y] → [a,b,X,c,Y,d]
 * 似た映画とランダムな出会いが交互に来るようにするため。
 */
export function insertInterleaved<T>(queue: T[], at: number, items: T[]): T[] {
  const pos = Math.min(Math.max(at, 0), queue.length);
  const head = queue.slice(0, pos);
  const tail = queue.slice(pos);
  const merged: T[] = [];
  let t = 0;
  for (const item of items) {
    merged.push(item);
    if (t < tail.length) merged.push(tail[t++]);
  }
  return [...head, ...merged, ...tail.slice(t)];
}

/**
 * index より後ろ（まだ表示していない映画）のうち、条件に合うものを取り除く。
 * 今表示している映画とそれより前は残すので、画面が急に変わらない。
 */
export function removeUpcoming<T>(queue: T[], index: number, shouldRemove: (item: T) => boolean): T[] {
  return queue.filter((item, i) => i <= index || !shouldRemove(item));
}
