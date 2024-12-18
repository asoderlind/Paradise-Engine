import * as THREE from "three";
import { ControlledProgramVariables } from "@/types";

class OceanGerstner {
  controlledVariables!: ControlledProgramVariables;

  ms_Renderer!: THREE.WebGLRenderer;
  ms_Scene!: THREE.Scene;
  ms_Camera!: THREE.PerspectiveCamera;
  oceanMesh!: THREE.Mesh;
  geometry!: THREE.PlaneGeometry;
  material!: THREE.ShaderMaterial;

  // Wave parameters (passed to shader as uniforms)
  waveParams = [
    {
      amplitude: 5.0,
      direction: new THREE.Vector2(1, 0),
      frequency: 0.1,
      phase: 0.0,
    },
  ];

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    mainCamera: THREE.PerspectiveCamera,
    options: ControlledProgramVariables,
  ) {
    this.controlledVariables = options;
    this.ms_Renderer = renderer;
    this.ms_Scene = scene;
    this.ms_Camera = mainCamera;

    // Create plane geometry
    this.geometry = new THREE.PlaneGeometry(512, 512, 256, 256);
    this.geometry.rotateX(-Math.PI / 2); // Make it horizontal

    // Shader material for Gerstner waves
    this.material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader(),
      fragmentShader: this.fragmentShader(),
      uniforms: {
        u_time: { value: 0.0 },
        u_waveParams: { value: this.flattenWaveParams(this.waveParams) },
      },
      wireframe: false,
    });

    // Create mesh and add to scene
    this.oceanMesh = new THREE.Mesh(this.geometry, this.material);
    this.ms_Scene.add(this.oceanMesh);
  }

  Update(deltaT: number) {
    // Update time uniform for wave animation
    this.material.uniforms.u_time.value += deltaT;
  }

  // Helper function to flatten wave parameters for the shader
  private flattenWaveParams(
    waves: {
      amplitude: number;
      direction: THREE.Vector2;
      frequency: number;
      phase: number;
    }[],
  ) {
    const data = [];
    for (const wave of waves) {
      data.push(
        wave.direction.x,
        wave.direction.y,
        wave.amplitude,
        wave.frequency,
        wave.phase,
      );
    }
    return new Float32Array(data);
  }

  // Vertex shader for Gerstner waves
  private vertexShader() {
    return `
      uniform float u_time;
      uniform float u_waveParams[15]; // 3 waves * 5 components each

      void main() {
        vec3 pos = position;

        for (int i = 0; i < 3; i++) {
          vec2 dir = vec2(u_waveParams[i * 5], u_waveParams[i * 5 + 1]);
          float amplitude = u_waveParams[i * 5 + 2];
          float frequency = u_waveParams[i * 5 + 3];
          float phase = u_waveParams[i * 5 + 4];

          float wave = amplitude * sin(dot(dir, pos.xz) * frequency - u_time + phase);
          pos.y += wave;
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  // Fragment shader for coloring
  private fragmentShader() {
    return `
      void main() {
        gl_FragColor = vec4(0.0, 0.5, 0.8, 1.0); // Ocean blue color
      }
    `;
  }
}

export default OceanGerstner;
