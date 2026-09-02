/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — Type Definitions
 * ═══════════════════════════════════════════════════════════════════
 */

/** Supported procedural pattern types. */
export enum PatternType {
  Organic = 0,
  Mineral = 1,
  Fabric  = 2,
  Tech    = 3,
}

/** Material descriptor — maps 1:1 to the GPU uniform struct. */
export interface MaterialDescriptor {
  baseColor:      [number, number, number, number];
  roughnessRange: [number, number];
  metallic:       number;
  noiseScale:     number;
  octaves:        number;
  lacunarity:     number;
  gain:           number;
  warpStrength:   number;
  patternType:    PatternType;
  seed:           number;
}

/** Configuration for the texture generation pass. */
export interface TextureConfig {
  resolution:   number;
  uvScale:      [number, number];
  enableNormal: boolean;
  enableAO:     boolean;
  animated:     boolean;
}

/** Configuration for the AI upscale pass. */
export interface UpscaleConfig {
  scaleFactor: 2 | 4;
  modelPath?:  string;
  quality:     'fast' | 'balanced' | 'quality';
}

/** Engine initialization options. */
export interface EngineOptions {
  /** Max texture cache entries (LRU eviction). Default: 32 */
  maxCacheSize?:  number;
  /** Enable debug logging. Default: false */
  debug?:         boolean;
  /** Custom WebGPU adapter request options. */
  adapterOptions?: GPURequestAdapterOptions;
  /** Upscale configuration. Omit to disable AI upscaling. */
  upscale?:       UpscaleConfig;
}

/** Generated texture output containing GPU texture handles. */
export interface GeneratedTexture {
  albedo:     GPUTexture;
  normal:     GPUTexture | null;
  roughness:  GPUTexture;
  ao:         GPUTexture | null;
  resolution: number;
  /** Three.js-compatible texture objects (created lazily). */
  threeTextures?: {
    albedo:    import('three').Texture;
    normal:    import('three').Texture | null;
    roughness: import('three').Texture;
    ao:        import('three').Texture | null;
  };
}

/** Cache entry metadata. */
export interface CacheEntry {
  key:        string;
  texture:    GeneratedTexture;
  lastUsed:   number;
  sizeBytes:  number;
}

/** Engine lifecycle events. */
export interface EngineEvents {
  'texture:generating':  (key: string) => void;
  'texture:generated':   (key: string, texture: GeneratedTexture) => void;
  'texture:cached':      (key: string) => void;
  'texture:evicted':     (key: string) => void;
  'upscale:start':       (inputRes: number, outputRes: number) => void;
  'upscale:complete':    (outputRes: number, durationMs: number) => void;
  'error':               (error: Error) => void;
}

/** Quantized model weight format. */
export interface QuantizedWeights {
  layers: Array<{
    weights:  Int8Array;
    scales:   Float32Array;
    biases:   Float32Array;
    shape:    [number, number, number, number]; // [out_ch, in_ch, kH, kW]
  }>;
  metadata: {
    architecture: string;
    scaleFactor:  number;
    inputChannels: number;
    totalParams:   number;
    sizeBytes:     number;
  };
}
