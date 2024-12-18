/**
 * @author asoderlind / https://github.com/asoderlind
 *
 * Based on:
 * @author jbouny / https://github.com/fft-ocean
 * @author Aleksandr Albert / http://www.routter.co.tt
 */
import * as THREE from "three";
import oceanVertexShader from "static/shaders/ocean/oceanSim.vert.glsl";
import oceanSubtransform from "static/shaders/ocean/oceanSubtransform.frag.glsl";
import oceanInitial from "static/shaders/ocean/oceanInitial.frag.glsl";
import oceanPhase from "static/shaders/ocean/oceanPhase.frag.glsl";
import oceanSpectrum from "static/shaders/ocean/oceanSpectrum.frag.glsl";
import oceanNormals from "static/shaders/ocean/oceanNormals.frag.glsl";
import oceanMainVert from "static/shaders/ocean/oceanMain.vert.glsl";
import oceanMainFragmentShader from "static/shaders/ocean/oceanMain.frag.glsl";

import MirrorRenderer from "@/Components/OceanComponents/MirrorRenderer";

interface OceanParameters {
  INITIAL_SIZE: number;
  INITIAL_WIND_X: number;
  INITIAL_WIND_Y: number;
  INITIAL_CHOPPINESS: number;
  SUN_DIRECTION: THREE.Vector3;
  OCEAN_COLOR: THREE.Vector3;
  EXPOSURE: number;
  GEOMETRY_RESOLUTION: number;
  GEOMETRY_SIZE: number;
  RESOLUTION: number;
  SIZE_OF_FLOAT: number;
}

class Ocean {
  // Cameras
  oceanCamera: THREE.OrthographicCamera;

  // Three.js Core Components
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  oceanMesh!: THREE.Mesh;
  mirror: MirrorRenderer; // Assuming MirrorRenderer is properly typed

  // Environmental Properties
  sunDirection: THREE.Vector3;
  oceanColor: THREE.Vector3;
  exposure: number;

  // Simulation Parameters
  geometryResolution: number;
  geometrySize: number;
  resolution: number;
  floatSize: number;
  windX: number;
  windY: number;
  size: number;
  choppiness: number;

  // Flags
  changed = true;
  initial = true;

  // Framebuffers (Render Targets)
  initialSpectrumFramebuffer: THREE.WebGLRenderTarget;
  spectrumFramebuffer: THREE.WebGLRenderTarget;
  pingPhaseFramebuffer: THREE.WebGLRenderTarget;
  pongPhaseFramebuffer: THREE.WebGLRenderTarget;
  pingTransformFramebuffer: THREE.WebGLRenderTarget;
  pongTransformFramebuffer: THREE.WebGLRenderTarget;
  displacementMapFramebuffer: THREE.WebGLRenderTarget;
  normalMapFramebuffer: THREE.WebGLRenderTarget;

  // Shader Materials
  materialOceanHorizontal: THREE.ShaderMaterial;
  materialOceanVertical: THREE.ShaderMaterial;
  materialInitialSpectrum: THREE.ShaderMaterial;
  materialPhase: THREE.ShaderMaterial;
  materialSpectrum: THREE.ShaderMaterial;
  materialNormal: THREE.ShaderMaterial;
  materialOcean: THREE.ShaderMaterial;

  // Meshes
  screenQuad!: THREE.Mesh;

  // Textures
  pingPhaseTexture!: THREE.DataTexture;

  // Animation and State
  deltaTime!: number;
  pingPhase!: boolean;

