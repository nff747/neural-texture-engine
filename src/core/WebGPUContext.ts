/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — WebGPU Context Manager
 *
 * Handles adapter negotiation, device acquisition, capability
 * detection, and resource lifecycle. Singleton per engine instance.
 * ═══════════════════════════════════════════════════════════════════
 */

export class WebGPUContext {
  private adapter: GPUAdapter | null = null;
  private device:  GPUDevice  | null = null;
  private limits:  GPUSupportedLimits | null = null;

  /** Maximum compute workgroup invocations (typically 256). */
  get maxWorkgroupSize(): number {
    return this.limits?.maxComputeWorkgroupSizeX ?? 256;
  }

  /** Maximum storage buffer size in bytes. */
  get maxStorageBufferSize(): number {
    return this.limits?.maxStorageBufferBindingSize ?? 134_217_728;
  }

  /** Maximum texture dimension (width or height). */
  get maxTextureDimension(): number {
    return this.limits?.maxTextureDimension2D ?? 8192;
  }

  /**
   * Initialize WebGPU adapter and device.
   * @throws {Error} If WebGPU is not supported or adapter unavailable.
   */
  async init(options?: GPURequestAdapterOptions): Promise<GPUDevice> {
    if (this.device) return this.device;

    if (!navigator.gpu) {
      throw new Error(
        '[NeuralTextureEngine] WebGPU is not supported in this browser. ' +
        'Requires Chrome 113+, Edge 113+, or Firefox Nightly with dom.webgpu.enabled.'
      );
    }

    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
      ...options,
    });

    if (!this.adapter) {
      throw new Error(
        '[NeuralTextureEngine] Failed to acquire GPU adapter. ' +
        'Ensure hardware acceleration is enabled.'
      );
    }

    // Request device with required features and limits
    const requiredFeatures: GPUFeatureName[] = [];
    const adapterLimits = this.adapter.limits;

    this.device = await this.adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxStorageBufferBindingSize:       adapterLimits.maxStorageBufferBindingSize,
        maxBufferSize:                     adapterLimits.maxBufferSize,
        maxComputeWorkgroupSizeX:          16,
        maxComputeWorkgroupSizeY:          16,
        maxComputeInvocationsPerWorkgroup: 256,
        maxStorageTexturesPerShaderStage:  4,
      },
    });

    this.limits = this.device.limits;

    // Handle device loss
    this.device.lost.then((info) => {
      console.error(`[NeuralTextureEngine] GPU device lost: ${info.message}`);
      this.device = null;
      this.adapter = null;
    });

    return this.device;
  }

  /** Get the active GPU device. Throws if not initialized. */
  getDevice(): GPUDevice {
    if (!this.device) {
      throw new Error('[NeuralTextureEngine] WebGPU not initialized. Call init() first.');
    }
    return this.device;
  }

  /** Get the active GPU adapter. */
  getAdapter(): GPUAdapter {
    if (!this.adapter) {
      throw new Error('[NeuralTextureEngine] WebGPU not initialized. Call init() first.');
    }
    return this.adapter;
  }

  /**
   * Create a storage texture for compute shader output.
   * Uses rgba8unorm for color channels, r8unorm for scalar channels.
   */
  createStorageTexture(
    width: number,
    height: number,
    format: GPUTextureFormat = 'rgba8unorm',
    label?: string,
  ): GPUTexture {
    const device = this.getDevice();

    return device.createTexture({
      label: label ?? `nte-storage-${width}x${height}`,
      size: { width, height },
      format,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST,
    });
  }

  /**
   * Create a uniform buffer from typed data.
   * Automatically handles 256-byte alignment for WebGPU.
   */
  createUniformBuffer(data: ArrayBuffer, label?: string): GPUBuffer {
    const device = this.getDevice();
    const alignedSize = Math.ceil(data.byteLength / 256) * 256;

    const buffer = device.createBuffer({
      label: label ?? 'nte-uniform',
      size: Math.max(alignedSize, 256),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  /**
   * Create a storage buffer (read or read_write).
   */
  createStorageBuffer(
    sizeBytes: number,
    label?: string,
    data?: ArrayBuffer,
  ): GPUBuffer {
    const device = this.getDevice();

    const buffer = device.createBuffer({
      label: label ?? 'nte-storage',
      size: sizeBytes,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    if (data) {
      device.queue.writeBuffer(buffer, 0, data);
    }

    return buffer;
  }

  /** Destroy the GPU device and release all resources. */
  destroy(): void {
    this.device?.destroy();
    this.device = null;
    this.adapter = null;
    this.limits = null;
  }
}
