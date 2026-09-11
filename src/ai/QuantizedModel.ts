/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — Quantized Model Loader
 *
 * Loads and manages INT8-quantized ESPCN weights for the AI
 * upscaling pass. Supports loading from a URL, ArrayBuffer, or
 * bundled default weights.
 *
 * Weight format (.nte binary):
 *   [4B magic "NTE\0"] [4B version] [4B num_layers]
 *   For each layer:
 *     [4B out_ch] [4B in_ch] [4B kH] [4B kW]
 *     [N bytes INT8 weights]
 *     [out_ch × 4B FP32 scales]
 *     [out_ch × 4B FP32 biases]
 * ═══════════════════════════════════════════════════════════════════
 */

import type { QuantizedWeights } from '../types';

const NTE_MAGIC = 0x0045544E; // "NTE\0" in little-endian

export class QuantizedModel {
  private weights: QuantizedWeights | null = null;
  private gpuBuffers: GPUBuffer[] = [];

  /** Whether the model has been loaded. */
  get isLoaded(): boolean {
    return this.weights !== null;
  }

  /** Model metadata (architecture, params, size). */
  get metadata() {
    return this.weights?.metadata ?? null;
  }

  /**
   * Load quantized weights from a URL.
   * @param url Path to the .nte weight file.
   */
  async loadFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[NTE] Failed to load model weights from ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    this.parseWeights(buffer);
  }

  /**
   * Load quantized weights from an ArrayBuffer.
   */
  loadFromBuffer(buffer: ArrayBuffer): void {
    this.parseWeights(buffer);
  }

  /**
   * Generate default ESPCN weights (random initialization).
   * Used for testing and development. Replace with trained weights
   * for production use.
   */
  loadDefaultWeights(scaleFactor: number = 4): void {
    const r = scaleFactor;
    const layers = [
      { outCh: 64, inCh: 3,  kH: 5, kW: 5 },  // Layer 1: feature extraction
      { outCh: 32, inCh: 64, kH: 3, kW: 3 },   // Layer 2: non-linear mapping
      { outCh: 3 * r * r, inCh: 32, kH: 3, kW: 3 }, // Layer 3: sub-pixel conv
    ];

    this.weights = {
      layers: layers.map((l) => {
        const numWeights = l.outCh * l.inCh * l.kH * l.kW;
        const weights = new Int8Array(numWeights);
        const scales = new Float32Array(l.outCh);
        const biases = new Float32Array(l.outCh);

        for (let oc = 0; oc < l.outCh; oc++) {
          scales[oc] = 1.0 / 127.0;
          biases[oc] = 0.0;
          for (let ic = 0; ic < l.inCh; ic++) {
            for (let ky = 0; ky < l.kH; ky++) {
              for (let kx = 0; kx < l.kW; kx++) {
                const wIdx = ((oc * l.inCh + ic) * l.kH + ky) * l.kW + kx;
                const midY = (l.kH - 1) / 2;
                const midX = (l.kW - 1) / 2;
                const distSq = (ky - midY) * (ky - midY) + (kx - midX) * (kx - midX);

                if (oc % l.inCh === ic) {
                  // Centered 2D Gaussian / unsharp sharpening kernel
                  if (distSq < 0.5) {
                    weights[wIdx] = 100; // Strong identity center
                  } else if (distSq <= 2.0) {
                    weights[wIdx] = -12; // High-frequency edge enhancer
                  } else {
                    weights[wIdx] = 4;   // Smooth boundary support
                  }
                } else {
                  // Cross-channel chrominance gradient transfer
                  weights[wIdx] = distSq < 1.0 ? 8 : -2;
                }
              }
            }
          }
        }

        return {
          weights,
          scales,
          biases,
          shape: [l.outCh, l.inCh, l.kH, l.kW] as [number, number, number, number],
        };
      }),
      metadata: {
        architecture: 'ESPCN',
        scaleFactor: r,
        inputChannels: 3,
        totalParams: layers.reduce((sum, l) => sum + l.outCh * l.inCh * l.kH * l.kW + l.outCh * 2, 0),
        sizeBytes: 0, // Calculated below
      },
    };

    this.weights.metadata.sizeBytes = this.weights.layers.reduce(
      (sum, l) => sum + l.weights.byteLength + l.scales.byteLength + l.biases.byteLength,
      0,
    );
  }

  /**
   * Upload model weights to GPU buffers for compute shader access.
   */
  uploadToGPU(device: GPUDevice): GPUBuffer[] {
    if (!this.weights) {
      throw new Error('[NTE] No weights loaded. Call loadFromUrl() or loadDefaultWeights() first.');
    }

    // Clean up previous GPU buffers
    this.gpuBuffers.forEach((b) => b.destroy());
    this.gpuBuffers = [];

    for (let i = 0; i < this.weights.layers.length; i++) {
      const layer = this.weights.layers[i];

      // Pack INT8 weights into u32 array (4 weights per u32)
      const packedLength = Math.ceil(layer.weights.length / 4);
      const packedWeights = new Uint32Array(packedLength);
      for (let j = 0; j < layer.weights.length; j++) {
        const u32Idx = Math.floor(j / 4);
        const byteIdx = j % 4;
        const unsignedByte = layer.weights[j] < 0
          ? layer.weights[j] + 256
          : layer.weights[j];
        packedWeights[u32Idx] |= (unsignedByte & 0xFF) << (byteIdx * 8);
      }

      const weightsBuffer = device.createBuffer({
        label: `nte-weights-layer-${i}`,
        size: packedWeights.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(weightsBuffer, 0, packedWeights.buffer as ArrayBuffer, packedWeights.byteOffset, packedWeights.byteLength);

      const scalesBuffer = device.createBuffer({
        label: `nte-scales-layer-${i}`,
        size: layer.scales.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(scalesBuffer, 0, layer.scales.buffer as ArrayBuffer, layer.scales.byteOffset, layer.scales.byteLength);

      const biasesBuffer = device.createBuffer({
        label: `nte-biases-layer-${i}`,
        size: layer.biases.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(biasesBuffer, 0, layer.biases.buffer as ArrayBuffer, layer.biases.byteOffset, layer.biases.byteLength);

      this.gpuBuffers.push(weightsBuffer, scalesBuffer, biasesBuffer);
    }

    return this.gpuBuffers;
  }

  /**
   * Parse the binary .nte weight format.
   */
  private parseWeights(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);
    let offset = 0;

    // Validate magic number
    const magic = view.getUint32(offset, true);
    offset += 4;
    if (magic !== NTE_MAGIC) {
      throw new Error('[NTE] Invalid weight file: bad magic number');
    }

    const version = view.getUint32(offset, true);
    offset += 4;
    if (version !== 1) {
      throw new Error(`[NTE] Unsupported weight format version: ${version}`);
    }

    const numLayers = view.getUint32(offset, true);
    offset += 4;

    const layers: QuantizedWeights['layers'] = [];
    let totalParams = 0;

    for (let i = 0; i < numLayers; i++) {
      const outCh = view.getUint32(offset, true); offset += 4;
      const inCh  = view.getUint32(offset, true); offset += 4;
      const kH    = view.getUint32(offset, true); offset += 4;
      const kW    = view.getUint32(offset, true); offset += 4;

      const numWeights = outCh * inCh * kH * kW;
      const weights = new Int8Array(buffer, offset, numWeights);
      offset += numWeights;

      // Align to 4 bytes
      offset = (offset + 3) & ~3;

      const scales = new Float32Array(buffer, offset, outCh);
      offset += outCh * 4;

      const biases = new Float32Array(buffer, offset, outCh);
      offset += outCh * 4;

      totalParams += numWeights + outCh * 2;
      layers.push({ weights, scales, biases, shape: [outCh, inCh, kH, kW] });
    }

    this.weights = {
      layers,
      metadata: {
        architecture: 'ESPCN',
        scaleFactor: 4,
        inputChannels: layers[0]?.shape[1] ?? 3,
        totalParams,
        sizeBytes: buffer.byteLength,
      },
    };
  }

  /** Release GPU resources. */
  destroy(): void {
    this.gpuBuffers.forEach((b) => b.destroy());
    this.gpuBuffers = [];
    this.weights = null;
  }
}
