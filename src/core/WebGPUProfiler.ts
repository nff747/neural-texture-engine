export type EngineMode = 'webgpu' | 'webgl2' | 'fallback';

export interface ProfilerResult {
  mode: EngineMode;
  computeTimeMs: number;
}

export class WebGPUProfiler {
  /**
   * Profiles WebGPU compute capabilities. 
   * If compute takes > 16ms or WebGPU is unsupported, falls back to WebGL2.
   * Focuses on energy efficiency by requesting a 'low-power' adapter.
   */
  static async profileCapability(): Promise<ProfilerResult> {
    if (!navigator.gpu) {
      return { mode: 'webgl2', computeTimeMs: Infinity };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'low-power' // Focus on energy efficiency for mobile devices
      });

      if (!adapter) {
        return { mode: 'webgl2', computeTimeMs: Infinity };
      }

      const device = await adapter.requestDevice();

      // Minimal compute shader to profile capability
      const shaderCode = `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
          let i = global_id.x;
          // Simple artificial workload
          data[i] = data[i] * 2.0;
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });

      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      const bufferSize = 64 * 4; // very small buffer to save memory
      const buffer = device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      });

      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer } }],
      });

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(1);
      passEncoder.end();

      const start = performance.now();
      device.queue.submit([commandEncoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      const end = performance.now();
      
      buffer.destroy();
      device.destroy();

      const computeTimeMs = end - start;

      // Gracefully degrade to WebGL2 if compute > 16ms
      if (computeTimeMs > 16) {
        return { mode: 'webgl2', computeTimeMs };
      }

      return { mode: 'webgpu', computeTimeMs };
    } catch (e) {
      // Any error in WebGPU initialization/execution leads to WebGL2 fallback
      return { mode: 'webgl2', computeTimeMs: Infinity };
    }
  }
}
