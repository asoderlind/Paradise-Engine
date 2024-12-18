import * as THREE from "three";
import grassVertexShader from "static/shaders/grass-vert.glsl";
import grassFragmentShader from "static/shaders/grass-frag.glsl";
import options from "@/utils/options";
// import grassVertexShaderLow from "static/shaders/grass-vert-low.glsl";

import { getRandRange } from "@/utils/math";
import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "@/Components/ThreeJSComponent";

import { WindSystem } from "@/Components/GrassFieldComponents/WindSystem";

/* 
This is a design pattern based on Ghost of Tsushima 
where one patch is divided into smaller cells and blades of grass are randomized  
within those cells. We have chosen to have 12 blades per cell here for a total of 3072 blades 
per patch of grass (at the maximum density)
https://www.youtube.com/watch?v=Ibe1JBF5i5Y&t=1158s
*/
const GRASS_PATCH_SIZE = 16;
const BLADES_PER_CELL = 12;
const TOTAL_BLADES = GRASS_PATCH_SIZE * GRASS_PATCH_SIZE * BLADES_PER_CELL;

const GRASS_SEGMENTS_LOW = 2;
const GRASS_SEGMENTS_HIGH = 4;
const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;
const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2;
const GRASS_LOD_DIST_HIGH = 15;
const GRASS_LOD_DIST_LOW = 100;
const GRASS_MAX_DIST = 200;
const MAX_RENDERED_PATCHES = 300;
const FADE_START = 170.0;
const FADE_END = 200.0;

const GRASS_GRID_RADIUS = 25;

const GRASS_PATCH_RADIUS = Math.sqrt(2) * (GRASS_PATCH_SIZE * 0.5);
const GRASS_WIDTH_LOW = 1.5;
const GRASS_WIDTH_MID = 0.5;
const GRASS_WIDTH_HIGH = 0.3;
const S_TMP = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GRASS_PATCH_RADIUS);
const AABB_TMP = new THREE.Box3();
const TRANSITION_ZONE_WIDTH = 5.0; // Width of blend zone

class InstancedFloat16BufferAttribute extends THREE.InstancedBufferAttribute {
  isFloat16BufferAttribute: boolean;
  constructor(
    array: ArrayLike<number>,
    itemSize: number,
    normalized: boolean = false,
    meshPerAttribute: number = 1,
  ) {
    super(new Uint16Array(array), itemSize, normalized, meshPerAttribute);

    this.isFloat16BufferAttribute = true;
  }
}
const sharedUniforms = {
  time: { value: 0 },
  fadeStart: { value: FADE_START },
  fadeEnd: { value: FADE_END },
};

interface GrassProps {
  terrainDim: number;
  heightMap: THREE.Texture;
}

class GrassFieldComponent extends Component {
  props: GrassProps;
  meshesLow: THREE.Mesh[];
  meshesMid: THREE.Mesh[];
  meshesHigh: THREE.Mesh[];
  group: THREE.Group;
  grassMaterialLow!: THREE.ShaderMaterial;
  grassMaterialMid!: THREE.ShaderMaterial;
  grassMaterialHigh!: THREE.ShaderMaterial;
  geometryLow!: THREE.InstancedBufferGeometry;
  geometryHigh!: THREE.InstancedBufferGeometry;
  boundingBoxHelpers: Map<THREE.Mesh, THREE.Box3Helper> = new Map();
  positionTexture: THREE.DataTexture;
  threejs!: ThreeJS;

  FAR_GRASS_START = 180;
  FAR_GRASS_FULL = 700;

  windSystem!: WindSystem;

  currentPatch: THREE.Vector3 = new THREE.Vector3();

  static CLASS_NAME = "GrassFieldComponent";

  get NAME() {
    return GrassFieldComponent.CLASS_NAME;
  }

  constructor(props: GrassProps) {
    super();
    this.props = props;
    this.meshesLow = [];
    this.meshesMid = [];
    this.meshesHigh = [];
    this.group = new THREE.Group();

    this.positionTexture = this.initPositionTexture();
  }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;
    const scene = threejs.scene;
    this.threejs = threejs;

    this.windSystem = new WindSystem(threejs.renderer, this.props.terrainDim);

