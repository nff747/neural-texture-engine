export class Bc7TexturePacker {
  static readonly BLOCK_BYTES = 16;
  static readonly BLOCK_PIXELS = 16; // 4x4 texels

  static calculateCompressedSize(width: number, height: number): number {
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);
    return blocksX * blocksY * this.BLOCK_BYTES;
  }
}
