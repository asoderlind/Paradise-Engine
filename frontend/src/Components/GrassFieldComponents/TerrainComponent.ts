import * as THREE from "three";
import { Component } from "@/ComponentSystem/Component";
import { fBmProps } from "@/utils/noise";

import ThreeJS from "@/Components/ThreeJSComponent";
import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js";

import { DisplacementComponent } from "@/Components/GrassFieldComponents/DisplacementComponent";
import { ControlledVariables } from "@/types";

const TERRAIN_DIM = 1000;

class TerrainComponent extends Component {
  static CLASS_NAME = "TerrainComponent";

  get NAME() {
    return TerrainComponent.CLASS_NAME;
  }
  terrainDim: number;
  terrain!: THREE.Mesh;
  normalsHelper!: VertexNormalsHelper;
  ambientLight!: THREE.AmbientLight;
  options: ControlledVariables;

  constructor(options: ControlledVariables, terrainDim: number = TERRAIN_DIM) {
    super();
    this.options = options;
    this.ambientLight = new THREE.AmbientLight(
      0xffffff,
      options.ambientLightIntensity,
    );
    this.terrainDim = terrainDim;
  }

  InitEntity(): void {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;
    const scene = threejs.scene;
    const noiseControllers = threejs.getControllers("Noise");
    if (noiseControllers) {
      noiseControllers.forEach((controller) => {
        const property = controller.property;
        if (property in fBmProps) {
          controller.onChange(() => {
            // Apply displacement
            displacementComponent.ApplyDisplacement(
              this.terrain.geometry as THREE.PlaneGeometry,
              this.terrain.geometry.getAttribute(
                "position",
              ) as THREE.BufferAttribute,
            );
            displacementComponent.GenerateHeightMap();
          });
        }
      });
    }
    // const gui: GUI = threejs.gui;
    // const noiseRollup = gui.addFolder("Noise"); // create a rollup
    // noiseRollup
    //   .add(fBmProps, "scale", 1, 500, 1)
    //   .name("Scale")
    //   .onChange(() => {
    //     displacementComponent.ApplyDisplacement(
    //       this.terrain.geometry as THREE.PlaneGeometry,
    //       this.terrain.geometry.getAttribute(
    //         "position",
    //       ) as THREE.BufferAttribute,
    //     );
    //   });
    // noiseRollup
    //   .add(fBmProps, "lacunarity", 1, 3, 0.01)
    //   .name("Lacunarity")
    //   .onChange(() => {
    //     displacementComponent.ApplyDisplacement(
    //       this.terrain.geometry as THREE.PlaneGeometry,
    //       this.terrain.geometry.getAttribute(
    //         "position",
    //       ) as THREE.BufferAttribute,
    //     );
    //   });
    // noiseRollup
    //   .add(fBmProps, "H", 0, 1, 0.01)
    //   .name("Hurst Exponent")
    //   .onChange(() => {
    //     displacementComponent.ApplyDisplacement(
    //       this.terrain.geometry as THREE.PlaneGeometry,
    //       this.terrain.geometry.getAttribute(
    //         "position",
    //       ) as THREE.BufferAttribute,
    //     );
    //   });
    // noiseRollup
    //   .add(fBmProps, "numOctaves", 1, 20, 1)
    //   .name("Num Octaves")
    //   .onChange(() => {
    //     displacementComponent.ApplyDisplacement(
    //       this.terrain.geometry as THREE.PlaneGeometry,
    //       this.terrain.geometry.getAttribute(
    //         "position",
    //       ) as THREE.BufferAttribute,
    //     );
    //   });
    // noiseRollup
    //   .add(fBmProps, "height", 1, 100, 1)
    //   .name("Height")
    //   .onChange(() => {
    //     displacementComponent.ApplyDisplacement(
    //       this.terrain.geometry as THREE.PlaneGeometry,
    //       this.terrain.geometry.getAttribute(
    //         "position",
    //       ) as THREE.BufferAttribute,
    //     );
    //   });

    const texLoader = new THREE.TextureLoader();
    const grassTexture = texLoader.load("grassField/base_grass5.png");
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    const planeGeometry = new THREE.PlaneGeometry(
      this.terrainDim,
      this.terrainDim,
      256 - 1,
      256 - 1,
    );
    planeGeometry.rotateX(-Math.PI / 2); // rotate the plane to be horizontal

    const displacementComponent = this.FindEntity(
      "displacementEntity",
    ).GetComponent("DisplacementComponent") as DisplacementComponent;

    const planeMaterial = new THREE.MeshStandardMaterial({
      color: this.options.terrainColor,
      side: THREE.DoubleSide,
    });
    const terrain = new THREE.Mesh(planeGeometry, planeMaterial);
    // need to do it manually on the CPU otherwise the normals are not computed
    // this is because displacement in the material is purely a visual effect applied in the shader
    this.terrain = terrain;

    displacementComponent.ApplyDisplacement(
      this.terrain.geometry as THREE.PlaneGeometry,
      this.terrain.geometry.getAttribute("position") as THREE.BufferAttribute,
    );

    // Create and add the normals helper
    // this.normalsHelper = new VertexNormalsHelper(terrain, 2, 0x00ff00);
    // scene.add(this.normalsHelper);
    scene.add(terrain);

    scene.add(this.ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
  }

  Update() {
    // update ambient light intensity
    this.ambientLight.intensity = this.options.ambientLightIntensity;
    (this.terrain.material as THREE.MeshStandardMaterial).color.set(
      this.options.terrainColor,
    );
  }
}

export default TerrainComponent;
