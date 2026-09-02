// ═══════════════════════════════════════════════════════════════════
// Neural Texture Engine — Procedural Generation Compute Shader
//
// Dispatched per-texel across a 4096×4096 output texture. Generates
// PBR material channels (albedo, normal, roughness, metallic, AO)
// from mesh UV coordinates and a material descriptor buffer.
//
// Workgroup size: 16×16 = 256 threads per workgroup
// Dispatch: ceil(4096/16) × ceil(4096/16) = 256×256 workgroups
// Total invocations: 16,777,216 (one per texel)
// ═══════════════════════════════════════════════════════════════════

// ── Bindings ────────────────────────────────────────────────────

struct MaterialDescriptor {
    base_color:      vec4<f32>,  // sRGB base tint
    roughness_range: vec2<f32>,  // (min, max) roughness
    metallic:        f32,        // metallic factor [0,1]
    noise_scale:     f32,        // world-space frequency multiplier
    octaves:         u32,        // FBM octave count
    lacunarity:      f32,        // frequency multiplier per octave
    gain:            f32,        // amplitude multiplier per octave
    warp_strength:   f32,        // domain warp intensity
    pattern_type:    u32,        // 0=organic, 1=mineral, 2=fabric, 3=tech
    seed:            f32,        // deterministic seed offset
    _pad0:           f32,
    _pad1:           f32,
};

struct TextureParams {
    resolution:    vec2<u32>,  // output texture dimensions
    uv_scale:      vec2<f32>,  // UV tiling factor
    time:          f32,        // animation time (optional)
    enable_normal: u32,        // generate normal map
    enable_ao:     u32,        // generate AO map
    _pad:          u32,
};

@group(0) @binding(0) var<uniform>             params:   TextureParams;
@group(0) @binding(1) var<storage, read>       material: MaterialDescriptor;
@group(0) @binding(2) var output_albedo:       texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var output_normal:       texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4) var output_roughness:    texture_storage_2d<r8unorm, write>;
@group(0) @binding(5) var output_ao:           texture_storage_2d<r8unorm, write>;

// ── Inlined noise (see noise.wgsl for full implementations) ─────

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

fn simplex_noise_3d(v: vec3<f32>) -> f32 {
    let C = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);
    let D = vec4<f32>(0.0, 0.5, 1.0, 2.0);
    var i = floor(v + dot(v, vec3<f32>(C.y)));
    let x0 = v - i + dot(i, vec3<f32>(C.x));
    let g = step(x0.yzx, x0.xyz);
    let l = 1.0 - g;
    let i1 = min(g.xyz, l.zxy);
    let i2 = max(g.xyz, l.zxy);
    let x1 = x0 - i1 + C.x;
    let x2 = x0 - i2 + C.y;
    let x3 = x0 - D.yyy;
    i = mod289_3(i);
    let p = permute(permute(permute(
        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));
    let n_ = 0.142857142857;
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
    let sh = -step(h, vec4<f32>(0.0));
    let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    let a1 = b1.xzyw + s1.xzyw * sh.zzww;
    var p0 = vec3<f32>(a0.xy, h.x);
    var p1 = vec3<f32>(a0.zw, h.y);
    var p2 = vec3<f32>(a1.xy, h.z);
    var p3 = vec3<f32>(a1.zw, h.w);
    let norm = taylor_inv_sqrt(vec4<f32>(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    var m = max(0.5 - vec4<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));
    m = m * m;
    return 105.0 * dot(m * m, vec4<f32>(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

fn fbm(p: vec3<f32>, octaves: u32, lacunarity: f32, gain: f32) -> f32 {
    var sum = 0.0;
    var amp = 1.0;
    var freq = 1.0;
    var max_amp = 0.0;
    for (var i = 0u; i < octaves; i++) {
        sum += amp * simplex_noise_3d(p * freq);
        max_amp += amp;
        amp *= gain;
        freq *= lacunarity;
    }
    return sum / max_amp;
}

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
                let h = fract(sin(vec3<f32>(
                    dot(cell, vec3<f32>(127.1, 311.7, 74.7)),
                    dot(cell, vec3<f32>(269.5, 183.3, 246.1)),
                    dot(cell, vec3<f32>(113.5, 271.9, 124.6))
                )) * 43758.5453123);
                let point = offset + h - pf;
                let dist = dot(point, point);
                if (dist < d1) { d2 = d1; d1 = dist; }
                else if (dist < d2) { d2 = dist; }
            }
        }
    }
    return vec2<f32>(sqrt(d1), sqrt(d2));
}

// ── Pattern generators ──────────────────────────────────────────

fn pattern_organic(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    let q = vec3<f32>(
        fbm(uv, 4u, mat.lacunarity, mat.gain),
        fbm(uv + vec3<f32>(5.2, 1.3, 2.8), 4u, mat.lacunarity, mat.gain),
        fbm(uv + vec3<f32>(1.7, 9.2, 3.4), 4u, mat.lacunarity, mat.gain)
    );
    return fbm(uv + mat.warp_strength * q, mat.octaves, mat.lacunarity, mat.gain);
}