  // Override Material (if used)
  overrideMaterial!: THREE.Material | null;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    options: OceanParameters,
  ) {
    // Assign required parameters as object properties
    this.oceanCamera = new THREE.OrthographicCamera(); //camera.clone();
    this.oceanCamera.position.z = 1;
    this.renderer = renderer;

    this.scene = new THREE.Scene();

    // Create mirror rendering
    this.mirror = new MirrorRenderer(renderer, camera, scene, {
      clipBias: 0.04,
    });
    this.mirror.position.y = -10.0;

    // Assign optional parameters as object properties
    options = options || {};

    // The direction of the sun
    this.sunDirection =
      options.SUN_DIRECTION || new THREE.Vector3(-1.0, 1.0, 1.0);

    // The color of the ocean
    this.oceanColor =
      options.OCEAN_COLOR || new THREE.Vector3(0.004, 0.016, 0.047);

    // The exposure of the ocean
    this.exposure = options.EXPOSURE || 0.35;

    // The resolution of the ocean mesh
    this.geometryResolution = options.GEOMETRY_RESOLUTION || 32;

    // The size of the ocean mesh
    this.geometrySize = options.GEOMETRY_SIZE || 2000;

    // The resolution of the spectrum
    this.resolution = options.RESOLUTION || 64;

    // The size of a float in bytes
    this.floatSize = options.SIZE_OF_FLOAT || 4;

    // The wind speed
    this.windX = options.INITIAL_WIND_X;
    this.windY = options.INITIAL_WIND_Y;

    // The size of the ocean mesh
    this.size = options.INITIAL_SIZE || 250.0;

    // The choppiness of the ocean
    this.choppiness = options.INITIAL_CHOPPINESS || 1.5;

    // Setup framebuffer pipeline
    const BaseParams = {
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
      premultiplyAlpha: false,
      type: THREE.FloatType,
    };

    // NearestClampParams is used for the ping/pong phase textures
    const NearestClampParams = {
      ...BaseParams,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    };

    // NearestRepeatParams is used for the initial spectrum
    const NearestRepeatParams = {
      ...BaseParams,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    };

    // LinearRepeatParams is used for the displacement and normal maps
    const LinearRepeatParams = {
      ...BaseParams,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    };

    // The initialSpectrumFramebuffer is used to store the initial spectrum
    this.initialSpectrumFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestRepeatParams,
    );

    // The spectrumFramebuffer is used to store the spectrum
    this.spectrumFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestClampParams,
    );

    // The pingPhaseFramebuffer is used to store the result of the FFT
    this.pingPhaseFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestClampParams,
    );

    // The pongPhaseFramebuffer is used to store the result of the FFT
    this.pongPhaseFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestClampParams,
    );
    /*
     * The pingTransformFramebuffer is used to store the result of the FFT
     */
    this.pingTransformFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestClampParams,
    );
    /*
     * The pongTransformFramebuffer is used to store the result of the FFT
     */
    this.pongTransformFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      NearestClampParams,
    );
    /*
     * The displacement map framebuffer is used to store the height of the ocean mesh
     */
    this.displacementMapFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      LinearRepeatParams,
    );
    /*
     * The normal map framebuffer is used to store the normals of the ocean mesh
     */
    this.normalMapFramebuffer = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      LinearRepeatParams,
    );

    /*
     * Description: A deep water ocean shader set
     * based on an implementation of a Tessendorf Waves
     * originally presented by David Li ( www.david.li/waves )
     *
     * The general method is to apply shaders to simulation Framebuffers
     * and then sample these framebuffers when rendering the ocean mesh
     *
     * The set uses 7 shaders:
     *
     * -- Simulation shaders
     * oceanVertexShader     -> Vertex shader used to set up a 2x2 simulation plane centered at (0,0)
     * oceanSubtransform     -> Fragment shader used to subtransform the mesh (generates the displacement map)
     * oceanInitial          -> Fragment shader used to set intitial wave frequency at a texel coordinate
     * oceanPhase            -> Fragment shader used to set wave phase at a texel coordinate
     * oceanSpectrum         -> Fragment shader used to set current wave frequency at a texel coordinate
     * oceanNormals          -> Fragment shader used to set face normals at a texel coordinate
     *
     * -- Rendering Shader
     * oceanMain[Vert/Frag]  -> Vertex and Fragment shader used to create the final render
     */

    // Horizontal wave vertices used for FFT
    this.materialOceanHorizontal = new THREE.ShaderMaterial({
      uniforms: {
        u_transformSize: { value: this.resolution },
        u_subtransformSize: { value: 250 },
        u_input: { value: null },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: "#define HORIZONTAL \n" + oceanSubtransform,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });
    this.materialOceanHorizontal.depthTest = false;

    // Vertical wave vertices used for FFT
    this.materialOceanVertical = new THREE.ShaderMaterial({
      uniforms: {
        u_transformSize: { value: this.resolution },
        u_subtransformSize: { value: 250 },
        u_input: { value: null },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: oceanSubtransform,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Initial spectrum used to generate height map
    this.materialInitialSpectrum = new THREE.ShaderMaterial({
      uniforms: {
        u_size: { value: 250.0 },
        u_wind: { value: new THREE.Vector2() },
        u_resolution: { value: this.resolution },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: oceanInitial,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Phases used to animate heightmap
    this.materialPhase = new THREE.ShaderMaterial({
      uniforms: {
        u_phases: { value: null },
        u_deltaTime: { value: null },
        u_size: { value: null },
        u_resolution: { value: this.resolution },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: oceanPhase,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Shader used to update spectrum
    this.materialSpectrum = new THREE.ShaderMaterial({
      uniforms: {
        u_size: { value: null },
        u_phases: { value: null },
        u_initialSpectrum: { value: null },
        u_resolution: { value: this.resolution },
        u_choppiness: { value: this.choppiness },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: oceanSpectrum,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Shader used to update spectrum normals
    this.materialNormal = new THREE.ShaderMaterial({
      uniforms: {
        u_size: { value: null },
        u_displacementMap: { value: null },
        u_resolution: { value: this.resolution },
      },
      vertexShader: oceanVertexShader,
      fragmentShader: oceanNormals,
      depthTest: false,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Shader used to update normals
    this.materialOcean = new THREE.ShaderMaterial({
      uniforms: {
        u_size: { value: null },
        u_cameraPosition: { value: null },
        u_geometrySize: { value: this.resolution },
        u_displacementMap: {
          value: this.displacementMapFramebuffer.texture,
        },
        u_reflection: { value: this.mirror.texture.texture },
        u_mirrorMatrix: { value: this.mirror.textureMatrix },
        u_normalMap: { value: this.normalMapFramebuffer.texture },
        u_oceanColor: { value: this.oceanColor },
        u_sunDirection: { value: this.sunDirection },
        u_exposure: { value: this.exposure },
      },
      vertexShader: oceanMainVert,
      fragmentShader: oceanMainFragmentShader,
      side: THREE.FrontSide,
      blending: THREE.NoBlending,
      glslVersion: THREE.GLSL3,
    });

    // Create the simulation plane
    this.screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.screenQuad);

    // create debug plane 1
    const geo1 = new THREE.PlaneGeometry(100, 100);
    geo1.rotateY(-Math.PI);
    geo1.translate(-55, 60, 0);
    const material1 = new THREE.MeshBasicMaterial({
      map: this.displacementMapFramebuffer.texture,
    });
    scene.add(new THREE.Mesh(geo1, material1));

    // create debug plane 2
    const geo2 = new THREE.PlaneGeometry(100, 100);
    geo2.rotateY(-Math.PI);
    geo2.translate(55, 60, 0);
    const material2 = new THREE.MeshBasicMaterial({
      map: this.normalMapFramebuffer.texture,
    });
    scene.add(new THREE.Mesh(geo2, material2));

    const geo3 = new THREE.PlaneGeometry(100, 100);
    geo3.rotateY(-Math.PI);
    geo3.translate(-55, 165, 0);
    const material3 = new THREE.MeshBasicMaterial({
      map: this.mirror.texture.texture,
    });
    scene.add(new THREE.Mesh(geo3, material3));

    const xoffset = 60;
    /* psd planes */
    // first plane for psd (out of 4)
    const texture11 = this.spectrumFramebuffer.texture;
    texture11.repeat.set(0.1, 0.1); // Use a portion of the texture
    texture11.offset.set(0.9, 0.9); // Move the texture to center it
    texture11.wrapS = THREE.ClampToEdgeWrapping;
    texture11.wrapT = THREE.ClampToEdgeWrapping;

    const geo11 = new THREE.PlaneGeometry(100, 100);
    geo11.rotateY(-Math.PI);
    geo11.translate(50 + xoffset, 165, 300);
    const material4 = new THREE.MeshBasicMaterial({
      map: texture11,
    });
    scene.add(new THREE.Mesh(geo11, material4));

    const geo12 = new THREE.PlaneGeometry(100, 100);
    geo12.rotateY(-Math.PI);
    geo12.rotateZ(-Math.PI / 2);
    geo12.translate(-50 + xoffset, 165, 300);
    const material5 = new THREE.MeshBasicMaterial({
      map: texture11,
    });
    scene.add(new THREE.Mesh(geo12, material5));

    const geo13 = new THREE.PlaneGeometry(100, 100);
    geo13.rotateY(-Math.PI);
    geo13.rotateZ(Math.PI / 2);
    geo13.translate(50 + xoffset, 265, 300);
    const material6 = new THREE.MeshBasicMaterial({
      map: texture11,
    });
    scene.add(new THREE.Mesh(geo13, material6));

    const geo14 = new THREE.PlaneGeometry(100, 100);
    geo14.rotateY(-Math.PI);
    geo14.rotateZ(Math.PI);
    geo14.translate(-50 + xoffset, 265, 300);
    const material7 = new THREE.MeshBasicMaterial({
      map: texture11,
    });
    scene.add(new THREE.Mesh(geo14, material7));

    // Initialise spectrum data
    this.generateSeedPhaseTexture();

    // Generate the ocean mesh
    const geometry = new THREE.PlaneGeometry(
      1,
      1,
      this.geometryResolution,
      this.geometryResolution,
    );
    this.oceanMesh = new THREE.Mesh(geometry, this.materialOcean);
    this.mirror.mesh = this.oceanMesh;
    camera.add(this.oceanMesh);
  }
  /*
   * Write to all the framebuffers, in order to render the ocean
   */
  render() {
    this.scene.overrideMaterial = null;

    if (this.changed) this.renderInitialSpectrum();

    this.mirror.render();
    this.renderWavePhase();
    this.renderSpectrum();
    this.renderSpectrumFFT();
    this.renderNormalMap();
    this.scene.overrideMaterial = null;
  }
  /*
   * Update the uniforms
   */
  update() {
    this.overrideMaterial = this.materialOcean;
    if (this.changed) {
      this.materialOcean.uniforms.u_size.value = this.size;
      this.materialOcean.uniforms.u_exposure.value = this.exposure;
      this.changed = false;
    }
    // Update the ocean material
    this.materialOcean.uniforms.u_normalMap.value =
      this.normalMapFramebuffer.texture;
    this.materialOcean.uniforms.u_displacementMap.value =
      this.displacementMapFramebuffer.texture;
    this.materialOcean.depthTest = true;
  }
  /*
   * This function generates a seed texture for the initial spectrum
   */
  generateSeedPhaseTexture() {
    this.pingPhase = true;
    const phaseArray = new window.Float32Array(
      this.resolution * this.resolution * 4,
    );
    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        phaseArray[i * this.resolution * 4 + j * 4] =
          Math.random() * 2.0 * Math.PI;
        phaseArray[i * this.resolution * 4 + j * 4 + 1] = 0.0;
        phaseArray[i * this.resolution * 4 + j * 4 + 2] = 0.0;
        phaseArray[i * this.resolution * 4 + j * 4 + 3] = 0.0;
      }
    }

    this.pingPhaseTexture = new THREE.DataTexture(
      phaseArray, // Data
      this.resolution, // Width
      this.resolution, // Height
      THREE.RGBAFormat, // Format
      THREE.FloatType, // Type
      undefined, // Mapping
      THREE.ClampToEdgeWrapping, // Wrapping
      THREE.ClampToEdgeWrapping, // Wrapping
      THREE.NearestFilter, // MinFilter
      THREE.NearestFilter, // MagFilter
    );
    this.pingPhaseTexture.needsUpdate = true;
  }
  /*
   * This function renders the initial spectrum to the initialSpectrumFramebuffer
   */
  renderInitialSpectrum() {
    // Select the initialSpectrum shader material
    this.scene.overrideMaterial = this.materialInitialSpectrum;

    // Set the uniform values
    this.materialInitialSpectrum.uniforms.u_wind.value.set(
      this.windX,
      this.windY,
    );
    this.materialInitialSpectrum.uniforms.u_size.value = this.size;

    // Render to the initialSpectrumFramebuffer
    this.renderer.setRenderTarget(this.initialSpectrumFramebuffer);
    this.renderer.render(this.scene, this.oceanCamera);
    this.renderer.setRenderTarget(null);
  }
  /*
   * This function renders to the pingPhaseFramebuffer or the pongPhaseFramebuffer
   * depending on the current state of the pingPhase flag
   */
  renderWavePhase() {
    // Select the phase shader material
    this.scene.overrideMaterial = this.materialPhase;

    // Set the uniform values
    if (this.initial) {
      this.materialPhase.uniforms.u_phases.value = this.pingPhaseTexture;
      this.initial = false;
    } else {
      this.materialPhase.uniforms.u_phases.value = this.pingPhase
        ? this.pingPhaseFramebuffer.texture
        : this.pongPhaseFramebuffer.texture;
    }
    this.materialPhase.uniforms.u_deltaTime.value = this.deltaTime;
    this.materialPhase.uniforms.u_size.value = this.size;

    // Render to pingPhase or pongPhase framebuffer
    this.renderer.setRenderTarget(
      this.pingPhase ? this.pongPhaseFramebuffer : this.pingPhaseFramebuffer,
    );
    this.renderer.render(this.scene, this.oceanCamera);
    this.renderer.setRenderTarget(null);

    // Swap the pingPhase flag
    this.pingPhase = !this.pingPhase;
  }
  /*
   * This function renders the spectrum to the spectrumFramebuffer
   */
  renderSpectrum() {
    this.scene.overrideMaterial = this.materialSpectrum;
    this.materialSpectrum.uniforms.u_initialSpectrum.value =
      this.initialSpectrumFramebuffer.texture;
    this.materialSpectrum.uniforms.u_phases.value = this.pingPhase
      ? this.pingPhaseFramebuffer.texture
      : this.pongPhaseFramebuffer.texture;
    this.materialSpectrum.uniforms.u_choppiness.value = this.choppiness;
    this.materialSpectrum.uniforms.u_size.value = this.size;

    // Render to the spectrumFramebuffer
    this.renderer.setRenderTarget(this.spectrumFramebuffer);
    this.renderer.render(this.scene, this.oceanCamera);
    this.renderer.setRenderTarget(null);
  }
  /*
   * This renderSpectrumFFT function renders the spectrum to the displacementMapFramebuffer
   */
  renderSpectrumFFT() {
    // GPU FFT using Stockham formulation
    const iterations = Math.log2(this.resolution) * 2; // log2

    this.scene.overrideMaterial = this.materialOceanHorizontal;
    let subtransformProgram = this.materialOceanHorizontal;

    // Processus 0-N
    // material = materialOceanHorizontal
    // 0 : material( spectrumFramebuffer ) > pingTransformFramebuffer
    // i%2==0 : material( pongTransformFramebuffer ) > pingTransformFramebuffer
    // i%2==1 : material( pingTransformFramebuffer ) > pongTransformFramebuffer
    // i == N/2 : material = materialOceanVertical
    // i%2==0 : material( pongTransformFramebuffer ) > pingTransformFramebuffer
    // i%2==1 : material( pingTransformFramebuffer ) > pongTransformFramebuffer
    // N-1 : materialOceanVertical( pingTransformFramebuffer / pongTransformFramebuffer ) > displacementMapFramebuffer
    let frameBuffer: THREE.WebGLRenderTarget;
    let inputBuffer: THREE.WebGLRenderTarget;

    for (let i = 0; i < iterations; i++) {
      if (i === 0) {
        inputBuffer = this.spectrumFramebuffer;
        frameBuffer = this.pingTransformFramebuffer;
      } else if (i === iterations - 1) {
        inputBuffer =
          iterations % 2 === 0
            ? this.pingTransformFramebuffer
            : this.pongTransformFramebuffer;
        frameBuffer = this.displacementMapFramebuffer;
      } else if (i % 2 === 1) {
        inputBuffer = this.pingTransformFramebuffer;
        frameBuffer = this.pongTransformFramebuffer;
      } else {
        inputBuffer = this.pongTransformFramebuffer;
        frameBuffer = this.pingTransformFramebuffer;
      }

      if (i === iterations / 2) {
        subtransformProgram = this.materialOceanVertical;
        this.scene.overrideMaterial = this.materialOceanVertical;
      }

      subtransformProgram.uniforms.u_input.value = inputBuffer.texture;

      subtransformProgram.uniforms.u_subtransformSize.value = Math.pow(
        2,
        (i % (iterations / 2)) + 1,
      );

      // Render to the frameBuffer
      this.renderer.setRenderTarget(frameBuffer);
      this.renderer.render(this.scene, this.oceanCamera);
      this.renderer.setRenderTarget(null);
    }
  }
  /*
   * This function renders the normals to the normalMapFramebuffer
   */
  renderNormalMap() {
    // Select the normal shader material
    this.scene.overrideMaterial = this.materialNormal;

    // Set the uniform values
    if (this.changed) this.materialNormal.uniforms.u_size.value = this.size;
    this.materialNormal.uniforms.u_displacementMap.value =
      this.displacementMapFramebuffer.texture;

    // Render to the normalMapFramebuffer
    this.renderer.setRenderTarget(this.normalMapFramebuffer);
    this.renderer.render(this.scene, this.oceanCamera);
    this.renderer.setRenderTarget(null);
  }
}

export default Ocean;
