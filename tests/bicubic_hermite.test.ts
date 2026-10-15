import { describe, it, expect } from 'vitest';
import { BicubicHermiteFilter } from '../src/filtering/BicubicHermiteFilter';

describe('BicubicHermiteFilter', () => {
  it('matches p1 at t=0 and p2 at t=1', () => {
    const p0 = 0.0, p1 = 10.0, p2 = 20.0, p3 = 30.0;
    expect(BicubicHermiteFilter.hermite(p0, p1, p2, p3, 0.0)).toBeCloseTo(10.0);
    expect(BicubicHermiteFilter.hermite(p0, p1, p2, p3, 1.0)).toBeCloseTo(20.0);
  });
});
