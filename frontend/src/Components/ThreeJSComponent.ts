import { Component } from "@/ComponentSystem/Component";
import { ControlledVariables } from "@/types";
import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import FPSController from "@/Components/FirstPersonControllerComponent";
import { Entity } from "@/ComponentSystem/Entity";

const DEBUG = true;

const worldPosition = new THREE.Vector3();

class ThreeJSComponent extends Component {
  static CLASS_NAME = "ThreeJSComponent";

  get NAME() {
    return ThreeJSComponent.CLASS_NAME;
  }

  mainCamera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  renderer!: THREE.WebGLRenderer;
  clock!: THREE.Clock;
  fps!: Stats;
  mps!: Stats;
  gui!: GUI;
  controls!: OrbitControls;
  controlledVariables!: ControlledVariables;

  constructor(options: ControlledVariables) {
    super();
    this.controlledVariables = options;
  }

  InitEntity() {
    this.initGUI();
    this.scene = new THREE.Scene();
    this.mainCamera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      6000,
    );
    this.mainCamera.position.set(
      this.controlledVariables.cameraPosition.x,
      this.controlledVariables.cameraPosition.y,
      this.controlledVariables.cameraPosition.z,
    );
    this.mainCamera.rotation.set(
      this.controlledVariables.cameraRotation.x,
      this.controlledVariables.cameraRotation.y,
      this.controlledVariables.cameraRotation.z,
    );

    this.scene.add(this.mainCamera);
    this.clock = new THREE.Clock();

    const canvas = document.querySelector(
      "canvas.threejs",
    ) as HTMLCanvasElement;

    // stats
    this.fps = new Stats();
    this.fps.showPanel(0);
    document.body.appendChild(this.fps.dom);

    this.mps = new Stats();
    this.mps.showPanel(1);
    this.mps.dom.style.left = "80px";
    document.body.appendChild(this.mps.dom);

    // renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor("black");

