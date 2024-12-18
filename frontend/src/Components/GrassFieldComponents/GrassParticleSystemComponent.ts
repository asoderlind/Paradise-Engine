import * as THREE from "three";
import { Component } from "@/ComponentSystem/Component";
import particleVertexShader from "static/shaders/particle-vert.glsl";
import particleFragmentShader from "static/shaders/particle-frag.glsl";

import ThreeJS from "@/Components/ThreeJSComponent";
import { BaseMessage } from "@/ComponentSystem/Entity";
import { ControlledVariables } from "@/types";

const PARTICLE_GRID_RADIUS = 10;
const PARTICLE_PATCH_SIZE = 16;
const MAX_PARTICLES_PER_CELL = 3;
const PARTICLE_MAX_DISTANCE = 200;
const START_HEIGHT = 1.5;
const TOTAL_POOL_SIZE =
  (PARTICLE_GRID_RADIUS * 2 + 1) ** 2 * MAX_PARTICLES_PER_CELL;

const AABB_TMP = new THREE.Box3();

interface Particle {
  position: THREE.Vector3;
  size: number;
  colour: THREE.Color;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  velocity: THREE.Vector3;
  currentSize: number;
}

class LinearSpline<T> {
  _points: Array<[number, T]>;
  _lerp: (t: number, a: T, b: T) => T;

  constructor(lerp: (t: number, a: T, b: T) => T) {
    this._points = [];
    this._lerp = lerp;
  }

  AddPoint(t: number, d: T) {
    this._points.push([t, d]);
  }

  Get(t: number) {
    let p1 = 0;

    for (let i = 0; i < this._points.length; i++) {
      if (this._points[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(this._points.length - 1, p1 + 1);

    if (p1 == p2) {
      return this._points[p1][1];
    }

    return this._lerp(
      (t - this._points[p1][0]) / (this._points[p2][0] - this._points[p1][0]),
      this._points[p1][1],
      this._points[p2][1],
    );
  }
}

interface ParticleCell {
  particles: Particle[];
  position: THREE.Vector3;
  active: boolean;
  distanceToCamera: number;
  density: number;
}

class GrassParticleSystemComponent extends Component {
  static CLASS_NAME = "GrassParticleSystemComponent";

  //particle management
  particleCells: Map<string, ParticleCell> = new Map();
  inactiveCells: Map<string, ParticleCell> = new Map();
  particlePool: Particle[] = [];
  baseCellPosition: THREE.Vector3 = new THREE.Vector3();

  camera!: THREE.PerspectiveCamera;
  _material!: THREE.ShaderMaterial;
  _particles: Particle[];
  _geometry!: THREE.BufferGeometry;
  _points!: THREE.Points;
  _alphaSpline: LinearSpline<number>;
  _colorSpline: LinearSpline<THREE.Color>;
  _sizeSpline: LinearSpline<number>;
  accumulatedTime: number;

  currentCell: THREE.Vector3 = new THREE.Vector3();
  heightMap: THREE.Texture;

  private readonly tmpVec = new THREE.Vector3();

  private positionsArray: Float32Array;
  private sizesArray: Float32Array;
  private coloursArray: Float32Array;
  private anglesArray: Float32Array;

  private timeOfDay: number = 12;
  private particleVisibility: number = 0;

  options: ControlledVariables;

  get NAME() {
    return GrassParticleSystemComponent.CLASS_NAME;
  }

  constructor(options: ControlledVariables, heightMap: THREE.Texture) {
    super();
    // Initialize basic properties
    this.options = options;
    this.accumulatedTime = 0.0;
    this._particles = [];

    // Initialize splines (these don't depend on Three.js)
    this._alphaSpline = new LinearSpline<number>((t, a, b) => a + t * (b - a));
    this._alphaSpline.AddPoint(0.0, 0.0);
    this._alphaSpline.AddPoint(0.1, 1.0);
    this._alphaSpline.AddPoint(0.6, 1.0);
    this._alphaSpline.AddPoint(1.0, 0.0);

    this._colorSpline = new LinearSpline<THREE.Color>((t, a, b) =>
      a.clone().lerp(b, t),
    );
    this._colorSpline.AddPoint(0.0, new THREE.Color(0xffe566)); // Bright golden yellow
    this._colorSpline.AddPoint(0.5, new THREE.Color(0xfff3b2)); // Pale ethereal yellow
    this._colorSpline.AddPoint(1.0, new THREE.Color(0xffd700)); // Deep gold

    this._sizeSpline = new LinearSpline<number>((t, a, b) => a + t * (b - a));
    this._sizeSpline.AddPoint(0.0, 1.0);
    this._sizeSpline.AddPoint(0.5, 5.0);
    this._sizeSpline.AddPoint(1.0, 1.0);

    this.heightMap = heightMap;

    this.positionsArray = new Float32Array(TOTAL_POOL_SIZE * 3);
    this.sizesArray = new Float32Array(TOTAL_POOL_SIZE);
    this.coloursArray = new Float32Array(TOTAL_POOL_SIZE * 4);
    this.anglesArray = new Float32Array(TOTAL_POOL_SIZE);
  }

  InitEntity(): void {
    super.InitEntity();
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    // preallocate particle pool
    for (let i = 0; i < TOTAL_POOL_SIZE; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        size: 0,
        colour: new THREE.Color(),
        alpha: 0,
        life: 0,
        maxLife: 0,
        rotation: 0,
        velocity: new THREE.Vector3(),
        currentSize: 0,
      });
    }

    // Initialize Three.js-dependent components
    const uniforms = {
      pointMultiplier: {
        value:
          window.innerHeight / (2.0 * Math.tan((0.5 * 60.0 * Math.PI) / 180.0)),
      },
      heightMap: { value: this.heightMap },
    };

    this._material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.camera = threejs.mainCamera;

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([], 3),
    );
    this._geometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute([], 1),
    );
    this._geometry.setAttribute(
      "colour",
      new THREE.Float32BufferAttribute([], 4),
    );
    this._geometry.setAttribute(
      "angle",
      new THREE.Float32BufferAttribute([], 1),
    );

