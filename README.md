<div align="center">

<img src="assets/banner.jpg" width="800" alt="Project Banner">


# 🔥 neural-texture-engine

**WebGPU + Browser-Local AI for Real-Time 4K Procedural Texture Generation**

[![Powered by nff747](https://img.shields.io/badge/Powered%20by-nff747-111111?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nff747)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF0055.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-Compute-000000.svg?style=for-the-badge&logo=webgl&logoColor=white)]()
[![Three.js](https://img.shields.io/badge/Three.js-r170+-000000.svg?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

*Generate photorealistic PBR textures from base meshes entirely on the client GPU.<br>Eliminate texture downloads. Reduce initial payload by 90%. Ship geometry, not pixels.*

[Getting Started](#getting-started) · [Architecture](#architecture) · [R3F Integration](#react-three-fiber-integration) · [Shader Math](#the-mathematics) · [API Reference](#api-reference)

</div>

---

## The Problem: 3D Web Payload Bottleneck

Modern 3D web experiences ship **massive texture payloads** that dominate load time and bandwidth:

| Asset Type | Typical Size | % of Total Payload |
|:---|:---|:---|
| Geometry (glTF/GLB) | 200KB – 2MB | ~5–15% |
| **Textures (Albedo, Normal, Roughness, AO)** | **8MB – 60MB** | **~70–90%** |
| Scripts + WASM | 500KB – 3MB | ~5–15% |

A single 4K PBR material set (albedo + normal + roughness + AO) at RGBA8 consumes **~67MB uncompressed**, or **~12MB** after Basis/KTX2 compression. A scene with 10 unique materials? That's **120MB of textures** before a single polygon renders.

### The Solution

**Neural Texture Engine** inverts the pipeline. Instead of downloading pre-baked textures, it ships a **compact material descriptor** (~128 bytes) and generates 4K PBR textures **on the client GPU in real-time** using WebGPU compute shaders and a quantized AI upscaling model.

```
Traditional Pipeline:
  Server → [12MB KTX2 textures] → Client → Decompress → GPU

Neural Texture Engine:
  Server → [128B descriptor] → Client → GPU Compute → 4K Textures
                                                    ↑
                                              ~99.999% smaller payload
```

**Result: 90%+ reduction in initial payload.** The geometry loads in milliseconds. Textures generate on-GPU during the first frame.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Neural Texture Engine                         │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │ Material      │───>│ Procedural    │───>│ AI Upscale Pass  │  │
│  │ Descriptor    │    │ Compute Shader│    │ (INT8 ESPCN)     │  │
│  │ (~128 bytes)  │    │ 1024² output  │    │ 1024² → 4096²   │  │
│  └──────────────┘    └───────────────┘    └──────────────────┘  │
│         │                    │                      │           │
│         │            ┌──────┴──────┐        ┌──────┴──────┐    │
│         │            │ Noise       │        │ PixelShuffle│    │
│         │            │ Primitives  │        │ r=4 (WGSL)  │    │
│         │            │ • Simplex 3D│        └──────┬──────┘    │
│         │            │ • FBM       │               │           │
│         │            │ • Voronoi   │        ┌──────┴──────┐    │
│         │            │ • Dom. Warp │        │ LRU Texture │    │
│         │            └─────────────┘        │ Cache (VRAM)│    │
│         │                                   └──────┬──────┘    │
│  ┌──────┴──────┐                            ┌──────┴──────┐    │
│  │ Three.js    │<───────────────────────────│ GPU Textures │    │
│  │ Render Hook │  albedo, normal,           │ rgba8unorm   │    │
│  │             │  roughness, AO             │ r8unorm      │    │
│  └─────────────┘                            └─────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

1. **Material Descriptor** — A 64-byte struct defining base color, roughness range, noise parameters, pattern type (organic/mineral/fabric/tech), and a deterministic seed.

2. **Procedural Compute Shader** — Dispatches 16,777,216 GPU threads (256×256 workgroups × 256 threads each) to generate PBR channels in a single pass. Each thread computes one texel using layered simplex noise, Voronoi cells, FBM, and domain warping.

3. **AI Upscale Pass** — A quantized ESPCN (Efficient Sub-Pixel Convolutional Network) upscales the 1024² procedural output to 4096². The model runs entirely as a WebGPU compute shader with INT8 weights (~180KB), delivering 4× super-resolution with zero server round-trips.

4. **LRU Texture Cache** — Generated textures are cached in VRAM with FNV-1a key hashing. Cache misses trigger async generation; the mesh renders with its existing material until textures are ready (no pop-in stall).

---

## Getting Started

### Installation

```bash
npm install neural-texture-engine three
```

### Basic Usage

```typescript
import { NeuralTextureEngine, PatternType } from 'neural-texture-engine';

const engine = new NeuralTextureEngine({
  maxCacheSize: 64,
  debug: true,
  upscale: {
    scaleFactor: 4,
    quality: 'balanced',
  },
});

await engine.init();

const textures = await engine.generate(
  {
    baseColor:      [0.8, 0.2, 0.1, 1.0],
    roughnessRange: [0.3, 0.9],
    metallic:       0.0,
    noiseScale:     4.0,
    octaves:        6,
    lacunarity:     2.0,
    gain:           0.5,
    warpStrength:   0.8,
    patternType:    PatternType.Organic,
    seed:           42.0,
  },
  {
    resolution:   4096,
    uvScale:      [1, 1],
    enableNormal: true,
    enableAO:     true,
    animated:     false,
  },
);

// textures.albedo     → GPUTexture (rgba8unorm, 4096²)
// textures.normal     → GPUTexture (rgba8unorm, 4096²)
// textures.roughness  → GPUTexture (r8unorm, 4096²)
// textures.ao         → GPUTexture (r8unorm, 4096²)
```

---

## React Three Fiber Integration

The `useNeuralTexture` hook provides declarative, zero-config integration with R3F:

```bash
npm install neural-texture-engine three @react-three/fiber
```

```tsx
import { Canvas } from '@react-three/fiber';
import { useNeuralTexture } from 'neural-texture-engine/react';
import { PatternType } from 'neural-texture-engine';

function ProceduralRock() {
  const { textures, isReady, isLoading } = useNeuralTexture({
    baseColor:      [0.45, 0.4, 0.35, 1.0],
    roughnessRange: [0.6, 1.0],
    metallic:       0.0,
    noiseScale:     6.0,
    octaves:        8,
    lacunarity:     2.1,
    gain:           0.45,
    warpStrength:   1.2,
    patternType:    PatternType.Mineral,
    seed:           7.0,
  });

  return (
    <mesh>
      <dodecahedronGeometry args={[1, 4]} />
      <meshStandardMaterial
        map={textures?.albedo}
        normalMap={textures?.normal}
        roughnessMap={textures?.roughness}
        aoMap={textures?.ao}
        color={isReady ? undefined : '#555'}
      />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} />
      <ProceduralRock />
    </Canvas>
  );
}
```

### Hook API

```typescript
const {
  textures,   // NeuralTextureResult | null — Three.js textures
  isReady,    // boolean — true when textures are generated
  isLoading,  // boolean — true during generation
  error,      // Error | null
  generate,   // () => Promise<void> — manual trigger (lazy mode)
} = useNeuralTexture(descriptor, {
  config: {
    resolution: 4096,
    enableNormal: true,
    enableAO: true,
  },
  lazy: false,  // set true to defer generation
});
```

---

## The Mathematics

### Simplex Noise Foundation

The procedural engine is built on **3D simplex noise** (Perlin, 2001), which provides isotropic gradient noise with O(n) complexity. The simplex lattice in 3D skews the input space via:

$$S = \frac{1}{\sqrt{n+1} - 1}$$

Where $n=3$ for 3D noise. Each lattice cell contributes based on the squared distance falloff kernel:

$$k(t) = \max(0, r^2 - t^2)^4$$

with $r^2 = 0.5$ and $t = \|x - x_i\|^2$, giving smooth C² continuity.

### Fractional Brownian Motion (FBM)

Surface detail is produced by layering octaves of simplex noise with geometric amplitude decay:

$$F(\mathbf{p}) = \sum_{i=0}^{N-1} g^i \cdot \text{noise}(\mathbf{p} \cdot l^i)$$

Where:
- $l$ = lacunarity (frequency multiplier, default 2.0)
- $g$ = gain (amplitude multiplier, default 0.5)
- $N$ = octave count (6–8 for high detail)

The spectral energy distribution follows $E(f) \propto f^{-\beta}$ where $\beta = -\log_l(g)$, producing natural $1/f$ noise characteristics.

### Domain Warping

Organic complexity is achieved through **recursive domain warping** — feeding noise output back as coordinate displacement:

$$\text{warp}(\mathbf{p}) = \text{fbm}\big(\mathbf{p} + s \cdot \text{fbm}(\mathbf{p} + s \cdot \text{fbm}(\mathbf{p}))\big)$$

where $s$ is the warp strength. This creates the swirling, non-repetitive patterns seen in natural materials (marble, wood grain, weathered stone).

### Voronoi Cells

Mineral and crystalline patterns use **Worley noise** (cellular noise). For each point $\mathbf{p}$, we find the two nearest cell centers $c_1, c_2$ and compute:

$$\text{edge}(\mathbf{p}) = \text{smoothstep}\left(0, \epsilon, \|c_2 - \mathbf{p}\| - \|c_1 - \mathbf{p}\|\right)$$

The $F_2 - F_1$ distance produces sharp crystalline boundaries when blended with the FBM surface.

### Normal Map Generation

Tangent-space normals are derived from the height field via central finite differences:

$$\mathbf{n} = \text{normalize}\left(-\frac{\partial h}{\partial u}, -\frac{\partial h}{\partial v}, 1\right)$$

approximated as:

$$\frac{\partial h}{\partial u} \approx \frac{h(u + \epsilon) - h(u - \epsilon)}{2\epsilon}$$

where $\epsilon = 1/\text{resolution}$.

### AI Upscaling (ESPCN)

The upscaling pass implements **Efficient Sub-Pixel Convolutional Neural Network** (Shi et al., 2016). Instead of upsampling then convolving (computationally expensive), ESPCN convolves at low resolution then rearranges channels into spatial dimensions via **pixel shuffle**:

$$\text{PS}(T)_{x,y,c} = T_{\lfloor x/r \rfloor, \lfloor y/r \rfloor, c \cdot r^2 + (y \bmod r) \cdot r + (x \bmod r)}$$

For $r=4$, the final convolutional layer outputs $3 \times 4^2 = 48$ channels, which pixel shuffle rearranges into 3-channel RGB at 4× spatial resolution. All weights are INT8 quantized with per-channel scale factors, reducing model size from ~720KB (FP32) to ~180KB while preserving visual quality.

---

## API Reference

### `NeuralTextureEngine`

| Method | Returns | Description |
|:---|:---|:---|
| `constructor(options?)` | `NeuralTextureEngine` | Create engine instance |
| `init()` | `Promise<void>` | Initialize WebGPU, compile shaders, load model |
| `generate(material, config)` | `Promise<GeneratedTexture>` | Generate PBR textures |
| `destroy()` | `void` | Release all GPU resources |
| `cacheStats` | `object` | Cache hit/miss statistics |
| `on(event, listener)` | `void` | Subscribe to engine events |

### `MaterialDescriptor`

| Field | Type | Description |
|:---|:---|:---|
| `baseColor` | `[r, g, b, a]` | sRGB base tint |
| `roughnessRange` | `[min, max]` | Roughness variation range |
| `metallic` | `number` | Metallic factor [0, 1] |
| `noiseScale` | `number` | World-space frequency multiplier |
| `octaves` | `number` | FBM octave count (1–12) |
| `lacunarity` | `number` | Frequency multiplier per octave |
| `gain` | `number` | Amplitude multiplier per octave |
| `warpStrength` | `number` | Domain warp intensity |
| `patternType` | `PatternType` | Organic, Mineral, Fabric, or Tech |
| `seed` | `number` | Deterministic seed |

### Pattern Types

| Type | Description | Use Case |
|:---|:---|:---|
| `Organic` | Domain-warped FBM | Wood, skin, leather, clouds |
| `Mineral` | Voronoi + FBM blend | Stone, crystal, granite, marble |
| `Fabric` | Sinusoidal warp + noise | Cloth, canvas, weave patterns |
| `Tech` | Grid + noise overlay | Circuit boards, panels, sci-fi |

---

## Browser Support

| Browser | Version | Status |
|:---|:---|:---|
| Chrome | 113+ | ✅ Full support |
| Edge | 113+ | ✅ Full support |
| Firefox | Nightly | ⚠️ Behind `dom.webgpu.enabled` flag |
| Safari | 18+ | ⚠️ Partial (WebGPU in Technology Preview) |

---

## Project Structure

```
neural-texture-engine/
├── src/
│   ├── core/
│   │   ├── NeuralTextureEngine.ts    # Main engine orchestrator
│   │   └── WebGPUContext.ts          # GPU device management
│   ├── shaders/
│   │   ├── procedural.wgsl          # Procedural generation compute
│   │   ├── upscale.wgsl             # ESPCN upscaling compute
│   │   └── noise.wgsl               # Noise primitives library
│   ├── pipeline/
│   │   ├── ComputePipeline.ts        # Shader compilation + dispatch
│   │   ├── RenderHook.ts            # Three.js integration
│   │   └── TextureCache.ts          # LRU VRAM cache
│   ├── ai/
│   │   └── QuantizedModel.ts        # INT8 model loader
│   ├── react/
│   │   └── useNeuralTexture.ts      # R3F declarative hook
│   ├── types.ts                     # Type definitions
│   └── index.ts                     # Public API
├── .github/workflows/ci.yml
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

```bash
git clone https://github.com/nff747/neural-texture-engine.git
cd neural-texture-engine
npm install
npm run dev
```

---

## License

[MIT](LICENSE) — iKi / Frozen Flame

---

<div align="center">

<img src="assets/banner.jpg" width="800" alt="Project Banner">

<br>

*Ship geometry, not pixels.*

<br>
</div>

---

## 📜 Open Source & Commercial Use (MIT)

This project is 100% open-source software under the **[MIT License](LICENSE)**.

### 💼 Commercial Use & Free Redistribution
You are explicitly permitted to use, modify, fork, integrate, package, and sell commercial products or SaaS built using this engine with **one visible attribution requirement**:
> **Attribution Requirement**: You must include a visible credit to **nff747** in your application (e.g., `Powered by nff747` linking to [https://github.com/nff747](https://github.com/nff747) in your application UI, footer, about modal, or documentation).

```html
<!-- Example visible footer attribution -->
<p>Powered by <a href="https://github.com/nff747" target="_blank">nff747</a></p>
```