    // event listener for window resize
    window.addEventListener("resize", () => {
      this.mainCamera.aspect = window.innerWidth / window.innerHeight;
      this.mainCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.initControls();

    if (DEBUG === true) {
      const axishelper = new THREE.AxesHelper(2);
      this.scene.add(axishelper);
    }
  }

  Update() {
    // /* hard coded camera movement */
    // this.mainCamera.position.set(
    //   this.controlledVariables.cameraPosition.x,
    //   this.controlledVariables.cameraPosition.y,
    //   this.controlledVariables.cameraPosition.z,
    // );
    // this.mainCamera.rotation.setFromQuaternion(
    //   this.controlledVariables.cameraRotation,
    // );
    // /* end hard coded camera movement */
    this.mainCamera.getWorldPosition(worldPosition);
    this.renderer.render(this.scene, this.mainCamera);
    this.fps.update();
    this.mps.update();
  }

  // New method to access the main camera
  getMainCamera() {
    return this.mainCamera;
  }

  setCameraPosition(x: number, y: number, z: number) {
    this.mainCamera.position.set(x, y, z);
  }

  getControllers(folderName: string) {
    return this.gui.folders.find((f) => f.$title.textContent === folderName)
      ?.controllers;
  }

  initGUI() {
    this.gui = new GUI();
    const oceanRollup = this.gui.addFolder("Ocean");
    //const noiseRollup = this.gui.addFolder("Noise");
    const skyFolder = this.gui.addFolder("Sky Settings");
    if (
      this.controlledVariables.oceanWindSpeedX &&
      this.controlledVariables.oceanWindSpeedY
    ) {
      oceanRollup
        .add(this.controlledVariables, "oceanWindSpeedX", 0, 100, 1)
        .name("Wind Speed X");
      oceanRollup
        .add(this.controlledVariables, "oceanWindSpeedY", 0, 100, 0.1)
        .name("Wind Speed Y");
    }
    /*
    if (this.controlledVariables.noiseParams) {
      noiseRollup
        .add(this.controlledVariables.noiseParams, "scale", 1, 500, 1)
        .name("Scale");
      noiseRollup
        .add(this.controlledVariables.noiseParams, "lacunarity", 1, 3, 0.01)
        .name("Lacunarity");
      noiseRollup
        .add(this.controlledVariables.noiseParams, "H", 0, 1, 0.01)
        .name("Hurst Exponent");
      noiseRollup
        .add(this.controlledVariables.noiseParams, "numOctaves", 1, 20, 1)
        .name("Octaves");
      noiseRollup
        .add(this.controlledVariables.noiseParams, "height", 1, 100, 1)
        .name("Height");
    }
        */
    if (this.controlledVariables) {
      const timeOfDayController = skyFolder.add(
        this.controlledVariables,
        "timeOfDay",
        0,
        24,
        0.1,
      );
      timeOfDayController.name("Time of Day");
      // Dawn colors
      const dawnFolder = skyFolder.addFolder("Dawn Colors");
      dawnFolder
        .addColor(this.controlledVariables, "dawnColorZenith")
        .name("Dawn Zenith");
      dawnFolder
        .addColor(this.controlledVariables, "dawnColorHorizon")
        .name("Dawn Horizon");

      // Noon colors
      const noonFolder = skyFolder.addFolder("Noon Colors");
      noonFolder
        .addColor(this.controlledVariables, "noonColorZenith")
        .name("Noon Zenith");
      noonFolder
        .addColor(this.controlledVariables, "noonColorHorizon")
        .name("Noon Horizon");

      // Dusk colors
      const duskFolder = skyFolder.addFolder("Dusk Colors");
      duskFolder
        .addColor(this.controlledVariables, "duskColorZenith")
        .name("Dusk Zenith");
      duskFolder
        .addColor(this.controlledVariables, "duskColorHorizon")
        .name("Dusk Horizon");

      // Night colors
      const nightFolder = skyFolder.addFolder("Night Colors");
      nightFolder
        .addColor(this.controlledVariables, "nightColorZenith")
        .name("Night Zenith");
      nightFolder
        .addColor(this.controlledVariables, "nightColorHorizon")
        .name("Night Horizon");

      // Celestial colors
      const celestialFolder = skyFolder.addFolder("Celestial Colors");
      celestialFolder
        .addColor(this.controlledVariables, "sunDawn")
        .name("Sun Dawn");
      celestialFolder
        .addColor(this.controlledVariables, "sunNoon")
        .name("Sun Noon");
      celestialFolder
        .addColor(this.controlledVariables, "sunDusk")
        .name("Sun Dusk");
      celestialFolder
        .addColor(this.controlledVariables, "moon")
        .name("Moon Color");

      // boid folder
      const boidFolder = this.gui.addFolder("Boid Settings");
      boidFolder
        .add(this.controlledVariables, "cohesionWeight", 0, 300, 1)
        .name("Cohesion Weight");
      boidFolder
        .add(this.controlledVariables, "alignmentWeight", 0, 300, 1)
        .name("Alignment Weight");
      boidFolder
        .add(this.controlledVariables, "separationWeight", 0, 300, 1)
        .name("Separation Weight");
      boidFolder
        .add(this.controlledVariables, "maxSteerForce", 0, 1, 0.01)
        .name("Steering Force");

      boidFolder
        .add(this.controlledVariables, "perceptionRadius", 0, 20, 1)
        .name("Perception Radius");

      boidFolder
        .add(this.controlledVariables, "angleThreshold", 0, Math.PI, 0.01)
        .name("Angle Threshold");
    }
    // close all rollups
    this.gui.folders.forEach((f) => f.close());
  }

  resetGUI() {
    this.gui.destroy();
    this.initGUI();
  }

  initControls() {
    const FPSEntity = new Entity("FPSEntity");
    FPSEntity.AddComponent(new FPSController({ moveSpeed: 100.0 }));
    FPSEntity.Init();
  }
}

export default ThreeJSComponent;
