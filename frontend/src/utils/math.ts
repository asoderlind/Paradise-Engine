import * as THREE from "three";

export function getRandRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function crossMatrix(v: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    0,
    -v.z,
    v.y,
    0,
    v.z,
    0,
    -v.x,
    0,
    -v.y,
    v.x,
    0,
    0,
    0,
    0,
    0,
    0,
  );
}

export function lerp(t: number, a: number, b: number) {
  return a + t * (b - a);
}
