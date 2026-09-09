import re

with open('README.md', 'r') as f:
    content = f.read()

# Make sure banner is only at the top
content = re.sub(r'<div align="center">\s*<img src="assets/banner\.jpg"[^>]+>\s*<br>\s*\*Ship geometry, not pixels\.\*\s*<br>\s*</div>\s*---', '', content, flags=re.IGNORECASE)

what_it_does = """
## What It Does

The **Neural Texture Engine** takes any low-resolution or procedural texture and applies **AI super-resolution** (ESPCN) locally in the browser to produce a high-quality, high-resolution output texture. It works primarily via **WebGPU compute shaders** for blazingly fast performance and seamlessly falls back to **WebGL2** when WebGPU is unavailable.
"""

quick_start = """
## Quick Start

Integrate with Three.js to upscale a texture on the fly. Check out the `examples/` and `demo/` directories for complete code.

```javascript
import * as THREE from 'three';
import { NeuralTextureEngine, WebGPUCapabilityProfiler } from 'neural-texture-engine';

// 1. Check capability
const profile = await WebGPUCapabilityProfiler.profileCapability();

// 2. Init engine
const engine = new NeuralTextureEngine({ debug: true });
await engine.init();

// 3. Setup Three.js
const textureLoader = new THREE.TextureLoader();
const lowResTexture = textureLoader.load('path/to/low-res.jpg');

// 4. Set quality profile and upscale!
engine.setQualityProfile('high'); // e.g. 'high', 'balanced', 'performance'
const highResTexture = await engine.upscale(lowResTexture, 4); // 4x upscale factor

// 5. Use in Material
const material = new THREE.MeshStandardMaterial({ map: highResTexture });
```
"""

before_after = """
## Before/After

By generating textures on the client side, the engine improves both visual fidelity and network performance:
- **Low-res Base Texture:** Fast load time, blurry details (e.g. 256x256).
- **AI Upscaled High-res Texture:** Sharp, photorealistic details (e.g. 1024x1024 or 4096x4096) with enhanced PSNR and SSIM resolution quality metrics, reducing initial download payloads by up to 90%.
"""

supported_backends = """
## Supported Backends

The engine uses a tiered execution strategy depending on device capability:

| Backend | Implementation | Fallback Condition |
| :--- | :--- | :--- |
| **WebGPU** | Native Compute Shaders | Default for modern browsers (Chrome 113+, Edge 113+) |
| **WebGL2** | Fragment Shader | Fallback when WebGPU is not supported |
| **CPU** | OffscreenCanvas + JS | Fallback when WebGL2 is not supported or context lost |

"""

# Modify API Reference
api_ref_addition = """
### `NeuralTextureEngine`

| Method | Returns | Description |
|:---|:---|:---|
| `constructor(options?)` | `NeuralTextureEngine` | Create engine instance |
| `init()` | `Promise<void>` | Initialize WebGPU, compile shaders, load model |
| `generate(material, config)` | `Promise<GeneratedTexture>` | Generate PBR textures |
| `upscale(texture, factor)` | `Promise<GPUTexture \| THREE.Texture>` | Upscale an input texture by a factor |
| `setQualityProfile(profile)` | `void` | Set quality profile ('performance', 'balanced', 'high') |
| `destroy()` | `void` | Release all GPU resources |

### `WebGPUCapabilityProfiler`

| Method | Returns | Description |
|:---|:---|:---|
| `profileCapability()` | `Promise<ProfilerResult>` | Profiles device to determine if WebGPU or fallback should be used. |
"""

content = content.replace("## The Problem: 3D Web Payload Bottleneck", what_it_does + "\n\n" + before_after + "\n\n" + supported_backends + "\n\n" + quick_start + "\n\n## The Problem: 3D Web Payload Bottleneck")

# Find and replace API Reference section
api_ref_pattern = re.compile(r"### `NeuralTextureEngine`\n\n\| Method \| Returns \| Description \|\n\|:---\|:---\|:---\|\n(?:\|[^\n]+\n)+")
content = api_ref_pattern.sub(api_ref_addition.strip() + "\n", content)

with open('README.md', 'w') as f:
    f.write(content)
