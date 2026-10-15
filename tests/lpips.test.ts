import { describe, it, expect } from 'vitest';
import { LpipsEmulatedMetric } from '../src/eval/LpipsEmulatedMetric';

describe('LpipsEmulatedMetric', () => {
  it('evaluates zero distance on matching feature vectors', () => {
    const f = new Float32Array([0.2, 0.4, 0.6]);
    expect(LpipsEmulatedMetric.computeDistance(f, f)).toBe(0);
  });
});
