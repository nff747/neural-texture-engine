import { describe, it, expect } from 'vitest';
import { Bc6hTexturePacker } from '../src/compression/Bc6hTexturePacker';

describe('Bc6hTexturePacker', () => {
  it('computes exact compressed buffer byte size for power-of-two HDR textures', () => {
    // 512x512 texture: 128x128 blocks = 16,384 blocks * 16 bytes = 262,144 bytes (256 KB)
    const bytes = Bc6hTexturePacker.calculateCompressedSize(512, 512);
    expect(bytes).toBe(262144);

    // Uncompressed FP16 RGBA is 512 * 512 * 8 = 2,097,152 bytes (2 MB) -> 4:1 compression ratio
    const ratio = Bc6hTexturePacker.computeCompressionRatio(512, 512);
    expect(ratio).toBeCloseTo(8.0, 1); // 64 bytes uncompressed per block vs 16 bytes = 4:1 RGBA, 8:1 with FP32
  });

  it('handles non-multiple-of-4 block rounding', () => {
    // 5x5 requires 2x2 blocks = 4 blocks * 16 bytes = 64 bytes
    expect(Bc6hTexturePacker.calculateCompressedSize(5, 5)).toBe(64);
  });
});
