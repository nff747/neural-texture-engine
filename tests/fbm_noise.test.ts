import { describe, it, expect } from 'vitest';
import { FbmNoiseOctaves } from '../src/procedural/FbmNoiseOctaves';

describe('FbmNoiseOctaves', () => {
  it('evaluates bounded fractal noise value', () => {
    const val = FbmNoiseOctaves.evaluate(1.5, 2.5, 4);
    expect(val).toBeGreaterThanOrEqual(0.0);
    expect(val).toBeLessThanOrEqual(1.0);
  });
});
