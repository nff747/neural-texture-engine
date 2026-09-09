import * as THREE from 'three';
import { NeuralTextureEngine, WebGPUCapabilityProfiler } from 'neural-texture-engine';

async function init() {
  const profile = await WebGPUCapabilityProfiler.profileCapability();
  console.log('Engine profile:', profile);

  const engine = new NeuralTextureEngine({ debug: true });
  await engine.init();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Generate low res
  const textureConfig = { resolution: 256, useUpscale: false };
  const lowResMaterialDesc = {
    baseColor: [0.8, 0.1, 0.2, 1],
    roughnessRange: [0.2, 0.8],
    metallic: 0.5,
    noiseScale: 10,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.5,
    warpStrength: 1.0,
    patternType: 1,
    seed: 42,
  };

  // Setup Three.js meshes
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  
  // Create dummy textures to display something before engine finishes
  const dummyTex = new THREE.DataTexture(new Uint8Array([255,0,0,255]), 1, 1, THREE.RGBAFormat);
  dummyTex.needsUpdate = true;

  const matLeft = new THREE.MeshStandardMaterial({ map: dummyTex });
  const sphereLeft = new THREE.Mesh(geometry, matLeft);
  sphereLeft.position.x = -1.5;
  scene.add(sphereLeft);

  const matRight = new THREE.MeshStandardMaterial({ map: dummyTex });
  const sphereRight = new THREE.Mesh(geometry, matRight);
  sphereRight.position.x = 1.5;
  scene.add(sphereRight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    sphereLeft.rotation.y += 0.01;
    sphereRight.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();

  // Engine upscale logic (simulated connection)
  // In a real scenario, we'd grab the result from engine.generate(...)
  // and assign to matLeft.map and matRight.map respectively.
}

init();