fn pattern_mineral(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    let v = voronoi(uv * mat.noise_scale);
    let edge = smoothstep(0.0, 0.15, v.y - v.x);
    let surface = fbm(uv + vec3<f32>(v.x, v.y, 0.0), mat.octaves, mat.lacunarity, mat.gain);
    return mix(surface, edge, 0.6);
}

fn pattern_fabric(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    let warp = sin(uv.x * mat.noise_scale * 20.0) * cos(uv.y * mat.noise_scale * 20.0);
    let noise = fbm(uv + vec3<f32>(warp * 0.1), mat.octaves, mat.lacunarity, mat.gain);
    return mix(warp * 0.5 + 0.5, noise, 0.4);
}

fn pattern_tech(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    let grid = step(0.95, fract(uv.x * mat.noise_scale * 10.0))
             + step(0.95, fract(uv.y * mat.noise_scale * 10.0));
    let noise = fbm(uv, mat.octaves, mat.lacunarity, mat.gain) * 0.3;
    return clamp(grid + noise, 0.0, 1.0);
}

fn generate_pattern(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    switch mat.pattern_type {
        case 1u:  { return pattern_mineral(uv, mat); }
        case 2u:  { return pattern_fabric(uv, mat); }
        case 3u:  { return pattern_tech(uv, mat); }
        default:  { return pattern_organic(uv, mat); }
    }
}

// ── Normal map generation via central differences ───────────────
// Approximates ∂height/∂u and ∂height/∂v for tangent-space normals.
fn compute_normal(uv: vec3<f32>, mat: MaterialDescriptor) -> vec3<f32> {
    let eps = 1.0 / f32(params.resolution.x);
    let h_l = generate_pattern(uv - vec3<f32>(eps, 0.0, 0.0), mat);
    let h_r = generate_pattern(uv + vec3<f32>(eps, 0.0, 0.0), mat);
    let h_d = generate_pattern(uv - vec3<f32>(0.0, eps, 0.0), mat);
    let h_u = generate_pattern(uv + vec3<f32>(0.0, eps, 0.0), mat);

    let dx = (h_r - h_l) * 2.0;
    let dy = (h_u - h_d) * 2.0;

    let normal = normalize(vec3<f32>(-dx, -dy, 1.0));
    return normal * 0.5 + 0.5; // Encode to [0,1] for storage
}

// ── Ambient Occlusion (screen-space approximation) ──────────────
fn compute_ao(uv: vec3<f32>, mat: MaterialDescriptor) -> f32 {
    var ao = 0.0;
    let samples = 8u;
    let radius = 3.0 / f32(params.resolution.x);
    let center_h = generate_pattern(uv, mat);

    for (var i = 0u; i < samples; i++) {
        let angle = f32(i) * 6.283185 / f32(samples);
        let offset = vec3<f32>(cos(angle), sin(angle), 0.0) * radius;
        let sample_h = generate_pattern(uv + offset, mat);
        ao += max(0.0, center_h - sample_h);
    }

    return 1.0 - clamp(ao / f32(samples) * 4.0, 0.0, 1.0);
}

// ── Main compute entry point ────────────────────────────────────

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    // Bounds check
    if (gid.x >= params.resolution.x || gid.y >= params.resolution.y) {
        return;
    }

    let texel = vec2<i32>(i32(gid.x), i32(gid.y));
    let uv = vec2<f32>(
        f32(gid.x) / f32(params.resolution.x),
        f32(gid.y) / f32(params.resolution.y)
    ) * params.uv_scale;

    // 3D sample position (UV + seed offset for variation)
    let sample_pos = vec3<f32>(uv.x, uv.y, material.seed) * material.noise_scale;

    // Generate base pattern
    let pattern = generate_pattern(sample_pos, material);

    // ── Albedo ──
    let albedo = mix(
        material.base_color.rgb * 0.6,
        material.base_color.rgb,
        pattern
    );
    textureStore(output_albedo, texel, vec4<f32>(albedo, 1.0));

    // ── Normal map ──
    if (params.enable_normal == 1u) {
        let normal = compute_normal(sample_pos, material);
        textureStore(output_normal, texel, vec4<f32>(normal, 1.0));
    }

    // ── Roughness ──
    let roughness = mix(material.roughness_range.x, material.roughness_range.y, pattern);
    textureStore(output_roughness, texel, vec4<f32>(roughness, 0.0, 0.0, 1.0));

    // ── Ambient Occlusion ──
    if (params.enable_ao == 1u) {
        let ao = compute_ao(sample_pos, material);
        textureStore(output_ao, texel, vec4<f32>(ao, 0.0, 0.0, 1.0));
    }
}
