export class TextureAtlasManager {
  readonly tilesPerRow: number;

  constructor(tilesPerRow = 4) {
    this.tilesPerRow = tilesPerRow;
  }

  getTileUvOffset(tileIndex: number): [number, number] {
    const col = tileIndex % this.tilesPerRow;
    const row = Math.floor(tileIndex / this.tilesPerRow);
    const step = 1.0 / this.tilesPerRow;
    return [col * step, row * step];
  }
}
