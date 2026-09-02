/**
 * ═══════════════════════════════════════════════════════════════════
 * Neural Texture Engine — Three.js Render Hook
 *
 * Injects into the Three.js rendering pipeline via a custom render
 * pass. Intercepts mesh materials before the draw call, checks the
 * texture cache, and triggers procedural generation + AI upscaling
 * if a cache miss occurs.
 *
 * Integration point: renderer.onBeforeRender / material.onBeforeCompile
 * ═══════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import type { GeneratedTexture, MaterialDescriptor, TextureConfig } from '../types';
import { TextureCache } from './TextureCache';

export interface RenderHookOptions {
  /** Renderer instance to hook into. */
  renderer: THREE.WebGLRenderer;
  /** Function that resolves a mesh to its material descriptor. */
  materialResolver: (mesh: THREE.Mesh) => MaterialDescriptor | null;
  /** Texture generation config. */
  textureConfig: TextureConfig;
  /** Callback invoked when a texture needs generation (cache miss). */
  onCacheMiss: (
    mesh: THREE.Mesh,
    material: MaterialDescriptor,
    config: TextureConfig,
  ) => Promise<GeneratedTexture>;
}

export class RenderHook {
  private hooked = false;
  private cache: TextureCache;
  private pending = new Set<string>();
  private options: RenderHookOptions;

  constructor(cache: TextureCache, options: RenderHookOptions) {
    this.cache = cache;
    this.options = options;
  }

  /**
   * Attach to the Three.js scene traversal.
   * Wraps scene.traverse to intercept meshes before rendering.
   */
  attach(scene: THREE.Scene): void {
    if (this.hooked) return;
    this.hooked = true;

    // Hook into the animation loop via renderer
    const originalRender = this.options.renderer.render.bind(this.options.renderer);

    this.options.renderer.render = (
      sceneArg: THREE.Object3D,
      camera: THREE.Camera,
    ) => {
      // Pre-render pass: check all meshes for texture needs
      sceneArg.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          this.processMesh(object);
        }
      });

      // Proceed with normal Three.js render
      originalRender(sceneArg, camera);
    };
  }

  /**
   * Process a single mesh: resolve material descriptor, check cache,
   * and trigger async generation on cache miss.
   */
  private processMesh(mesh: THREE.Mesh): void {
    const descriptor = this.options.materialResolver(mesh);
    if (!descriptor) return;

    const key = TextureCache.computeKey(descriptor, this.options.textureConfig);

    // Cache hit — apply textures
    const cached = this.cache.get(key);
    if (cached?.threeTextures) {
      this.applyTextures(mesh, cached);
      return;
    }

    // Already generating — skip
    if (this.pending.has(key)) return;

    // Cache miss — trigger async generation
    this.pending.add(key);
    this.generateAsync(mesh, descriptor, key);
  }

  /**
   * Asynchronously generate textures and apply them when ready.
   * The mesh will render with its existing material until the
   * procedural textures are ready (no blocking, no pop-in stall).
   */
  private async generateAsync(
    mesh: THREE.Mesh,
    descriptor: MaterialDescriptor,
    key: string,
  ): Promise<void> {
    try {
      const generated = await this.options.onCacheMiss(
        mesh,
        descriptor,
        this.options.textureConfig,
      );

      // Convert GPU textures to Three.js textures
      generated.threeTextures = await this.gpuToThreeTextures(generated);

      // Cache the result
      this.cache.put(key, generated);

      // Apply to mesh
      this.applyTextures(mesh, generated);
    } catch (err) {
      console.error(`[NTE] Failed to generate texture for mesh "${mesh.name}":`, err);
    } finally {
      this.pending.delete(key);
    }
  }

  /**
   * Apply generated textures to a Three.js mesh material.
   * Supports MeshStandardMaterial and MeshPhysicalMaterial.
   */
  private applyTextures(mesh: THREE.Mesh, texture: GeneratedTexture): void {
    const mat = mesh.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;

    const textures = texture.threeTextures;
    if (!textures) return;

    mat.map = textures.albedo;
    if (textures.normal)    mat.normalMap = textures.normal;
    if (textures.roughness) mat.roughnessMap = textures.roughness;
    if (textures.ao)        mat.aoMap = textures.ao;

    mat.needsUpdate = true;
  }

  /**
   * Convert WebGPU textures to Three.js Texture objects.
   * Reads texture data back from the GPU and creates DataTextures.
   */
  private async gpuToThreeTextures(
    generated: GeneratedTexture,
  ): Promise<NonNullable<GeneratedTexture['threeTextures']>> {
    const res = generated.resolution;

    const readTexture = async (
      gpuTex: GPUTexture,
      channels: number,
    ): Promise<THREE.DataTexture> => {
      // In production, this would use a readback buffer.
      // For now, create a placeholder DataTexture.
      const data = new Uint8Array(res * res * channels);
      const format = channels === 4 ? THREE.RGBAFormat : THREE.RedFormat;

      const texture = new THREE.DataTexture(data, res, res, format);
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;

      return texture;
    };

    return {
      albedo:    await readTexture(generated.albedo, 4),
      normal:    generated.normal ? await readTexture(generated.normal, 4) : null,
      roughness: await readTexture(generated.roughness, 1),
      ao:        generated.ao ? await readTexture(generated.ao, 1) : null,
    };
  }

  /** Detach the render hook and restore original render method. */
  detach(): void {
    this.hooked = false;
    // In production, store and restore the original render function
  }
}
