import { describe, it, expect } from 'vitest';
import { WorleyNoiseGenerator } from '../src/procedural/WorleyNoiseGenerator';

describe('WorleyNoiseGenerator', () => {
  it('generates non-negative distance field array', () => {
    const map = WorleyNoiseGenerator.generate(16, 16, 4);
    expect(map.length).toBe(256);
    for (let i = 0; i < map.length; i++) {
      expect(map[i]).toBeGreaterThanOrEqual(0);
    }
  });
});
