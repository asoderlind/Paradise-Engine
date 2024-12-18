import Boid from "@/Components/BoidComponent";
import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "@/Components/ThreeJSComponent";
import * as THREE from "three";
import { getRandRange } from "@/utils/math";
import { ControlledVariables } from "@/types";
import { loadObj } from "@/utils/objLoader";

class BoidSwarmComponent extends Component {
  static CLASS_NAME = "BoidSwarmComponent";
  // regular boids
  regularBoidCount: number;
  regularBoids: Boid[] = [];
  instancedRegularBoids: THREE.InstancedMesh;
  // noisy boids
  noisyBoidCount: number;
  noisyBoids: Boid[] = [];
  instancedNoisyBoids: THREE.InstancedMesh;
  dummy: THREE.Object3D;
  boxOffset: THREE.Vector3;
  boxDimensions: THREE.Vector3;
  options!: ControlledVariables;

  get NAME() {
    return BoidSwarmComponent.CLASS_NAME;
  }

  constructor(options: ControlledVariables) {
    super();
    this.options = options;
    this.boxDimensions = new THREE.Vector3(40, 20, 30);
    this.regularBoidCount = 50;
    this.noisyBoidCount = 10;
    this.boxOffset = new THREE.Vector3(-5, 90, 0);
    //const texture = new THREE.TextureLoader().load("textures/fish_texture.png");
    // regular boids
    this.instancedRegularBoids = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.3, 0.9, 32).rotateX(Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.5, 0.5, 1.0),
        shininess: 100,
      }),
      this.regularBoidCount,
    );
    this.instancedRegularBoids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // noisy boids
    this.instancedNoisyBoids = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.3, 1, 32).rotateX(Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.5, 0.5, 1.0),
        shininess: 100,
      }),
      this.noisyBoidCount,
    );
    this.instancedNoisyBoids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // load fish obj
    loadObj("objects/butterfly.obj", undefined, undefined).then((boidModel) => {
      if (boidModel.children.length === 0) {
        console.error("Loaded OBJ model has no children.");
        return;
      }
      const geometry = (boidModel.children[0] as THREE.Mesh).geometry;
      geometry.scale(10, 10, 10);
      this.instancedRegularBoids.geometry = geometry;
      this.instancedNoisyBoids.geometry = geometry;
    });

    // dummy object for instanced meshes
    this.dummy = new THREE.Object3D();
  }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    const scene = threejs.scene;

    const regularBoidProps = {
      cohesionWeight: this.options.cohesionWeight,
      separationWeight: this.options.separationWeight,
      alignmentWeight: this.options.alignmentWeight,
      maxSteerForce: this.options.maxSteerForce,
      perceptionRadius: this.options.perceptionRadius,
      angleThreshold: this.options.angleThreshold,
    };

    // regular boids
    for (let i = 0; i < this.regularBoidCount; i++) {
      const posX =
        getRandRange(-this.boxDimensions.x / 2, this.boxDimensions.x / 2) +
        this.boxOffset.x;
      const posY =
        getRandRange(-this.boxDimensions.y / 2, this.boxDimensions.y / 2) +
        this.boxOffset.y;
      const posZ =
        getRandRange(-this.boxDimensions.z / 2, this.boxDimensions.z / 2) +
        this.boxOffset.z;
      const startPos = new THREE.Vector3(posX, posY, posZ);
      this.regularBoids.push(new Boid(i, startPos, regularBoidProps));
    }
    this.instancedRegularBoids.frustumCulled = false;
    scene.add(this.instancedRegularBoids);

    const noisyBoidProps = {
      noisy: true,
      ...regularBoidProps,
    };
    // noisy boids
    for (let i = 0; i < this.noisyBoidCount; i++) {
      const posX =
        getRandRange(-this.boxDimensions.x / 2, this.boxDimensions.x / 2) +
        this.boxOffset.x;
      const posY =
        getRandRange(-this.boxDimensions.y / 2, this.boxDimensions.y / 2) +
        this.boxOffset.y;
      const posZ =
        getRandRange(-this.boxDimensions.z / 2, this.boxDimensions.z / 2) +
        this.boxOffset.z;
      const startPos = new THREE.Vector3(posX, posY, posZ);
      this.noisyBoids.push(new Boid(i, startPos, noisyBoidProps));
    }
    this.instancedNoisyBoids.frustumCulled = false;
    scene.add(this.instancedNoisyBoids);

    // make wire frame cube
    /*
    const boxGeometry = new THREE.BoxGeometry(
      this.boxDimensions.x,
      this.boxDimensions.y,
      this.boxDimensions.z,
    );
    boxGeometry.translate(this.boxOffset.x, this.boxOffset.y, this.boxOffset.z);
    const wireFrame = new THREE.WireframeGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#ffffff",
      opacity: 0.2,
    });
    const lineCube = new THREE.LineSegments(wireFrame, lineMaterial);
    scene.add(lineCube);
    */
  }

  Update(deltaT: number) {
    for (const boid of this.regularBoids) {
      boid.boidProps = {
        cohesionWeight: this.options.cohesionWeight,
        separationWeight: this.options.separationWeight,
        alignmentWeight: this.options.alignmentWeight,
        maxSteerForce: this.options.maxSteerForce,
        perceptionRadius: this.options.perceptionRadius,
        angleThreshold: this.options.angleThreshold,
      };
      boid.updateBoid(
        deltaT,
        this.regularBoids,
        this.boxDimensions,
        this.boxOffset,
      );
      this.dummy.position.copy(boid.position);
      this.dummy.rotation.copy(boid.rotation);
      this.dummy.updateMatrix();
      this.instancedRegularBoids.setMatrixAt(boid.index, this.dummy.matrix);
    }
    this.instancedRegularBoids.instanceMatrix.needsUpdate = true;
    for (const boid of this.noisyBoids) {
      boid.boidProps = {
        cohesionWeight: this.options.cohesionWeight,
        separationWeight: this.options.separationWeight,
        alignmentWeight: this.options.alignmentWeight,
        maxSteerForce: this.options.maxSteerForce,
        perceptionRadius: this.options.perceptionRadius,
        angleThreshold: this.options.angleThreshold,
        noisy: true,
      };
      boid.updateBoid(
        deltaT,
        this.regularBoids,
        this.boxDimensions,
        this.boxOffset,
      );
      this.dummy.position.copy(boid.position);
      this.dummy.rotation.copy(boid.rotation);
      this.dummy.updateMatrix();
      this.instancedNoisyBoids.setMatrixAt(boid.index, this.dummy.matrix);
    }
    this.instancedNoisyBoids.instanceMatrix.needsUpdate = true;
  }
}

export default BoidSwarmComponent;
