/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — Compute Pipeline Abstraction
 *
 * Manages WGSL shader compilation, bind group layout creation,
 * pipeline caching, and compute dispatch. Abstracts the verbose
 * WebGPU pipeline setup into a composable interface.
 * ═══════════════════════════════════════════════════════════════════
 */

import { WebGPUContext } from '../core/WebGPUContext';

export interface ComputeDispatchConfig {
  workgroupsX: number;
  workgroupsY: number;
  workgroupsZ?: number;
}

export interface ComputeBindEntry {
  binding: number;
  resource: GPUBindingResource;
}

export class ComputePipeline {
  private pipeline:      GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private shaderModule:  GPUShaderModule | null = null;

  constructor(
    private ctx:         WebGPUContext,
    private shaderCode:  string,
    private entryPoint:  string = 'main',
    private label:       string = 'nte-compute',
  ) {}

  /**
   * Compile the shader and create the pipeline.
   * Pipeline creation is async and includes validation.
   */
  async compile(layoutEntries: GPUBindGroupLayoutEntry[]): Promise<void> {
    const device = this.ctx.getDevice();

    // Compile shader module
    this.shaderModule = device.createShaderModule({
      label: `${this.label}-shader`,
      code: this.shaderCode,
    });

    // Check for compilation errors
    const info = await this.shaderModule.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === 'error');
    if (errors.length > 0) {
      const errorMsg = errors.map((e) => `Line ${e.lineNum}: ${e.message}`).join('\n');
      throw new Error(`[NTE] Shader compilation failed:\n${errorMsg}`);
    }

    // Create bind group layout
    this.bindGroupLayout = device.createBindGroupLayout({
      label: `${this.label}-layout`,
      entries: layoutEntries,
    });

    // Create pipeline
    const pipelineLayout = device.createPipelineLayout({
      label: `${this.label}-pipeline-layout`,
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = device.createComputePipeline({
      label: this.label,
      layout: pipelineLayout,
      compute: {
        module: this.shaderModule,
        entryPoint: this.entryPoint,
      },
    });
  }

  /**
   * Create a bind group from an array of binding entries.
   */
  createBindGroup(entries: ComputeBindEntry[]): GPUBindGroup {
    const device = this.ctx.getDevice();

    if (!this.bindGroupLayout) {
      throw new Error('[NTE] Pipeline not compiled. Call compile() first.');
    }

    return device.createBindGroup({
      label: `${this.label}-bindgroup`,
      layout: this.bindGroupLayout,
      entries: entries.map((e) => ({
        binding: e.binding,
        resource: e.resource,
      })),
    });
  }

  /**
   * Encode and submit a compute dispatch.
   * Returns a promise that resolves when the GPU work is complete.
   */
  async dispatch(
    bindGroup: GPUBindGroup,
    config: ComputeDispatchConfig,
  ): Promise<void> {
    const device = this.ctx.getDevice();

    if (!this.pipeline) {
      throw new Error('[NTE] Pipeline not compiled. Call compile() first.');
    }

    const encoder = device.createCommandEncoder({
      label: `${this.label}-encoder`,
    });

    const pass = encoder.beginComputePass({
      label: `${this.label}-pass`,
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      config.workgroupsX,
      config.workgroupsY,
      config.workgroupsZ ?? 1,
    );
    pass.end();

    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
  }

  /**
   * Encode a compute pass into an existing command encoder.
   * Useful for batching multiple dispatches into a single submission.
   */
  encodeInto(
    encoder: GPUCommandEncoder,
    bindGroup: GPUBindGroup,
    config: ComputeDispatchConfig,
  ): void {
    if (!this.pipeline) {
      throw new Error('[NTE] Pipeline not compiled. Call compile() first.');
    }

    const pass = encoder.beginComputePass({
      label: `${this.label}-pass`,
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      config.workgroupsX,
      config.workgroupsY,
      config.workgroupsZ ?? 1,
    );
    pass.end();
  }
}
