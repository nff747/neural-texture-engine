/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — LRU Texture Cache
 *
 * Fixed-capacity cache with LRU eviction. Keys are derived from
 * MaterialDescriptor + TextureConfig hashes. GPU textures are
 * destroyed on eviction to prevent VRAM leaks.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { CacheEntry, GeneratedTexture, MaterialDescriptor, TextureConfig } from '../types';

export class TextureCache {
  private entries = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private totalBytes = 0;

  constructor(maxSize: number = 32) {
    this.maxSize = maxSize;
  }

  /**
   * Generate a deterministic cache key from material + config.
   * Uses FNV-1a hash for speed.
   */
  static computeKey(material: MaterialDescriptor, config: TextureConfig): string {
    const parts = [
      material.baseColor.join(','),
      material.roughnessRange.join(','),
      material.metallic,
      material.noiseScale,
      material.octaves,
      material.lacunarity,
      material.gain,
      material.warpStrength,
      material.patternType,
      material.seed,
      config.resolution,
      config.uvScale.join(','),
      config.enableNormal ? 1 : 0,
      config.enableAO ? 1 : 0,
    ].join('|');

    return this.fnv1a(parts);
  }

  /** FNV-1a hash (32-bit) — fast, low collision for short strings. */
  private static fnv1a(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /** Check if a texture is cached. */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Retrieve a cached texture, updating its LRU timestamp. */
  get(key: string): GeneratedTexture | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    // Update LRU timestamp
    entry.lastUsed = performance.now();
    return entry.texture;
  }

  /**
   * Insert a texture into the cache. Evicts LRU entries if at capacity.
   * @returns Array of evicted cache keys.
   */
  put(key: string, texture: GeneratedTexture): string[] {
    const evicted: string[] = [];

    // Evict until under capacity
    while (this.entries.size >= this.maxSize) {
      const lruKey = this.findLRU();
      if (lruKey) {
        evicted.push(lruKey);
        this.evict(lruKey);
      }
    }

    // Estimate VRAM usage: resolution² × channels × bytesPerChannel
    const res = texture.resolution;
    const channelCount = 4 + (texture.normal ? 4 : 0) + 1 + (texture.ao ? 1 : 0);
    const sizeBytes = res * res * channelCount;

    this.entries.set(key, {
      key,
      texture,
      lastUsed: performance.now(),
      sizeBytes,
    });

    this.totalBytes += sizeBytes;
    return evicted;
  }

  /** Find the least recently used cache key. */
  private findLRU(): string | null {
    let oldestTime = Infinity;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.entries) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /** Evict a cache entry and destroy its GPU textures. */
  private evict(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    // Destroy GPU resources
    entry.texture.albedo.destroy();
    entry.texture.normal?.destroy();
    entry.texture.roughness.destroy();
    entry.texture.ao?.destroy();

    this.totalBytes -= entry.sizeBytes;
    this.entries.delete(key);
  }

  /** Get current cache statistics. */
  get stats() {
    return {
      entries:    this.entries.size,
      maxSize:    this.maxSize,
      totalBytes: this.totalBytes,
      totalMB:    (this.totalBytes / (1024 * 1024)).toFixed(2),
    };
  }

  /** Clear the entire cache and destroy all GPU resources. */
  clear(): void {
    for (const key of this.entries.keys()) {
      this.evict(key);
    }
  }
}
