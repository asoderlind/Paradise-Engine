import * as THREE from "three";
import { Component } from "@/ComponentSystem/Component";
import { fBm, fBmProps } from "@/utils/noise";
import { smoothstep } from "three/src/math/MathUtils.js";

export class DisplacementComponent extends Component {
  static CLASS_NAME = "DisplacementComponent";

  get NAME() {
    return DisplacementComponent.CLASS_NAME;
  }

  heightMapSize: number;
  terrainSize: number;
  heightMap!: THREE.DataTexture;
  baseCurveDepth: number = 80; // How far down the edges curve
  baseHeight: number = 75; // Base height of the terrain

  constructor(heightMapSize: number = 1000, terrainSize: number = 1000) {
    super();
    this.heightMapSize = heightMapSize;
    this.terrainSize = terrainSize;
    this.GenerateHeightMap();
  }

  ApplyDisplacement(
    geometry: THREE.PlaneGeometry,
    positions: THREE.BufferAttribute,
  ) {
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const islandHeight = this.getIslandShape(x, z);
      const noiseHeight = fBm(x, z, fBmProps);
      const y = islandHeight + noiseHeight;
      positions.setY(i, y);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.attributes.normal.needsUpdate = true;
  }

  private getIslandShape(x: number, z: number): number {
    // Convert coordinates to be relative to center (0-1 range)
    const dx = x / (this.terrainSize * 0.5);
    const dz = z / (this.terrainSize * 0.5);
    const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);

    // Create curved falloff
    const falloffStart = 0.7;
    const falloff = smoothstep(falloffStart, 1.0, distanceFromCenter);

    // Create downward curve using exponential function
    const curve = -this.baseCurveDepth * Math.pow(distanceFromCenter, 2);

    // Base height that gets curved down at edges
    const baseWithCurve = this.baseHeight + curve;

    // Apply smooth falloff to transition to water level
    return baseWithCurve * (1.0 - falloff);
  }

  // for now assume heightmap is the same size as the terrain
  GenerateHeightMap() {
    const heightData = new Float32Array(
      this.heightMapSize * this.heightMapSize,
    );

    for (let i = 0; i < heightData.length; i++) {
      const x = (i % this.heightMapSize) - this.heightMapSize / 2;
      const z = Math.floor(i / this.heightMapSize) - this.heightMapSize / 2;
      const islandHeight = this.getIslandShape(x, z);
      const noiseHeight = fBm(x, z, fBmProps);
      const y = islandHeight + noiseHeight;
      heightData[i] = y;
    }

    if (!this.heightMap) {
      this.heightMap = new THREE.DataTexture(
        heightData,
        this.heightMapSize,
        this.heightMapSize,
        THREE.RedFormat,
        THREE.FloatType,
      );
      this.heightMap.wrapS = this.heightMap.wrapT = THREE.RepeatWrapping;
    } else {
      this.heightMap.image.data.set(heightData);
    }

    this.heightMap.needsUpdate = true;
  }
}
