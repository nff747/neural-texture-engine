import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebGPUCapabilityProfiler, WebGPUProfiler } from './WebGPUCapabilityProfiler';

  // @ts-ignore
  global.GPUBufferUsage = { STORAGE: 1, COPY_SRC: 2, COPY_DST: 4 };
describe('WebGPUProfiler', () => {
  const originalGPU = navigator.gpu;

  beforeEach(() => {
    // @ts-ignore
    navigator.gpu = {
      requestAdapter: vi.fn(),
    };
  });

  afterEach(() => {
    // @ts-ignore
    navigator.gpu = originalGPU;
    vi.restoreAllMocks();
  });

  it('should return webgl2 if navigator.gpu is undefined', async () => {
    // @ts-ignore
    delete navigator.gpu;
    const result = await WebGPUProfiler.profileCapability();
    expect(result.mode).toBe('webgl2');
    expect(result.computeTimeMs).toBe(Infinity);
  });

  it('should return webgl2 if requestAdapter returns null', async () => {
    (navigator.gpu.requestAdapter as any).mockResolvedValue(null);
    const result = await WebGPUProfiler.profileCapability();
    expect(result.mode).toBe('webgl2');
    expect(result.computeTimeMs).toBe(Infinity);
  });

  it('should gracefully degrade to webgl2 if compute takes > 16ms', async () => {
    const mockDevice = {
      createShaderModule: vi.fn(),
      createComputePipeline: vi.fn().mockReturnValue({ getBindGroupLayout: vi.fn() }),
      createBuffer: vi.fn().mockReturnValue({ destroy: vi.fn() }),
      createBindGroup: vi.fn(),
      createCommandEncoder: vi.fn().mockReturnValue({
        beginComputePass: vi.fn().mockReturnValue({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          dispatchWorkgroups: vi.fn(),
          end: vi.fn(),
        }),
        finish: vi.fn(),
      }),
      queue: {
        submit: vi.fn(),
        onSubmittedWorkDone: vi.fn().mockImplementation(async () => {
          // simulate 20ms delay
          const start = performance.now();
          while (performance.now() - start < 20) {
            // busy wait
          }
        }),
      },
      destroy: vi.fn(),
    };

    (navigator.gpu.requestAdapter as any).mockResolvedValue({
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    });

    const result = await WebGPUProfiler.profileCapability();
    expect(result.mode).toBe('webgl2');
    expect(result.computeTimeMs).toBeGreaterThan(16);
  });

  it('should use webgpu if compute takes <= 16ms', async () => {
    const mockDevice = {
      createShaderModule: vi.fn(),
      createComputePipeline: vi.fn().mockReturnValue({ getBindGroupLayout: vi.fn() }),
      createBuffer: vi.fn().mockReturnValue({ destroy: vi.fn() }),
      createBindGroup: vi.fn(),
      createCommandEncoder: vi.fn().mockReturnValue({
        beginComputePass: vi.fn().mockReturnValue({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          dispatchWorkgroups: vi.fn(),
          end: vi.fn(),
        }),
        finish: vi.fn(),
      }),
      queue: {
        submit: vi.fn(),
        onSubmittedWorkDone: vi.fn().mockResolvedValue(undefined),
      },
      destroy: vi.fn(),
    };

    (navigator.gpu.requestAdapter as any).mockResolvedValue({
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    });

    const result = await WebGPUProfiler.profileCapability();
    expect(result.mode).toBe('webgpu');
    expect(result.computeTimeMs).toBeLessThanOrEqual(16);
  });

  it('should fallback to webgl2 on error during profile', async () => {
    (navigator.gpu.requestAdapter as any).mockRejectedValue(new Error('Simulated GPU Error'));
    const result = await WebGPUProfiler.profileCapability();
    expect(result.mode).toBe('webgl2');
    expect(result.computeTimeMs).toBe(Infinity);
  });
});
