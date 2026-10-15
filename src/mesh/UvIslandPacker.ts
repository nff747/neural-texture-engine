export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class UvIslandPacker {
  static packRow(rects: { w: number; h: number }[], maxWidth: number): Rect[] {
    const placed: Rect[] = [];
    let curX = 0, curY = 0, rowH = 0;

    for (const r of rects) {
      if (curX + r.w > maxWidth) {
        curX = 0;
        curY += rowH;
        rowH = 0;
      }
      placed.push({ x: curX, y: curY, w: r.w, h: r.h });
      curX += r.w;
      rowH = Math.max(rowH, r.h);
    }
    return placed;
  }
}