    this.grassMaterialLow = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedUniforms,
        grassSize: {
          value: new THREE.Vector2(GRASS_WIDTH_LOW, options.grassHeight),
        },
        grassParams: {
          value: new THREE.Vector2(GRASS_SEGMENTS_LOW, GRASS_VERTICES_LOW),
        },
        grassTipColor: {
          value: options.grassTipColor,
        },
        grassBaseColor: {
          value: options.grassBaseColor,
        },
        heightMap: { value: this.props.heightMap },
        positionTexture: { value: this.positionTexture },
        lodTransitionStart: {
          value: GRASS_LOD_DIST_LOW - TRANSITION_ZONE_WIDTH,
        },
        lodTransitionEnd: { value: GRASS_LOD_DIST_LOW },
      },
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      transparent: true,
    });
    this.grassMaterialMid = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedUniforms,
        grassSize: {
          value: new THREE.Vector2(GRASS_WIDTH_MID, options.grassHeight),
        },
        grassParams: {
          value: new THREE.Vector2(GRASS_SEGMENTS_LOW, GRASS_VERTICES_LOW),
        },
        grassTipColor: {
          value: options.grassTipColor,
        },
        grassBaseColor: {
          value: options.grassBaseColor,
        },
        heightMap: { value: this.props.heightMap },
        positionTexture: { value: this.positionTexture },
        lodTransitionStart: {
          value: GRASS_LOD_DIST_HIGH - TRANSITION_ZONE_WIDTH,
        },
        lodTransitionEnd: { value: GRASS_LOD_DIST_HIGH },
      },
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      transparent: true,
    });

    this.grassMaterialHigh = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedUniforms,
        grassSize: {
          value: new THREE.Vector2(GRASS_WIDTH_HIGH, options.grassHeight),
        },
        grassParams: {
          value: new THREE.Vector2(GRASS_SEGMENTS_HIGH, GRASS_VERTICES_HIGH),
        },
        grassTipColor: {
          value: options.grassTipColor,
        },
        grassBaseColor: {
          value: options.grassBaseColor,
        },
        heightMap: { value: this.props.heightMap },
        positionTexture: { value: this.positionTexture },
        lodTransitionStart: { value: 0.0 },
        lodTransitionEnd: { value: 0.0 },
      },
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      transparent: true,
    });
    this.geometryLow = this.CreateBladeGeometry(
      TOTAL_BLADES,
      GRASS_SEGMENTS_LOW,
    );
    this.geometryHigh = this.CreateBladeGeometry(
      TOTAL_BLADES,
      GRASS_SEGMENTS_HIGH,
    );

    const windUniforms = this.windSystem.getWindUniforms();
    Object.assign(this.grassMaterialLow.uniforms, windUniforms);
    Object.assign(this.grassMaterialMid.uniforms, windUniforms);
    Object.assign(this.grassMaterialHigh.uniforms, windUniforms);

    scene.add(this.group);
  }

  initPositionTexture(): THREE.DataTexture {
    // width * height * layers * 4 (RGBA)
    const data = new Float32Array(
      GRASS_PATCH_SIZE * GRASS_PATCH_SIZE * BLADES_PER_CELL * 4,
    );
    const texture = new THREE.DataTexture(
      data,
      GRASS_PATCH_SIZE, // width
      GRASS_PATCH_SIZE * BLADES_PER_CELL, // height
      THREE.RGBAFormat,
      THREE.FloatType,
    );

    // Fill with the same positions we currently use
    for (let layer = 0; layer < BLADES_PER_CELL; layer++) {
      for (let x = 0; x < GRASS_PATCH_SIZE; x++) {
        for (let z = 0; z < GRASS_PATCH_SIZE; z++) {
          // 12 blades per cell like in ghost of tsushima
          const offsetX = -GRASS_PATCH_SIZE * 0.5 + getRandRange(0, 1);
          const offsetZ = -GRASS_PATCH_SIZE * 0.5 + getRandRange(0, 1);

          const bladeX = x + offsetX;
          const bladeZ = z + offsetZ;

          const bladeIndex =
            layer * GRASS_PATCH_SIZE * GRASS_PATCH_SIZE +
            (x + z * GRASS_PATCH_SIZE);
          const pixelIndex = bladeIndex * 4;

          data[pixelIndex + 0] = bladeX;
          data[pixelIndex + 1] = 0.0;
          data[pixelIndex + 2] = bladeZ;
          data[pixelIndex + 3] = Math.random(); // Could be used for variation
        }
      }
    }

    texture.needsUpdate = true;
    return texture;
  }

  CreateBladeGeometry(
    instanceCount: number = TOTAL_BLADES, // number of grass blades per patch
    segments: number = GRASS_SEGMENTS_HIGH, // number of segments per blade
  ) {
    const VERTICES = (segments + 1) * 2;

    // indices for a single blade (double sided)
    const indices: number[] = [];
    for (let i = 0; i < segments; ++i) {
      const vi = i * 2;
      indices[i * 12 + 0] = vi + 0;
      indices[i * 12 + 1] = vi + 1;
      indices[i * 12 + 2] = vi + 2;

      indices[i * 12 + 3] = vi + 2;
      indices[i * 12 + 4] = vi + 1;
      indices[i * 12 + 5] = vi + 3;

      const fi = VERTICES + vi;
      indices[i * 12 + 6] = fi + 2;
      indices[i * 12 + 7] = fi + 1;
      indices[i * 12 + 8] = fi + 0;

      indices[i * 12 + 9] = fi + 3;
      indices[i * 12 + 10] = fi + 1;
      indices[i * 12 + 11] = fi + 2;
    }

    // front and back vertices
    const vertID = new Uint8Array(VERTICES * 2);
    for (let i = 0; i < VERTICES * 2; ++i) {
      vertID[i] = i;
    }

    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.instanceCount = instanceCount;
    instancedGeometry.setAttribute(
      "vertIndex",
      new THREE.Uint8BufferAttribute(vertID, 1),
    );

    // Add blade indices
    const bladeIndices = new Float32Array(instanceCount);
    for (let i = 0; i < instanceCount; i++) {
      bladeIndices[i] = i;
    }
    instancedGeometry.setAttribute(
      "bladeIndex",
      new THREE.InstancedBufferAttribute(bladeIndices, 1),
    );

    instancedGeometry.setIndex(indices);

    // define attributes for instance orientation and position
    const orientations: number[] = []; // quaternion

    // random orientation around the up (y) axis
    for (let i = 0; i < instanceCount; i++) {
      // random rotation around the up axis
      const angle = Math.random();
      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      orientations[i * 4 + 0] = quaternion.x;
      orientations[i * 4 + 1] = quaternion.y;
      orientations[i * 4 + 2] = quaternion.z;
      orientations[i * 4 + 3] = quaternion.w;
    }

    const orientationsDataArray = orientations.map(THREE.DataUtils.toHalfFloat);

    //const orientationsDataArray = new Float32Array(orientations);
    instancedGeometry.setAttribute(
      "orientation",
      new InstancedFloat16BufferAttribute(orientationsDataArray, 4),
    );

    const curveValues = new Float32Array(instanceCount);

    // Populate the curve values randomly or based on some logic
    for (let i = 0; i < instanceCount; i++) {
      curveValues[i] = Math.random(); // Assign random curve value for each blade
    }

    // Add the curve attribute to your instanced geometry
    instancedGeometry.setAttribute(
      "curve",
      new THREE.InstancedBufferAttribute(curveValues, 1), // 1 means each instance has one curve value
    );

    instancedGeometry.computeVertexNormals();

    return instancedGeometry;
  }

  // crete mesh for grass patch
  CreateMesh(distToPatch: number) {
    let lodLevel: 0 | 1 | 2 = 0;
    let density = 1.0;

    if (distToPatch > GRASS_LOD_DIST_LOW) {
      lodLevel = 2;
      density = 0.25;
    } else if (distToPatch > GRASS_LOD_DIST_HIGH) {
      lodLevel = 1;
      density = 0.5;
    }

    const meshes = { 0: this.meshesHigh, 1: this.meshesMid, 2: this.meshesLow }[
      lodLevel
    ];
    const geometry = {
      0: this.geometryHigh,
      1: this.geometryHigh,
      2: this.geometryLow,
    }[lodLevel];
    const material = {
      0: this.grassMaterialHigh,
      1: this.grassMaterialMid,
      2: this.grassMaterialLow,
    }[lodLevel];

    const instanceCount = geometry.instanceCount;
    const reducedGeometry = geometry.clone();
    reducedGeometry.instanceCount = Math.floor(instanceCount * density);

    const mesh = new THREE.Mesh(reducedGeometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -distToPatch;

    meshes.push(mesh);
    mesh.position.set(0, 0, 0);
    this.group.add(mesh);

    //// Create bounding box helper for this mesh
    //this.createBoundingBoxHelper(mesh);

    return mesh;
  }

  createBoundingBoxHelper(mesh: THREE.Mesh) {
    const box = new THREE.Box3().setFromCenterAndSize(
      mesh.position,
      new THREE.Vector3(GRASS_PATCH_SIZE, 10000, GRASS_PATCH_SIZE),
    );
    const helper = new THREE.Box3Helper(box, 0xffff00);
    this.boundingBoxHelpers.set(mesh, helper);
    this.group.add(helper);
  }
  updateBoundingBoxHelper(mesh: THREE.Mesh) {
    const helper = this.boundingBoxHelpers.get(mesh);
    if (helper) {
      const box = helper.box;
      box.setFromCenterAndSize(
        mesh.position,
        new THREE.Vector3(GRASS_PATCH_SIZE, 10000, GRASS_PATCH_SIZE),
      );
      helper.updateMatrixWorld(true);
    }
  }

  checkOutOfBounds(patchPos: THREE.Vector3) {
    const bound = this.props.terrainDim / 2;
    if (patchPos.x < -bound || patchPos.x > bound) return true;
    if (patchPos.z < -bound || patchPos.z > bound) return true;
    return false;
  }

  updateGrassHeights() {
    this.grassMaterialLow.uniforms.grassSize.value.y = options.grassHeight;
    this.grassMaterialMid.uniforms.grassSize.value.y = options.grassHeight;
    this.grassMaterialHigh.uniforms.grassSize.value.y = options.grassHeight;
  }

  updateGrassColors() {
    this.grassMaterialLow.uniforms.grassTipColor.value = options.grassTipColor;
    this.grassMaterialMid.uniforms.grassTipColor.value = options.grassTipColor;
    this.grassMaterialHigh.uniforms.grassTipColor.value = options.grassTipColor;
    this.grassMaterialLow.uniforms.grassBaseColor.value =
      options.grassBaseColor;
    this.grassMaterialMid.uniforms.grassBaseColor.value =
      options.grassBaseColor;
    this.grassMaterialHigh.uniforms.grassBaseColor.value =
      options.grassBaseColor;
  }

  Update(deltaT: number) {
    const camera = this.threejs.getMainCamera();
    this.updateGrassHeights();
    this.updateGrassColors();

    sharedUniforms.time.value = (sharedUniforms.time.value + deltaT) % 10000;

    // Update wind noise texture
    const noiseTexture = this.windSystem.update(deltaT);

    // Update grass materials
    this.grassMaterialLow.uniforms.windNoiseTexture.value = noiseTexture;
    this.grassMaterialMid.uniforms.windNoiseTexture.value = noiseTexture;
    this.grassMaterialHigh.uniforms.windNoiseTexture.value = noiseTexture;

    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    const meshesLow = [...this.meshesLow];
    const meshesMid = [...this.meshesMid];
    const meshesHigh = [...this.meshesHigh];

    const baseCellPos = camera.position.clone();
    baseCellPos.divideScalar(GRASS_PATCH_SIZE);
    baseCellPos.floor();
    baseCellPos.multiplyScalar(GRASS_PATCH_SIZE);
    baseCellPos.y = 0;

    for (const c of this.group.children) c.visible = false;

    let totalRendered = 0;
    renderLoop: for (let x = -GRASS_GRID_RADIUS; x < GRASS_GRID_RADIUS; x++) {
      for (let z = -GRASS_GRID_RADIUS; z < GRASS_GRID_RADIUS; z++) {
        if (totalRendered > MAX_RENDERED_PATCHES) break renderLoop;

        this.currentPatch.set(
          x * GRASS_PATCH_SIZE + baseCellPos.x,
          0,
          z * GRASS_PATCH_SIZE + baseCellPos.z,
        );
        if (this.checkOutOfBounds(this.currentPatch)) continue;
        const cameraPosXZ = new THREE.Vector3(
          camera.position.x,
          0,
          camera.position.z,
        );

        S_TMP.center.set(
          this.currentPatch.x,
          this.currentPatch.y,
          this.currentPatch.z,
        );
        AABB_TMP.setFromCenterAndSize(
          this.currentPatch,
          new THREE.Vector3(GRASS_PATCH_SIZE, 300, GRASS_PATCH_SIZE),
        );

        const distToPatch = AABB_TMP.distanceToPoint(cameraPosXZ);

        if (distToPatch > GRASS_MAX_DIST) continue;
        if (!frustum.intersectsBox(AABB_TMP)) continue;

        totalRendered++;

        let mesh;
        if (distToPatch > GRASS_LOD_DIST_LOW) {
          mesh = meshesLow.pop() ?? this.CreateMesh(distToPatch);
        } else if (distToPatch > GRASS_LOD_DIST_HIGH) {
          mesh = meshesMid.pop() ?? this.CreateMesh(distToPatch);
        } else {
          mesh = meshesHigh.pop() ?? this.CreateMesh(distToPatch);
        }

        mesh.position.copy(this.currentPatch);
        mesh.position.y = 0;
        mesh.visible = true;
        if (distToPatch > this.FAR_GRASS_START) {
          const fade =
            1.0 -
            (distToPatch - this.FAR_GRASS_START) / (200 - this.FAR_GRASS_START);
          (mesh.material as THREE.ShaderMaterial).opacity = fade;
        }

        //Update the bounding box helper for this mesh
        // this.updateBoundingBoxHelper(mesh);
      }
    }
    // Update visibility of bounding box helpers
    // this.boundingBoxHelpers.forEach((helper, mesh) => {
    //   helper.visible = mesh.visible;
    // });
  }
}

export default GrassFieldComponent;
