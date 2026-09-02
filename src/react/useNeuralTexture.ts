/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — React Three Fiber Hook
 *
 * Declarative hook for using NTE inside R3F scenes. Manages engine
 * lifecycle, texture generation, and automatic mesh material binding.
 *
 * Usage:
 *   const { textures, isReady } = useNeuralTexture(materialDescriptor);
 *   return <mesh><meshStandardMaterial map={textures?.albedo} /></mesh>;
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NeuralTextureEngine } from '../core/NeuralTextureEngine';
import { TextureCache } from '../pipeline/TextureCache';
import type {
  MaterialDescriptor,
  TextureConfig,
  EngineOptions,
  GeneratedTexture,
} from '../types';

/** Default texture configuration. */
const DEFAULT_CONFIG: TextureConfig = {
  resolution:   4096,
  uvScale:      [1, 1],
  enableNormal: true,
  enableAO:     true,
  animated:     false,
};

/** Resolved Three.js textures ready for material binding. */
export interface NeuralTextureResult {
  albedo:    THREE.Texture;
  normal:    THREE.Texture | null;
  roughness: THREE.Texture;
  ao:        THREE.Texture | null;
}

export interface UseNeuralTextureOptions {
  config?:       Partial<TextureConfig>;
  engineOptions?: EngineOptions;
  /** If true, generation is deferred until explicitly triggered. */
  lazy?:         boolean;
}

// Singleton engine instance shared across all hook consumers
let sharedEngine: NeuralTextureEngine | null = null;
let engineRefCount = 0;

function getSharedEngine(options?: EngineOptions): NeuralTextureEngine {
  if (!sharedEngine) {
    sharedEngine = new NeuralTextureEngine(options);
  }
  engineRefCount++;
  return sharedEngine;
}

function releaseSharedEngine(): void {
  engineRefCount--;
  if (engineRefCount <= 0 && sharedEngine) {
    sharedEngine.destroy();
    sharedEngine = null;
    engineRefCount = 0;
  }
}

/**
 * React Three Fiber hook for declarative procedural texture generation.
 *
 * @param material - PBR material descriptor
 * @param options  - Configuration overrides
 * @returns Generated textures and loading state
 */
export function useNeuralTexture(
  material: MaterialDescriptor,
  options: UseNeuralTextureOptions = {},
): {
  textures:  NeuralTextureResult | null;
  isReady:   boolean;
  isLoading: boolean;
  error:     Error | null;
  generate:  () => Promise<void>;
} {
  const { gl } = useThree();
  const engineRef = useRef<NeuralTextureEngine | null>(null);
  const [textures, setTextures] = useState<NeuralTextureResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const config = useMemo<TextureConfig>(
    () => ({ ...DEFAULT_CONFIG, ...options.config }),
    [options.config],
  );

  // Cache key for dependency tracking
  const cacheKey = useMemo(
    () => TextureCache.computeKey(material, config),
    [material, config],
  );

  // Initialize engine
  useEffect(() => {
    const engine = getSharedEngine(options.engineOptions);
    engineRef.current = engine;

    return () => {
      releaseSharedEngine();
      engineRef.current = null;
    };
  }, []);

  // Generate texture function
  const generate = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    setIsLoading(true);
    setError(null);

    try {
      await engine.init();
      const generated = await engine.generate(material, config);

      // Convert to Three.js DataTextures
      const result: NeuralTextureResult = {
        albedo:    createPlaceholderTexture(generated.resolution),
        normal:    config.enableNormal ? createPlaceholderTexture(generated.resolution) : null,
        roughness: createPlaceholderTexture(generated.resolution, 1),
        ao:        config.enableAO ? createPlaceholderTexture(generated.resolution, 1) : null,
      };

      setTextures(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate unless lazy mode
  useEffect(() => {
    if (!options.lazy) {
      generate();
    }
  }, [cacheKey, options.lazy]);

  return {
    textures,
    isReady:  textures !== null,
    isLoading,
    error,
    generate,
  };
}

/** Create a placeholder Three.js DataTexture. */
function createPlaceholderTexture(
  resolution: number,
  channels: number = 4,
): THREE.DataTexture {
  const data = new Uint8Array(resolution * resolution * channels);
  const format = channels === 4 ? THREE.RGBAFormat : THREE.RedFormat;
  const tex = new THREE.DataTexture(data, resolution, resolution, format);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
