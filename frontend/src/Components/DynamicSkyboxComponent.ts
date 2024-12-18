import * as THREE from "three";
import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "@/Components/ThreeJSComponent";
import skyVertexShader from "static/shaders/sky-vert.glsl";
import skyFragmentShader from "static/shaders/sky-frag.glsl";
import { ControlledVariables } from "@/types";

// Time constants in hours
const DAWN_START = 5.0;
const DAWN_PEAK = 6.0;
const NOON = 12.0;
const DUSK_START = 18.0;
const DUSK_PEAK = 19.0;

class DynamicSkyboxComponent extends Component {
  static CLASS_NAME = "DynamicSkyboxComponent";

  get NAME() {
    return DynamicSkyboxComponent.CLASS_NAME;
  }
  private readonly HOURS_PER_DAY = 24;
  private sky: THREE.Mesh;
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private params: ControlledVariables;
  private dayDuration: number = 60;

  // impossible start to ensure first broadcast
  private lastBroadcastHour = -1;

  private skyUniforms = {
    topColor: { value: new THREE.Color() },
    bottomColor: { value: new THREE.Color() },
    sunPosition: { value: new THREE.Vector3() },
    moonPosition: { value: new THREE.Vector3() },
    sunColor: { value: new THREE.Color() },
    moonColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    timeCycle: { value: 0.5 },
    uCloudNoiseScale: { value: 2 },
    uCloudDensity: { value: 1.0 },
    uCloudColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    uGalaxyTexture: {
      value: new THREE.TextureLoader().load("textures/galaxy.jpg"),
    },
  };

  constructor(options: ControlledVariables) {
    super();
    this.params = options;
    const skyGeo = new THREE.SphereGeometry(3000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
    });

    this.sky = new THREE.Mesh(skyGeo, skyMat);

    // Create lights
    this.sunLight = new THREE.DirectionalLight(0xffffeb, 1.0);
    this.sunLight.castShadow = true;

    this.moonLight = new THREE.DirectionalLight(0x8888ff, 0.2);
    this.moonLight.castShadow = true;

    this.ambientLight = new THREE.AmbientLight(0x404040);

