export class AstcBlockLayout {
  static getCompressionRatio(blockW: number, blockH: number): number {
    const texelsPerBlock = blockW * blockH;
    const uncompressedBytes = texelsPerBlock * 4; // RGBA8
    const astcBlockBytes = 16;
    return uncompressedBytes / astcBlockBytes;
  }
}
