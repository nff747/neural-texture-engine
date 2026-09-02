// ═══════════════════════════════════════════════════════════════════
// Neural Texture Engine — AI Upscaling Compute Shader (WGSL)
//
// Implements a lightweight ESPCN (Efficient Sub-Pixel Convolutional
// Neural Network) for 4× upscaling. The model is quantized to INT8
// and executed entirely on the GPU via WebGPU compute.
//
// Architecture:
//   Input (H×W×3) → Conv 5×5×64 → ReLU
//                  → Conv 3×3×32 → ReLU
//                  → Conv 3×3×(3×r²) → PixelShuffle(r=4)
//                  → Output (4H×4W×3)
//
// All weights are INT8 quantized with per-channel scale factors.
// Inference is done in FP32 after online dequantization.
//
// Memory layout:
//   Weights buffer: packed INT8 as u32 (4 weights per u32)
//   Scale buffer: per-output-channel FP32 scale factors
//   Bias buffer: per-output-channel FP32 biases
// ═══════════════════════════════════════════════════════════════════

struct UpscaleParams {
    input_width:   u32,
    input_height:  u32,
    output_width:  u32,
    output_height: u32,
    scale_factor:  u32,   // upscale factor (4)
    layer_index:   u32,   // current layer being executed
    in_channels:   u32,
    out_channels:  u32,
    kernel_size:   u32,
    _pad0:         u32,
    _pad1:         u32,
    _pad2:         u32,
};

@group(0) @binding(0) var<uniform>              params:  UpscaleParams;
@group(0) @binding(1) var<storage, read>         weights: array<u32>;  // packed INT8
@group(0) @binding(2) var<storage, read>         scales:  array<f32>;  // per-channel
@group(0) @binding(3) var<storage, read>         biases:  array<f32>;  // per-channel
@group(0) @binding(4) var input_tex:             texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(5) var output_tex:            texture_storage_2d<rgba8unorm, write>;
// Intermediate feature maps stored as storage buffers
@group(0) @binding(6) var<storage, read_write>   feature_map: array<f32>;

// ── INT8 dequantization ─────────────────────────────────────────
// Unpacks 4 INT8 values from a single u32 and dequantizes to FP32.
//
// Quantization scheme: w_fp32 = w_int8 × scale[channel]
// This gives us 4× memory compression vs FP32 weights with
// negligible quality loss for upscaling networks.
fn dequant_int8(packed: u32, idx: u32) -> f32 {
    let shift = (idx % 4u) * 8u;
    var byte_val = (packed >> shift) & 0xFFu;

    // Sign extension: if bit 7 is set, value is negative
    var signed_val: i32;
    if (byte_val >= 128u) {
        signed_val = i32(byte_val) - 256;
    } else {
        signed_val = i32(byte_val);
    }

    return f32(signed_val);
}

// ── Convolution kernel ──────────────────────────────────────────
// General NxN convolution with dequantized INT8 weights.
// Assumes zero-padding (out-of-bounds samples = 0).
fn conv2d(
    x: i32, y: i32,
    out_ch: u32,
) -> f32 {
    let half_k = i32(params.kernel_size / 2u);
    var sum = biases[out_ch];
    let w = params.input_width;

    for (var ic = 0u; ic < params.in_channels; ic++) {
        for (var ky = -half_k; ky <= half_k; ky++) {
            for (var kx = -half_k; kx <= half_k; kx++) {
                let sx = x + kx;
                let sy = y + ky;

                // Zero-padding boundary check
                if (sx < 0 || sy < 0 || sx >= i32(params.input_width) || sy >= i32(params.input_height)) {
                    continue;
                }

                // Read input value from feature map
                let in_idx = ic * params.input_width * params.input_height
                           + u32(sy) * params.input_width + u32(sx);
                let input_val = feature_map[in_idx];

                // Weight index: [out_ch][ic][ky][kx]
                let k_size = params.kernel_size;
                let w_idx = out_ch * params.in_channels * k_size * k_size
                          + ic * k_size * k_size
                          + u32(ky + half_k) * k_size
                          + u32(kx + half_k);

                // Dequantize weight
                let packed_idx = w_idx / 4u;
                let byte_idx = w_idx % 4u;
                let weight = dequant_int8(weights[packed_idx], byte_idx) * scales[out_ch];

                sum += input_val * weight;
            }
        }
    }

    return sum;
}

