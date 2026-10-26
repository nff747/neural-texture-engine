export class Bc6hTexturePacker {
  static readonly BLOCK_BYTES = 16;
  static readonly BLOCK_PIXELS = 16; // 4x4 texels

  /**
   * Calculates the compressed VRAM buffer footprint in bytes for a BC6H HDR texture.
   * BC6H stores 4x4 blocks of half-float (FP16) RGB values in 128 bits (16 bytes).
   * Uncompressed FP16 RGB (or RGBA) requires 48 or 64 bytes per 4x4 block,
   * yielding a 3:1 to 4:1 compression ratio for HDR environment probes.
   */
  static calculateCompressedSize(width: number, height: number): number {
    const blocksX = Math.ceil(Math.max(1, width) / 4);
    const blocksY = Math.ceil(Math.max(1, height) / 4);
    return blocksX * blocksY * this.BLOCK_BYTES;
  }

  /**
   * Computes the VRAM bandwidth savings ratio compared to raw FP16 RGBA texture data.
   */
  static computeCompressionRatio(width: number, height: number): number {
    const uncompressedBytes = width * height * 8; // 4 channels * 2 bytes (FP16)
    const compressedBytes = this.calculateCompressedSize(width, height);
    return uncompressedBytes > 0 ? uncompressedBytes / compressedBytes : 1.0;
  }
}
