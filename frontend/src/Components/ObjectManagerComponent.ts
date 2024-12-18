import { Component } from "@/ComponentSystem/Component";
import * as THREE from "three";
import ThreeJS from "@/Components/ThreeJSComponent";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { loadObj } from "@/utils/objLoader";
import { DisplacementComponent } from "@/Components/GrassFieldComponents/DisplacementComponent";
import { ControlledProgramVariables } from "@/types";

const TORI_GATE_PATH = "tori_gate.glb";
const ROCK_PATH = "objects/rock.glb";
const ROCK_PATH_2 = "objects/rock2.glb";
const ROCK_PATH_3 = "objects/rock3.glb";
const DUCK_PATH = "objects/duck.glb";
const STATUE_PATH = "objects/statue.obj";
const STATUE_TEXTURE_PATH = "textures/statue_diffuse.jpg";

class ObjectManagerComponent extends Component {
  static CLASS_NAME = "ObjectManagerComponent";
  loader!: GLTFLoader;
  toriGate!: THREE.Group<THREE.Object3DEventMap>;
  options!: ControlledProgramVariables;
  rocks: THREE.Group<THREE.Object3DEventMap>[] = [];
  duck!: THREE.Group<THREE.Object3DEventMap>;
  statue!: THREE.Group<THREE.Object3DEventMap>;
  heightMap!: THREE.DataTexture;
  rocksAreFloating: boolean = true;
  moaiInitialPosition: THREE.Vector3 = new THREE.Vector3(-30, 60, -90);
  moaiInitialScale: number = 0.1;

  terrainSize: number = 1000;

  get NAME() {
    return ObjectManagerComponent.CLASS_NAME;
  }

  constructor(options: ControlledProgramVariables, terrainSize: number = 1000) {
    super();
    this.options = options;
    this.terrainSize = terrainSize;
  }

  async InitEntity(): Promise<void> {
    this.loader = new GLTFLoader();
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;
    const scene = threejs.scene;

    const displacementComponent = this.FindEntity(
      "displacementEntity",
    ).GetComponent("DisplacementComponent") as DisplacementComponent;

    this.heightMap = displacementComponent.heightMap;

    //await this.loadAndAddStatue(scene);
    await this.loadAndAddRocks(scene);
    await this.loadAndAddStatue(scene);

    // Tori
    this.toriGate = await this.loadModel(TORI_GATE_PATH);
    this.toriGate.scale.multiplyScalar(8);
    this.toriGate.position.set(0, this.getHeightAtPosition(0, 0), 0);
    scene.add(this.toriGate);

    // Duck
    this.duck = await this.loadModel(DUCK_PATH);
    this.duck.scale.multiplyScalar(10);
    this.duck.position.set(70, -20, 1000);
    this.duck.setRotationFromEuler(new THREE.Euler(0, (3 * Math.PI) / 4, 0));
    scene.add(this.duck);
  }

  /*
    Loads and adds the statue to the scene with obj loader
  */
  private async loadAndAddStatue(scene: THREE.Scene) {
    try {
      const texture = new THREE.TextureLoader().load(STATUE_TEXTURE_PATH);
      const material = new THREE.MeshStandardMaterial({ map: texture });
      const model = await loadObj(STATUE_PATH, material, texture);
      if (model.children.length === 0) {
        console.error("Loaded OBJ model has no children.");
        return;
      }
      const mesh = model.children[0] as THREE.Mesh;

      model.position.set(
        this.moaiInitialPosition.x,
        this.moaiInitialPosition.y,
        this.moaiInitialPosition.z,
      );

      const quaternion = new THREE.Quaternion();

      // Step 1: Rotate Z by π
      const qZ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        Math.PI,
      );

      // Step 2: Rotate X by -π/2
      const qX = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -Math.PI / 3,
      );

