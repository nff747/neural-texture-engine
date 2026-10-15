import { describe, it, expect } from 'vitest';
import { SsimEvaluator } from '../src/eval/SsimEvaluator';

describe('SsimEvaluator', () => {
  it('yields 1.0 on identical image arrays', () => {
    const img = new Float32Array([0.1, 0.5, 0.8, 0.9]);
    expect(SsimEvaluator.evaluate(img, img, 2, 2)).toBeCloseTo(1.0);
  });

  it('degrades smoothly on altered contrast/brightness', () => {
    const a = new Float32Array([0.2, 0.4, 0.6, 0.8]);
    const b = new Float32Array([0.1, 0.3, 0.5, 0.7]);
    const ssim = SsimEvaluator.evaluate(a, b, 2, 2);
    expect(ssim).toBeLessThan(1.0);
    expect(ssim).toBeGreaterThan(0.7);
  });
});