// ── ReLU activation ─────────────────────────────────────────────
fn relu(x: f32) -> f32 {
    return max(0.0, x);
}

// ── Pixel Shuffle (sub-pixel convolution) ───────────────────────
// Rearranges (C×r², H, W) → (C, H×r, W×r)
// This is the key operation that converts channel depth into
// spatial resolution, enabling learned upsampling.
//
// For r=4, output channel c at position (x,y) maps to:
//   input channel: c × r² + (y % r) × r + (x % r)
//   input position: (x / r, y / r)
fn pixel_shuffle(ox: u32, oy: u32, oc: u32) -> f32 {
    let r = params.scale_factor;
    let ix = ox / r;
    let iy = oy / r;
    let sub_x = ox % r;
    let sub_y = oy % r;

    let in_channel = oc * r * r + sub_y * r + sub_x;
    let idx = in_channel * params.input_width * params.input_height
            + iy * params.input_width + ix;

    return feature_map[idx];
}

// ── Main compute entry point ────────────────────────────────────
// This shader is dispatched multiple times per upscale operation:
//   Pass 0: Load input texture into feature_map buffer
//   Pass 1: Conv 5×5, 3→64 channels + ReLU
//   Pass 2: Conv 3×3, 64→32 channels + ReLU
//   Pass 3: Conv 3×3, 32→48 channels (3 × 4²) + PixelShuffle
//   Pass 4: Write output texture
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    switch params.layer_index {
        // Pass 0: Texture → Feature map
        case 0u: {
            if (gid.x >= params.input_width || gid.y >= params.input_height) { return; }
            let color = textureLoad(input_tex, vec2<i32>(i32(gid.x), i32(gid.y)));
            let base = gid.y * params.input_width + gid.x;
            let plane = params.input_width * params.input_height;
            feature_map[0u * plane + base] = color.r;
            feature_map[1u * plane + base] = color.g;
            feature_map[2u * plane + base] = color.b;
        }

        // Pass 1-2: Convolution + ReLU
        case 1u, 2u: {
            if (gid.x >= params.input_width || gid.y >= params.input_height) { return; }
            let out_ch = gid.z;
            if (out_ch >= params.out_channels) { return; }
            let val = relu(conv2d(i32(gid.x), i32(gid.y), out_ch));
            let idx = out_ch * params.input_width * params.input_height
                    + gid.y * params.input_width + gid.x;
            feature_map[idx] = val;
        }

        // Pass 3: Final conv (no ReLU — output layer)
        case 3u: {
            if (gid.x >= params.input_width || gid.y >= params.input_height) { return; }
            let out_ch = gid.z;
            if (out_ch >= params.out_channels) { return; }
            let val = conv2d(i32(gid.x), i32(gid.y), out_ch);
            let idx = out_ch * params.input_width * params.input_height
                    + gid.y * params.input_width + gid.x;
            feature_map[idx] = val;
        }

        // Pass 4: Pixel shuffle + write to output texture
        case 4u: {
            if (gid.x >= params.output_width || gid.y >= params.output_height) { return; }
            let r = pixel_shuffle(gid.x, gid.y, 0u);
            let g = pixel_shuffle(gid.x, gid.y, 1u);
            let b = pixel_shuffle(gid.x, gid.y, 2u);
            let color = vec4<f32>(
                clamp(r, 0.0, 1.0),
                clamp(g, 0.0, 1.0),
                clamp(b, 0.0, 1.0),
                1.0
            );
            textureStore(output_tex, vec2<i32>(i32(gid.x), i32(gid.y)), color);
        }

        default: {}
    }
}
