// ═══════════════════════════════════════════════════════════════════
// Neural Texture Engine — Noise Primitives (WGSL)
// Simplex noise, FBM, Voronoi, and domain warping on the GPU.
// All functions are designed for real-time 4K procedural generation.
// ═══════════════════════════════════════════════════════════════════

// ── Permutation table (precomputed, seedable) ───────────────────
@group(0) @binding(0) var<storage, read> perm_table: array<u32, 512>;

// ── Utility ─────────────────────────────────────────────────────
fn mod289_3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_4(x: vec4<f32>) -> vec4<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec4<f32>) -> vec4<f32> {
    return mod289_4(((x * 34.0) + 10.0) * x);
}

fn taylor_inv_sqrt(r: vec4<f32>) -> vec4<f32> {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// ── 3D Simplex Noise ────────────────────────────────────────────
// Returns value in [-1, 1]. Gradient-based, isotropic, ~O(1).
// Based on Ashima Arts / Stefan Gustavson formulation, ported to WGSL.
fn simplex_noise_3d(v: vec3<f32>) -> f32 {
    let C = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);
    let D = vec4<f32>(0.0, 0.5, 1.0, 2.0);

    // First corner
    var i = floor(v + dot(v, vec3<f32>(C.y, C.y, C.y)));
    let x0 = v - i + dot(i, vec3<f32>(C.x, C.x, C.x));

    // Other corners
    let g = step(x0.yzx, x0.xyz);
    let l = 1.0 - g;
    let i1 = min(g.xyz, l.zxy);
    let i2 = max(g.xyz, l.zxy);

    let x1 = x0 - i1 + C.x;
    let x2 = x0 - i2 + C.y;
    let x3 = x0 - D.yyy;

    // Permutations
    i = mod289_3(i);
    let p = permute(permute(permute(
        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));

    // Gradients: 7x7 points over a square, mapped onto an octahedron
    let n_ = 0.142857142857; // 1.0/7.0
    let ns = n_ * D.wyz - D.xzx;

    let j = p - 49.0 * floor(p * ns.z * ns.z);

    let x_ = floor(j * ns.z);
    let y_ = floor(j - 7.0 * x_);

    let x = x_ * ns.x + ns.yyyy;
    let y = y_ * ns.x + ns.yyyy;
    let h = 1.0 - abs(x) - abs(y);

    let b0 = vec4<f32>(x.xy, y.xy);
    let b1 = vec4<f32>(x.zw, y.zw);

    let s0 = floor(b0) * 2.0 + 1.0;
    let s1 = floor(b1) * 2.0 + 1.0;
    let sh = -step(h, vec4<f32>(0.0, 0.0, 0.0, 0.0));

    let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    let a1 = b1.xzyw + s1.xzyw * sh.zzww;

    var p0 = vec3<f32>(a0.xy, h.x);
    var p1 = vec3<f32>(a0.zw, h.y);
    var p2 = vec3<f32>(a1.xy, h.z);
    var p3 = vec3<f32>(a1.zw, h.w);

    // Normalise gradients
    let norm = taylor_inv_sqrt(vec4<f32>(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix contributions
    var m = max(0.5 - vec4<f32>(
        dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));
    m = m * m;
    return 105.0 * dot(m * m, vec4<f32>(
        dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ── Fractional Brownian Motion ──────────────────────────────────
// Layered simplex noise with configurable octaves, lacunarity, and gain.
// Produces natural-looking turbulence for surface detail.
//
// Spectral model:
//   F(p) = Σ_{i=0}^{N-1} gain^i · noise(p · lacunarity^i)
//
// Default params: octaves=6, lacunarity=2.0, gain=0.5
fn fbm(p: vec3<f32>, octaves: u32, lacunarity: f32, gain: f32) -> f32 {
    var sum = 0.0;
    var amplitude = 1.0;
    var frequency = 1.0;
    var max_amplitude = 0.0;
    var pos = p;

    for (var i = 0u; i < octaves; i++) {
        sum += amplitude * simplex_noise_3d(pos * frequency);
        max_amplitude += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return sum / max_amplitude;
}

// ── Voronoi / Worley Noise ──────────────────────────────────────
// Cell-based noise, useful for organic patterns (stone, skin, scales).
// Returns (F1, F2) distances for edge detection via F2-F1.
fn voronoi(p: vec3<f32>) -> vec2<f32> {
    let pi = floor(p);
    let pf = fract(p);

    var d1 = 1e10;
    var d2 = 1e10;

    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let offset = vec3<f32>(f32(x), f32(y), f32(z));
                let cell = pi + offset;
                // Hash-based random point placement
                let h = fract(sin(vec3<f32>(
                    dot(cell, vec3<f32>(127.1, 311.7, 74.7)),
                    dot(cell, vec3<f32>(269.5, 183.3, 246.1)),
                    dot(cell, vec3<f32>(113.5, 271.9, 124.6))
                )) * 43758.5453123);

                let point = offset + h - pf;
                let dist = dot(point, point);

                if (dist < d1) {
                    d2 = d1;
                    d1 = dist;
                } else if (dist < d2) {
                    d2 = dist;
                }
            }
        }
    }

    return vec2<f32>(sqrt(d1), sqrt(d2));
}

// ── Domain Warping ──────────────────────────────────────────────
// Feeds noise output back as coordinate offset, producing organic
// distortion patterns. Two-pass warp for maximum complexity.
//
// Formulation:
//   warp(p) = fbm(p + fbm(p + fbm(p)))
fn domain_warp(p: vec3<f32>, strength: f32) -> f32 {
    let q = vec3<f32>(
        fbm(p + vec3<f32>(0.0, 0.0, 0.0), 4u, 2.0, 0.5),
        fbm(p + vec3<f32>(5.2, 1.3, 2.8), 4u, 2.0, 0.5),
        fbm(p + vec3<f32>(1.7, 9.2, 3.4), 4u, 2.0, 0.5)
    );

    let r = vec3<f32>(
        fbm(p + strength * q + vec3<f32>(1.7, 9.2, 0.0), 4u, 2.0, 0.5),
        fbm(p + strength * q + vec3<f32>(8.3, 2.8, 4.1), 4u, 2.0, 0.5),
        fbm(p + strength * q + vec3<f32>(3.1, 6.5, 7.2), 4u, 2.0, 0.5)
    );

    return fbm(p + strength * r, 6u, 2.0, 0.5);
}