      // Step 3: Rotate Y by -π/8
      const qY = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -Math.PI / 7,
      );

      // Combine the quaternions in the correct order (qY * qX * qZ)
      quaternion.multiplyQuaternions(qY, qX).multiply(qZ);

      // Apply the combined quaternion to the mesh
      mesh.quaternion.copy(quaternion);

      mesh.scale.multiplyScalar(this.moaiInitialScale);
      this.statue = model;
      scene.add(model);
    } catch (error) {
      console.error("Error loading and adding statue:", error);
    }
  }

  private async loadAndAddRocks(scene: THREE.Scene) {
    try {
      const rockModel1 = await this.loadModel(ROCK_PATH);
      rockModel1.scale.multiplyScalar(30); // Adjust scale as needed
      rockModel1.position.set(20, this.getHeightAtPosition(0, 0), 0); // Initial position

      const rockModel2 = await this.loadModel(ROCK_PATH_2);
      rockModel2.scale.multiplyScalar(30); // Adjust scale as needed
      rockModel2.position.set(-10, this.getHeightAtPosition(-10, -20), -20); // Initial position

      const rockModel3 = await this.loadModel(ROCK_PATH_3);
      rockModel3.scale.multiplyScalar(30); // Adjust scale as needed
      rockModel3.position.set(10, this.getHeightAtPosition(10, -80), -80); // Initial position

      const rockTexture = new THREE.TextureLoader().load("textures/rock.jpg");
      rockTexture.wrapS = THREE.RepeatWrapping; // Allows the texture to repeat horizontally
      rockTexture.wrapT = THREE.RepeatWrapping; // Allows the texture to repeat vertically
      rockTexture.repeat.set(2, 2); // Adjust the scale (2x2 repetition as an example)

      rockModel1.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            map: rockTexture,
            roughness: 1.0,
            metalness: 0.0,
          });
        }
      });
      rockModel2.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            map: rockTexture,
            roughness: 1.0,
            metalness: 0.0,
          });
        }
      });
      rockModel3.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            map: rockTexture,
            roughness: 1.0,
            metalness: 0.0,
          });
        }
      });

      this.rocks.push(rockModel1);
      this.rocks.push(rockModel2);
      this.rocks.push(rockModel3);

      scene.add(rockModel1);
      scene.add(rockModel2);
      scene.add(rockModel3);
    } catch (error) {
      console.error("Error loading and adding rocks:", error);
    }
  }

  getHeightAtPosition(x: number, z: number): number {
    if (!this.heightMap) return 0;

    // Convert world position to UV coordinates (0 to 1)
    const terrainHalfSize = this.terrainSize / 2;
    const u = (x + terrainHalfSize) / this.terrainSize;
    const v = (z + terrainHalfSize) / this.terrainSize;

    // Clamp UV coordinates to valid range
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));

    // Get pixel coordinates in the height map
    const width = this.heightMap.image.width;
    const height = this.heightMap.image.height;
    const pixelX = Math.floor(clampedU * (width - 1));
    const pixelY = Math.floor(clampedV * (height - 1));

    // Sample height from the height map
    const index = pixelY * width + pixelX; // only red channel is used
    const heightValue = this.heightMap.image.data[index];

    return heightValue;
  }

  Update(): void {
    // apply offsets to statue model
    if (this.statue) {
      this.statue.position.x =
        this.moaiInitialPosition.x + this.options.moaiTranslationOffset.x;
      this.statue.position.y =
        this.moaiInitialPosition.y + this.options.moaiTranslationOffset.y;
      this.statue.position.z =
        this.moaiInitialPosition.z + this.options.moaiTranslationOffset.z;
      this.statue.setRotationFromQuaternion(this.options.moaiRotationOffset);
      this.statue.scale.set(
        this.options.moaiScaleOffset,
        this.options.moaiScaleOffset,
        this.options.moaiScaleOffset,
      );
    }

    if (this.duck) {
      // make the duck float irregularly
      this.duck.position.y =
        Math.sin(performance.now() * 0.001) *
          3 *
          Math.cos(performance.now() * 0.001) +
        this.options.duckYOffset;
    }

    if (this.options.rocksYOffset > 0.1) {
      for (const rock of this.rocks) {
        const baseHeight =
          this.getHeightAtPosition(rock.position.x, rock.position.z) +
          this.options.rocksYOffset;
        rock.position.y =
          baseHeight + Math.sin(performance.now() * 0.004) * 0.6;
      }
    }
  }

  private loadModel(
    path: string,
  ): Promise<THREE.Group<THREE.Object3DEventMap>> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;

          // Initial setup
          model.position.set(0, 0, 0);

          resolve(model);
        },
        (progress) => {
          console.log(
            "Loading progress:",
            (progress.loaded / progress.total) * 100 + "%",
          );
        },
        (error) => {
          reject(error);
        },
      );
    });
  }
}

export default ObjectManagerComponent;
