import * as THREE from "three";
import { GPUComputationRenderer, Variable } from "three/examples/jsm/Addons.js";
import windComputeShader from "static/shaders/wind-compute.glsl";

export class WindSystem {
  private gpuCompute!: GPUComputationRenderer;
  private noiseVariable!: Variable;
  private uniforms!: {
    time: { value: number };
  };
  private worldSize: number = 1000;
  private readonly NOISE_RESOLUTION = 512; // Resolution of our noise texture

  constructor(renderer: THREE.WebGLRenderer, worldSize: number = 1000) {
    if (!renderer.capabilities.isWebGL2) {
      console.error("WindSystem requires WebGL 2");
      return;
    }

    this.worldSize = worldSize;

    // Initialize GPUComputationRenderer
    this.gpuCompute = new GPUComputationRenderer(
      this.NOISE_RESOLUTION,
      this.NOISE_RESOLUTION,
      renderer,
    );

    // Create initial noise texture
    const noiseTexture = this.gpuCompute.createTexture();
    this.initNoiseTexture(noiseTexture);

    // Add variable to GPUComputation
    this.noiseVariable = this.gpuCompute.addVariable(
      "textureNoise",
      windComputeShader,
      noiseTexture,
    );

    // Create uniforms
    this.uniforms = {
      time: { value: 0 },
    };

    // Set variable dependencies and uniforms
    this.gpuCompute.setVariableDependencies(this.noiseVariable, [
      this.noiseVariable,
    ]);
    Object.assign(this.noiseVariable.material.uniforms, this.uniforms);

    // Check for initialization errors
    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error(`GPUComputation init error: ${error}`);
    }
  }

  private initNoiseTexture(texture: THREE.DataTexture) {
    const data = texture.image.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0; // Wind direction
      data[i + 1] = 0; // Wind lean
      data[i + 2] = 0; // Curvature
      data[i + 3] = 1; // Unused
    }
  }

  public update(deltaTime: number) {
    // Update time uniform
    this.uniforms.time.value = (this.uniforms.time.value + deltaTime) % 10000;

    // Compute next frame
    this.gpuCompute.compute();

    // Return current noise texture
    return this.gpuCompute.getCurrentRenderTarget(this.noiseVariable).texture;
  }

  public getWindUniforms() {
    return {
      windNoiseTexture: { value: null }, // Will be updated each frame
      terrainSize: { value: this.worldSize },
      terrainOffset: {
        value: new THREE.Vector2(this.worldSize * 0.5, this.worldSize * 0.5),
      },
    };
  }
}
