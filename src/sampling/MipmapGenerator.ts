export class MipmapGenerator {
  static computeMipLevels(width: number, height: number): { width: number; height: number }[] {
    const levels: { width: number; height: number }[] = [];
    let w = width, h = height;
    while (w > 1 || h > 1) {
      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
      levels.push({ width: w, height: h });
    }
    return levels;
  }
}