    // Initialize sky colors
    this.calculateSkyColors(this.params.timeOfDay);
  }

  private calculateSkyColors(timeOfDay: number) {
    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    const zenithColor = new THREE.Color();
    const horizonColor = new THREE.Color();

    if (timeOfDay >= DAWN_START && timeOfDay < DAWN_PEAK) {
      const t = smoothstep(DAWN_START, DAWN_PEAK, timeOfDay);
      zenithColor
        .copy(this.params.nightColorZenith)
        .lerp(this.params.dawnColorZenith, t);
      horizonColor
        .copy(this.params.nightColorHorizon)
        .lerp(this.params.dawnColorHorizon, t);
    } else if (timeOfDay >= DAWN_PEAK && timeOfDay < NOON) {
      const t = smoothstep(DAWN_PEAK, NOON, timeOfDay);
      zenithColor
        .copy(this.params.dawnColorZenith)
        .lerp(this.params.noonColorZenith, t);
      horizonColor
        .copy(this.params.dawnColorHorizon)
        .lerp(this.params.noonColorHorizon, t);
    } else if (timeOfDay >= NOON && timeOfDay < DUSK_START) {
      const t = smoothstep(NOON, DUSK_START, timeOfDay);
      zenithColor
        .copy(this.params.noonColorZenith)
        .lerp(this.params.duskColorZenith, t);
      horizonColor
        .copy(this.params.noonColorHorizon)
        .lerp(this.params.duskColorHorizon, t);
    } else if (timeOfDay >= DUSK_START && timeOfDay < DUSK_PEAK) {
      const t = smoothstep(DUSK_START, DUSK_PEAK, timeOfDay);
      zenithColor
        .copy(this.params.duskColorZenith)
        .lerp(this.params.nightColorZenith, t);
      horizonColor
        .copy(this.params.duskColorHorizon)
        .lerp(this.params.nightColorHorizon, t);
    } else {
      zenithColor.copy(this.params.nightColorZenith);
      horizonColor.copy(this.params.nightColorHorizon);
    }

    this.skyUniforms.topColor.value.copy(zenithColor);
    this.skyUniforms.bottomColor.value.copy(horizonColor);

    this.skyUniforms.uCloudNoiseScale.value = this.params.uCloudNoiseScale;
    this.skyUniforms.uCloudDensity.value = this.params.uCloudDensity;
    this.skyUniforms.uCloudColor.value.copy(this.params.uCloudColor);
  }

  private calculateAmbientIntensity(timeOfDay: number): number {
    const t = (timeOfDay % this.HOURS_PER_DAY) / this.HOURS_PER_DAY;
    const noonDistance = Math.abs(t - 0.5);
    const baseIntensity = Math.cos(noonDistance * Math.PI) * 0.5 + 0.5;

    const dawnEffect = Math.exp(
      -Math.pow(t - DAWN_PEAK / this.HOURS_PER_DAY, 2) * 300,
    );
    const duskEffect = Math.exp(
      -Math.pow(t - DUSK_PEAK / this.HOURS_PER_DAY, 2) * 300,
    );

    return Math.max(0.1, baseIntensity * 0.7 + (dawnEffect + duskEffect) * 0.3);
  }

  private calculateCelestialPositions(time: number) {
    // Convert time to radians, but shifted to align noon with highest point
    const angle = ((time - 6) / this.HOURS_PER_DAY) * Math.PI * 2;

    // Calculate sun position
    const radius = 800;
    const sunX = Math.cos(angle) * radius;
    const sunY = Math.sin(angle) * radius; // Y is up in our coordinate system
    const sunZ = 0;

    // Moon position (opposite to sun)
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = 0;

    this.skyUniforms.sunPosition.value.set(sunX, sunY, sunZ);
    this.skyUniforms.moonPosition.value.set(moonX, moonY, moonZ);

    // Update light positions
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.intensity = 0.4;

    // Calculate sun intensity based on height
    const sunHeight = Math.sin(angle);
    const sunIntensity = Math.max(0, sunHeight) * 1.5; // Increased intensity during day
    this.sunLight.intensity = sunIntensity;

    // Update colors
    let sunColor: THREE.Color;
    if (sunHeight > 0.5) {
      // Bright white-yellow during peak day
      sunColor = this.params.sunNoon.clone();
      sunColor.multiplyScalar(1.5); // Make it brighter
    } else if (sunHeight > 0) {
      // Dawn/Dusk
      const t = sunHeight * 2;
      if (time < 12) {
        sunColor = this.params.sunDawn.clone().lerp(this.params.sunNoon, t);
      } else {
        sunColor = this.params.sunNoon.clone().lerp(this.params.sunDusk, 1 - t);
      }
    } else {
      // Night
      sunColor = this.params.sunDusk.clone();
    }

    this.skyUniforms.sunColor.value.copy(sunColor);
    this.sunLight.color.copy(sunColor);

    // Calculate ambient light
    const ambientIntensity = this.calculateAmbientIntensity(time);
    this.ambientLight.intensity = ambientIntensity;

    // Update time cycle value for shader
    this.skyUniforms.timeCycle.value = Math.max(
      0,
      Math.min(1, (sunHeight + 1) / 2),
    );
  }

  // private getCurrentPhase(time: number): string {
  //   if (time >= DAWN_START && time < DAWN_PEAK) return "Dawn Start";
  //   if (time >= DAWN_PEAK && time < NOON) return "Morning";
  //   if (time === NOON) return "Noon";
  //   if (time > NOON && time < DUSK_START) return "Afternoon";
  //   if (time >= DUSK_START && time < DUSK_PEAK) return "Dusk";
  //   return "Night";
  // }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;
    const scene = threejs.scene;

    scene.add(this.sky);
    scene.add(this.sunLight);
    scene.add(this.moonLight);
    //scene.add(this.ambientLight);
  }

  Update(deltaTime: number) {
    // Update time of day
    this.params.timeOfDay =
      (this.params.timeOfDay +
        (deltaTime * this.HOURS_PER_DAY) / this.dayDuration) %
      this.HOURS_PER_DAY;
    const currentHour = Math.floor(this.params.timeOfDay);
    // Update colors and positions
    this.calculateSkyColors(this.params.timeOfDay);
    this.calculateCelestialPositions(this.params.timeOfDay);

    // // Debug current state
    // if (Math.floor(this.params.timeOfDay * 10) % 10 === 0) {
    //   // Log every 0.1 hour
    //   const timeStr = this.params.timeOfDay.toFixed(1);
    //   const phase = this.getCurrentPhase(this.params.timeOfDay);
    //   console.log(`Time: ${timeStr}h, Phase: ${phase}`);
    // }

    //broadcast time of day every whole hour(ish)
    if (currentHour !== this.lastBroadcastHour) {
      const particleEntity = this.FindEntity("particleSystemEntity");
      if (particleEntity) {
        particleEntity.Broadcast({
          topic: "update.timeOfDay",
          value: this.params.timeOfDay,
        });
      }

      this.lastBroadcastHour = currentHour;
    }
  }
}

export default DynamicSkyboxComponent;
