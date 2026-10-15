import { describe, it, expect } from 'vitest';
import { SimplexNoise3D } from '../src/procedural/SimplexNoise3D';

describe('SimplexNoise3D', () => {
  it('produces values within range [0, 1]', () => {
    for (let i = 0; i < 20; i++) {
      const v = SimplexNoise3D.noise(i * 0.1, i * 0.2, i * 0.3);
      expect(v).toBeGreaterThanOrEqual(0.0);
      expect(v).toBeLessThanOrEqual(1.0);
    }
  });
});
