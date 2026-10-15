import { describe, it, expect } from 'vitest';
import { MipmapGenerator } from '../src/sampling/MipmapGenerator';

describe('MipmapGenerator', () => {
  it('halves dimensions down to 1x1', () => {
    const levels = MipmapGenerator.computeMipLevels(16, 8);
    expect(levels).toEqual([
      { width: 8, height: 4 },
      { width: 4, height: 2 },
      { width: 2, height: 1 },
      { width: 1, height: 1 }
    ]);
  });
});