    this._points = new THREE.Points(this._geometry, this._material);
    this._points.frustumCulled = false;
    threejs.scene.add(this._points);

    this._UpdateGeometry();
  }

  InitComponent() {
    // Register handlers in InitComponent, not InitEntity
    this.RegisterHandler_("update.timeOfDay", (m: BaseMessage) => {
      this.OnTimeOfDay(m);
    });
  }

  // Separate method for handling time updates
  private OnTimeOfDay(m: BaseMessage) {
    this.timeOfDay = m.value;
    this.particleVisibility = this.calculateVisibility(this.timeOfDay);
    if (this.particleVisibility <= 0) this.clearAllParticles();
  }

  private clearAllParticles() {
    // Return all particles to pool
    for (const [, cell] of this.particleCells) {
      cell.particles.forEach((particle) => {
        this.particlePool.push(particle);
      });
      cell.particles = [];
    }
    this.particleCells.clear();
    this._particles = [];
    this._UpdateGeometry();
  }

  private calculateVisibility(timeOfDay: number): number {
    if (timeOfDay >= 6 && timeOfDay < 17) {
      // Daytime: fully invisible
      return 0;
    } else if (
      (timeOfDay >= 19 && timeOfDay < 24) ||
      (timeOfDay >= 0 && timeOfDay < 3)
    ) {
      // Night: fully visible
      return 1;
    } else if (timeOfDay >= 17 && timeOfDay < 19) {
      // Dusk transition (17-19): interpolate from 0 to 1
      return (timeOfDay - 17) / 2;
    } else {
      // Dawn transition (3-6): interpolate from 1 to 0
      return 1 - (timeOfDay - 3) / 3;
    }
  }

  private getCellKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  _UpdateGeometry() {
    let offset = 0;

    for (const p of this._particles) {
      // positions
      this.positionsArray[offset * 3] = p.position.x;
      this.positionsArray[offset * 3 + 1] = p.position.y;
      this.positionsArray[offset * 3 + 2] = p.position.z;

      // colours
      this.coloursArray[offset * 4] = this.options.particleBaseColor.r;
      this.coloursArray[offset * 4 + 1] = this.options.particleBaseColor.g;
      this.coloursArray[offset * 4 + 2] = this.options.particleBaseColor.b;
      this.coloursArray[offset * 4 + 3] = p.alpha;

      // size and angle
      this.sizesArray[offset] = p.currentSize;
      this.anglesArray[offset] = p.rotation;

      offset++;
    }

    // only update the attributes that have changed

    this._geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        this.positionsArray.subarray(0, offset * 3),
        3,
      ),
    );
    this._geometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(this.sizesArray.subarray(0, offset), 1),
    );
    this._geometry.setAttribute(
      "colour",
      new THREE.Float32BufferAttribute(
        this.coloursArray.subarray(0, offset * 4),
        4,
      ),
    );
    this._geometry.setAttribute(
      "angle",
      new THREE.Float32BufferAttribute(this.anglesArray.subarray(0, offset), 1),
    );

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.size.needsUpdate = true;
    this._geometry.attributes.colour.needsUpdate = true;
    this._geometry.attributes.angle.needsUpdate = true;
  }

  private updateCell() {
    const key = this.getCellKey(this.currentCell.x, this.currentCell.z);
    let cell = this.particleCells.get(key);
    if (!cell) cell = this.inactiveCells.get(key);
    if (cell && this.inactiveCells.has(key)) {
      this.inactiveCells.delete(key);
      this.particleCells.set(key, cell);
    }
    const distToCamera = this.currentCell.distanceTo(this.camera.position);

    // Create new cell if needed
    if (!cell) {
      cell = {
        particles: [],
        position: this.currentCell.clone(),
        active: true,
        distanceToCamera: distToCamera,
        density: this.calculateDensity(distToCamera),
      };
      this.particleCells.set(key, cell);
    } else {
      cell.active = true;
      cell.distanceToCamera = distToCamera;
      cell.density = this.calculateDensity(distToCamera);
    }
  }

  calculateDensity(distToCamera: number) {
    const LoDLevels = {
      HIGH: 20.0,
      MEDIUM: 50.0,
      LOW: 100.0,
    };

    if (distToCamera < LoDLevels.HIGH) return 1.0;
    else if (distToCamera < LoDLevels.MEDIUM) return 0.5;
    else return 0.25;
  }

  private _UpdateParticlesInCell(cell: ParticleCell, deltaT: number) {
    // Update lifetimes
    cell.particles.forEach((p) => (p.life -= deltaT));

    // Remove dead particles back to the pool
    cell.particles = cell.particles.filter((p) => {
      if (p.life <= 0.0) {
        this.particlePool.push(p);
        return false;
      }
      return true;
    });

    // Update remaining particles
    for (const p of cell.particles) {
      const t = 1.0 - p.life / p.maxLife;

      // Visual updates
      p.rotation += deltaT * 0.5;
      p.alpha = this._alphaSpline.Get(t) * this.particleVisibility; // Apply visibility;
      p.currentSize = p.size * this._sizeSpline.Get(t);
      p.colour.copy(this._colorSpline.Get(t));

      // Physics updates
      this.tmpVec.copy(p.velocity).multiplyScalar(deltaT);
      p.position.add(this.tmpVec);

      // // Apply drag
      // const drag = p.velocity.clone();
      // drag.multiplyScalar(deltaT * 0.1);
      // drag.x =
      //   Math.sign(p.velocity.x) *
      //   Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      // drag.y =
      //   Math.sign(p.velocity.y) *
      //   Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      // drag.z =
      //   Math.sign(p.velocity.z) *
      //   Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      // p.velocity.sub(drag);
    }
  }

  private _AddParticlesForCell(cell: ParticleCell, deltaT: number) {
    const particlesPerSecond = 75.0 * cell.density; // Adjust based on LOD
    const maxParticlesInCell = MAX_PARTICLES_PER_CELL * cell.density; // Limit based on LOD

    if (cell.particles.length >= maxParticlesInCell) return;

    this.accumulatedTime += deltaT;
    const n = Math.floor(this.accumulatedTime * particlesPerSecond);
    this.accumulatedTime -= n / particlesPerSecond;

    for (let i = 0; i < n; i++) {
      // Spawn within cell bounds
      const offsetX = (Math.random() - 0.5) * PARTICLE_PATCH_SIZE;
      const offsetZ = (Math.random() - 0.5) * PARTICLE_PATCH_SIZE;
      const offsetY = Math.random() * START_HEIGHT;

      const particlePosition = new THREE.Vector3(
        cell.position.x + offsetX,
        cell.position.y + offsetY, // Should use heightmap here
        cell.position.z + offsetZ,
      );

      const life = (Math.random() * 0.75 + 0.25) * 3.0;
      const oldParticle = this.particlePool.pop();
      if (oldParticle) {
        oldParticle.position.copy(particlePosition);
        oldParticle.size = (Math.random() * 0.5 + 0.5) * 4.0;
        oldParticle.colour = new THREE.Color();
        oldParticle.alpha = 1.0;
        oldParticle.life = life;
        oldParticle.maxLife = life;
        oldParticle.rotation = Math.random() * 2.0 * Math.PI;
        oldParticle.velocity.set(
          Math.random() * 0.2 - 0.1, // Gentle sideways drift
          Math.random() * 2 + 0.2, // Slow upward movement
          Math.random() * 0.2 - 0.1,
        );
        oldParticle.currentSize = 0.0;
        cell.particles.push(oldParticle);
      } else {
        // we should never reach this point, but just in case
        cell.particles.push({
          position: particlePosition,
          size: (Math.random() * 0.5 + 0.5) * 4.0,
          colour: new THREE.Color(),
          alpha: 1.0,
          life: life,
          maxLife: life,
          rotation: Math.random() * 2.0 * Math.PI,
          velocity: new THREE.Vector3(
            Math.random() * 0.2 - 0.1, // Gentle sideways drift
            Math.random() * 0, // Slow upward movement
            Math.random() * 0.2 - 0.1,
          ),
          currentSize: 0.0,
        });
      }
    }
  }

  updateActiveCells(deltaT: number) {
    this._particles = [];

    for (const [key, cell] of this.particleCells) {
      if (!cell.active) {
        // Return cell to inactive pool
        this.inactiveCells.set(key, cell);
        this.particleCells.delete(key);
        continue;
      }

      this._AddParticlesForCell(cell, deltaT);
      this._UpdateParticlesInCell(cell, deltaT);
      this._particles.push(...cell.particles);
    }

    // Update geometry with all active particles
    this._UpdateGeometry();
  }

  checkOutOfBounds(currentCell: THREE.Vector3) {
    const bound = 1000 / 2;
    if (currentCell.x < -bound || currentCell.x > bound) return true;
    if (currentCell.z < -bound || currentCell.z > bound) return true;
    return false;
  }

  Update(deltaT: number) {
    if (this.particleVisibility <= 0) return;
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    this.baseCellPosition.copy(this.camera.position);
    this.baseCellPosition.divideScalar(PARTICLE_PATCH_SIZE).floor();
    this.baseCellPosition.multiplyScalar(PARTICLE_PATCH_SIZE);
    this.baseCellPosition.y = 0;

    //clear active states (slow, but whatever)
    for (const cell of this.particleCells.values()) cell.active = false;

    for (let x = -PARTICLE_GRID_RADIUS; x <= PARTICLE_GRID_RADIUS; x++) {
      for (let z = -PARTICLE_GRID_RADIUS; z <= PARTICLE_GRID_RADIUS; z++) {
        this.currentCell.set(
          x * PARTICLE_PATCH_SIZE + this.baseCellPosition.x,
          0,
          z * PARTICLE_PATCH_SIZE + this.baseCellPosition.z,
        );
        if (this.checkOutOfBounds(this.currentCell)) continue;
        const cameraPosXZ = new THREE.Vector3(
          this.camera.position.x,
          0,
          this.camera.position.z,
        );

        AABB_TMP.setFromCenterAndSize(
          this.currentCell,
          new THREE.Vector3(PARTICLE_PATCH_SIZE, 100, PARTICLE_PATCH_SIZE),
        );

        const distToCell = AABB_TMP.distanceToPoint(cameraPosXZ);
        if (distToCell > PARTICLE_MAX_DISTANCE) continue;
        if (!frustum.intersectsBox(AABB_TMP)) continue;
        this.updateCell();
      }
    }

    this.updateActiveCells(deltaT);
  }
}

export default GrassParticleSystemComponent;
