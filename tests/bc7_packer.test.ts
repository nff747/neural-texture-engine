import { describe, it, expect } from 'vitest';
import { Bc7TexturePacker } from '../src/compression/Bc7TexturePacker';

describe('Bc7TexturePacker', () => {
  it('computes 16 bytes per 4x4 texel block', () => {
    // 512x512 -> 128x128 blocks = 16384 blocks * 16 bytes = 262,144 bytes (1 byte/pixel)
    expect(Bc7TexturePacker.calculateCompressedSize(512, 512)).toBe(262144);
  });
});
