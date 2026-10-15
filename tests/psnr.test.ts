import { describe, it, expect } from 'vitest';
import { PsnrEvaluator } from '../src/eval/PsnrEvaluator';

describe('PsnrEvaluator', () => {
  it('returns Infinity on zero MSE', () => {
    const a = new Float32Array([0.5, 0.5]);
    expect(PsnrEvaluator.evaluate(a, a)).toBe(Infinity);
  });

  it('computes known decibel noise level', () => {
    const a = new Float32Array([1.0, 1.0]);
    const b = new Float32Array([0.9, 0.9]); // diff = 0.1, mse = 0.01 -> 10 * log10(100) = 20 dB
    expect(PsnrEvaluator.evaluate(a, b)).toBeCloseTo(20.0, 3);
  });
});
