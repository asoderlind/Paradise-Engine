import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "@/Components/ThreeJSComponent";
import * as THREE from "three";
import OceanGerstner from "./OceanGerstner";
import { ControlledProgramVariables } from "@/types";

class OceanComponent extends Component {
  static CLASS_NAME = "OceanComponent";
  ocean!: OceanGerstner;
  controlledVariables!: ControlledProgramVariables;
  boxes!: THREE.Mesh[];
  numBoxes!: number;
  ms_Renderer!: THREE.WebGLRenderer;
  ms_Scene!: THREE.Scene;
  ms_Camera!: THREE.PerspectiveCamera;

  get NAME() {
    return OceanComponent.CLASS_NAME;
  }

  constructor(options: ControlledProgramVariables) {
    super();
    this.controlledVariables = options;
  }

  InitEntity() {
    // own stuff
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;
    this.ms_Renderer = threejs.renderer;
    this.ms_Scene = threejs.scene;
    this.ms_Camera = threejs.mainCamera;

    /*
    this.ocean = new Ocean(this.ms_Renderer, this.ms_Camera, this.ms_Scene, {
      INITIAL_SIZE: 200.0,
      INITIAL_WIND_X: this.controlledVariables.oceanWindSpeedX,
      INITIAL_WIND_Y: this.controlledVariables.oceanWindSpeedY,
      INITIAL_CHOPPINESS: 3.6,
      SUN_DIRECTION: new THREE.Vector3(-0.2, 0.5, 1.0),
      OCEAN_COLOR: new THREE.Vector3(0.35, 0.4, 0.45),
      EXPOSURE: 0.15,
      GEOMETRY_RESOLUTION: 256, // Grid size
      GEOMETRY_SIZE: 512,
      RESOLUTION: 512,
      SIZE_OF_FLOAT: 4,
    });
    */
    this.ocean = new OceanGerstner(
      this.ms_Renderer,
      this.ms_Scene,
      this.ms_Camera,
      this.controlledVariables,
    );
  }

  Update(deltaT: number) {
    this.ocean.Update(deltaT);
  }
}

export default OceanComponent;