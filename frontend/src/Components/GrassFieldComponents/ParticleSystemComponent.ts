import * as THREE from "three";
import { Component } from "@/ComponentSystem/Component";
import particleVertexShader from "static/shaders/particle-vert.glsl";
import particleFragmentShader from "static/shaders/particle-frag.glsl";

import ThreeJS from "@/Components/ThreeJSComponent";

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

class ParticleSystemComponent extends Component {
  static CLASS_NAME = "ParticleSystemComponent";

  camera!: THREE.PerspectiveCamera;
  _material!: THREE.ShaderMaterial;
  _particles: Particle[];
  _geometry!: THREE.BufferGeometry;
  _points!: THREE.Points;
  _alphaSpline: LinearSpline<number>;
  _colorSpline: LinearSpline<THREE.Color>;
  _sizeSpline: LinearSpline<number>;
  accumulatedTime: number;

  get NAME() {
    return ParticleSystemComponent.CLASS_NAME;
  }

  constructor() {
    super();
    // Initialize basic properties
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
    this._colorSpline.AddPoint(0.0, new THREE.Color(0xffff80));
    this._colorSpline.AddPoint(1.0, new THREE.Color(0xff8080));

    this._sizeSpline = new LinearSpline<number>((t, a, b) => a + t * (b - a));
    this._sizeSpline.AddPoint(0.0, 1.0);
    this._sizeSpline.AddPoint(0.5, 5.0);
    this._sizeSpline.AddPoint(1.0, 1.0);
  }

  InitEntity(): void {
    super.InitEntity();
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    // Initialize Three.js-dependent components
    const uniforms = {
      diffuseTexture: {
        value: new THREE.TextureLoader().load("textures/fire.jpg"),
      },
      pointMultiplier: {
        value:
          window.innerHeight / (2.0 * Math.tan((0.5 * 60.0 * Math.PI) / 180.0)),
      },
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

    document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
    this._UpdateGeometry();
  }

  _onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case "Space": // SPACE
        this._AddParticles();
        break;
    }
  }

  _AddParticles(deltaT: number = 0.0) {
    const particlesPerSecond = 30.0;
    this.accumulatedTime += deltaT;
    const n = Math.floor(this.accumulatedTime * particlesPerSecond);
    this.accumulatedTime -= n / particlesPerSecond;

    const particlePosition = new THREE.Vector3(
      (Math.random() * 2 - 1) * 1.0,
      (Math.random() * 2 - 1) * 1.0 + 10.0,
      (Math.random() * 2 - 1) * 1.0,
    );

    // console.log("adding particle at position", particlePosition);

    for (let i = 0; i < n; i++) {
      const life = (Math.random() * 0.75 + 0.25) * 10.0;
      this._particles.push({
        position: particlePosition,
        size: (Math.random() * 0.5 + 0.5) * 4.0,
        colour: new THREE.Color(),
        alpha: 1.0,
        life: life,
        maxLife: life,
        rotation: Math.random() * 2.0 * Math.PI,
        velocity: new THREE.Vector3(0, 5, 0),
        currentSize: 0.0,
      });
    }
  }

  _UpdateGeometry() {
    const positions: number[] = [];
    const sizes: number[] = [];
    const colours: number[] = [];
    const angles: number[] = [];

    for (const p of this._particles) {
      positions.push(p.position.x, p.position.y, p.position.z);
      colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
      sizes.push(p.currentSize);
      angles.push(p.rotation);
    }

    this._geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this._geometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(sizes, 1),
    );
    this._geometry.setAttribute(
      "colour",
      new THREE.Float32BufferAttribute(colours, 4),
    );
    this._geometry.setAttribute(
      "angle",
      new THREE.Float32BufferAttribute(angles, 1),
    );

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.size.needsUpdate = true;
    this._geometry.attributes.colour.needsUpdate = true;
    this._geometry.attributes.angle.needsUpdate = true;
  }

  _UpdateParticles(deltaT: number) {
    for (const p of this._particles) {
      p.life -= deltaT;
    }

    this._particles = this._particles.filter((p) => {
      return p.life > 0.0;
    });

    for (const p of this._particles) {
      const t = 1.0 - p.life / p.maxLife;

      p.rotation += deltaT * 0.5;
      p.alpha = this._alphaSpline.Get(t);
      p.currentSize = p.size * this._sizeSpline.Get(t);
      p.colour.copy(this._colorSpline.Get(t));

      p.position.add(p.velocity.clone().multiplyScalar(deltaT));

      const drag = p.velocity.clone();
      drag.multiplyScalar(deltaT * 0.1);
      drag.x =
        Math.sign(p.velocity.x) *
        Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      drag.y =
        Math.sign(p.velocity.y) *
        Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      drag.z =
        Math.sign(p.velocity.z) *
        Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      p.velocity.sub(drag);
    }

    this._particles.sort((a, b) => {
      const d1 = this.camera.position.distanceTo(a.position);
      const d2 = this.camera.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }

      if (d1 < d2) {
        return 1;
      }

      return 0;
    });
  }

  Update(deltaT: number) {
    this._AddParticles(deltaT);
    this._UpdateParticles(deltaT);
    this._UpdateGeometry();
  }
}

export default ParticleSystemComponent;
