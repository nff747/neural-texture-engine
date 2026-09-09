import { NeuralTextureEngine, WebGPUCapabilityProfiler } from 'neural-texture-engine';

async function runDemo() {
  const profile = await WebGPUCapabilityProfiler.profileCapability();
  console.log('Supported Backend:', profile.mode);

  const engine = new NeuralTextureEngine({ debug: true });
  await engine.init();

  const ctxLow = document.getElementById('canvas-low').getContext('2d');
  const ctxHigh = document.getElementById('canvas-high').getContext('2d');

  ctxLow.fillStyle = '#ff0044';
  ctxLow.fillRect(0, 0, 256, 256);
  ctxLow.fillStyle = '#ffffff';
  ctxLow.font = '20px sans-serif';
  ctxLow.fillText('Low Res', 50, 128);

  ctxHigh.fillStyle = '#ff0044';
  ctxHigh.fillRect(0, 0, 1024, 1024);
  ctxHigh.fillStyle = '#ffffff';
  ctxHigh.font = '80px sans-serif';
  ctxHigh.fillText('High Res (Simulated AI Upscale)', 100, 512);
}

runDemo();
