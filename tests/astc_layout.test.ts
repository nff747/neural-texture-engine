import { describe, it, expect } from 'vitest';
import { AstcBlockLayout } from '../src/compression/AstcBlockLayout';

describe('AstcBlockLayout', () => {
  it('computes accurate VRAM compression multiplier', () => {
    expect(AstcBlockLayout.getCompressionRatio(4, 4)).toBe(4.0); // 16 texels -> 64 bytes / 16 = 4x
    expect(AstcBlockLayout.getCompressionRatio(8, 8)).toBe(16.0); // 64 texels -> 256 bytes / 16 = 16x
  });
});
