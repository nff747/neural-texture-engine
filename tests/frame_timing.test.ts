import { describe, it, expect } from 'vitest';
import { GpuFrameTiming } from '../src/telemetry/GpuFrameTiming';

describe('GpuFrameTiming', () => {
  it('averages pass execution times', () => {
    const profiler = new GpuFrameTiming();
    profiler.record('espcn_upscale', 2.0);
    profiler.record('espcn_upscale', 4.0);
    expect(profiler.getAverageDuration('espcn_upscale')).toBe(3.0);
  });
});
