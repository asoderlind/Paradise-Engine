import { Component } from "@/ComponentSystem/Component";
import { getRandRange } from "@/utils/math";
import * as THREE from "three";
import { Vector3 } from "three";

interface BoidProps {
  alignmentWeight: number;
  cohesionWeight: number;
  separationWeight: number;
  maxSteerForce: number;
  perceptionRadius: number;
  angleThreshold: number;
  noisy?: boolean;
}

class Boid extends Component {
  position: Vector3;
  rotation: THREE.Euler;
  velocity: Vector3;
  minSpeed: number;
  maxSpeed: number;
  boidProps: BoidProps;
  isNoisy: boolean;
  index: number;

  constructor(index: number, startPos: Vector3, boidProps: BoidProps) {
    super();
    this.index = index;
    this.position = startPos;
    this.rotation = new THREE.Euler();
    this.minSpeed = 4;
    this.maxSpeed = 10;
    this.velocity = new Vector3(
      getRandRange(-this.maxSpeed, this.maxSpeed),
      getRandRange(-this.maxSpeed, this.maxSpeed),
      getRandRange(-this.maxSpeed, this.maxSpeed),
    );

    this.boidProps = boidProps;
    this.isNoisy = boidProps.noisy || false;
  }

  keepInBounds(boxDimensions: Vector3, boxOffset: Vector3) {
    if (this.position.x - boxOffset.x > boxDimensions.x / 2) {
      this.position.x = -boxDimensions.x / 2 + boxOffset.x;
    }
    if (this.position.x - boxOffset.x < -boxDimensions.x / 2) {
      this.position.x = boxDimensions.x / 2 + boxOffset.x;
    }
    if (this.position.y - boxOffset.y > boxDimensions.y / 2) {
      this.position.y = -boxDimensions.y / 2 + boxOffset.y;
    }
    if (this.position.y - boxOffset.y < -boxDimensions.y / 2) {
      this.position.y = boxDimensions.y / 2 + boxOffset.y;
    }
    if (this.position.z - boxOffset.z > boxDimensions.z / 2) {
      this.position.z = -boxDimensions.z / 2 + boxOffset.z;
    }
    if (this.position.z - boxOffset.z < -boxDimensions.z / 2) {
      this.position.z = boxDimensions.z / 2 + boxOffset.z;
    }
  }

  lookInDirection(direction: Vector3) {
    // Create a rotation matrix
    const rotationMatrix = new THREE.Matrix4();

    // Set the rotation matrix to look at the target vector from the origin
    rotationMatrix.lookAt(
      direction,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
    );

    this.rotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
  }

  steerTowards(vector: Vector3) {
    const v = vector
      .clone()
      .normalize()
      .multiplyScalar(this.maxSpeed)
      .sub(this.velocity);
    return v.clampLength(0, this.boidProps.maxSteerForce);
  }

  updateBoid(
    deltaT: number,
    otherBoids: Boid[],
    boxDimensions: Vector3,
    boxOffset: Vector3,
  ) {
    // update props from controls

    // set constants
    const acceleration = new Vector3();

    // calculate the forces
    const totalSpeedDifference = new Vector3();
    const totalOtherPosition = new Vector3();
    const totalAvoidance = new Vector3();

    let total = 0;

    for (const other of otherBoids) {
      const normalizedDirection = this.velocity.clone().normalize();
      const thisToOtherDirection = other.position
        .clone()
        .sub(this.position)
        .normalize();
      const angle = normalizedDirection.angleTo(thisToOtherDirection);
      const distance = this.position.distanceTo(other.position);
      if (
        angle < this.boidProps.angleThreshold &&
        distance < this.boidProps.perceptionRadius &&
        other !== this
      ) {
        totalOtherPosition.add(other.position);
        totalAvoidance.add(this.position.clone().sub(other.position));
        totalSpeedDifference.add(this.velocity.clone().sub(other.velocity));
        total++;
      }
    }
    if (total > 0) {
      const flockMatesCenter = totalOtherPosition.clone().divideScalar(total);
      const offsetToFlockCenter = flockMatesCenter.clone().sub(this.position);

      const averageAvoidance = totalAvoidance.clone().divideScalar(total);
      const averageSpeedDifference = totalSpeedDifference.clone();

      // cohesion
      const cohesionForce = this.steerTowards(
        offsetToFlockCenter,
      ).multiplyScalar(this.boidProps.cohesionWeight);

      // separation
      const separationForce = this.steerTowards(
        averageAvoidance,
      ).multiplyScalar(this.boidProps.separationWeight);

      // alignment
      const alignmentForce = this.steerTowards(
        averageSpeedDifference,
      ).multiplyScalar(this.boidProps.alignmentWeight);

      acceleration.add(cohesionForce).add(separationForce).add(alignmentForce);

      // add noise
      if (this.isNoisy) {
        if (Math.random() < 0.5) {
          acceleration.add(
            new Vector3(
              getRandRange(-1, 1),
              getRandRange(-1, 1),
              getRandRange(-1, 1),
            ),
          );
        }
      }

      this.velocity.add(acceleration.clone().multiplyScalar(deltaT));
      let speed = this.velocity.length();
      const dir = this.velocity.clone().normalize();
      speed = Math.min(Math.max(speed, this.minSpeed), this.maxSpeed);
      this.velocity = dir.multiplyScalar(speed);
    }

    this.keepInBounds(boxDimensions, boxOffset);
    this.lookInDirection(this.velocity);
    this.position.add(this.velocity.clone().multiplyScalar(deltaT));
  }
}

export default Boid;
