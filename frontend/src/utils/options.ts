import * as THREE from "three";
import { ControlledVariables } from "@/types";

// These are top level variables that may also be
// modified by the WebSocket connection
const controlledVariables: ControlledVariables = {
  oceanWindSpeedX: 10,
  oceanWindSpeedY: 10,
  waterColor: 0x001e0f,
  sunColor: 0xffffff,
  dayDuration: 300,
  dawnColorHorizon: new THREE.Color(0.7, 0.35, 0.3),
  dawnColorZenith: new THREE.Color(0.1, 0.1, 0.65),
  noonColorHorizon: new THREE.Color(0.5, 0.7, 1.0),
  noonColorZenith: new THREE.Color(0.1, 0.4, 1.0),
  duskColorHorizon: new THREE.Color(0.9, 0.4, 0.2),
  duskColorZenith: new THREE.Color(0.1, 0.1, 0.4),
  nightColorHorizon: new THREE.Color(0.02, 0.02, 0.1),
  nightColorZenith: new THREE.Color(0.0, 0.0, 0.05),
  sunDawn: new THREE.Color(0.8, 0.3, 0.2),
  sunNoon: new THREE.Color(1.0, 0.95, 0.85),
  sunDusk: new THREE.Color(0.9, 0.3, 0.1),
  moon: new THREE.Color(1.0, 1.0, 1.0),
  uCloudNoiseScale: 2,
  uCloudDensity: 1.0,
  uCloudColor: new THREE.Color(1.0, 1.0, 1.0),
  cameraPosition: new THREE.Vector3(64, 82, -143),
  cameraRotation: new THREE.Quaternion(0, 0, 0), //new THREE.Quaternion(0.01, -1, -0.05, -0.2),
  rocksYOffset: 0,
  timeOfDay: 4,
  duckYOffset: -100,
  grassHeight: 1.5,
  grassBaseColor: new THREE.Vector3(0.05, 0.2, 0.01),
  grassTipColor: new THREE.Vector3(1.0, 1.0, 0.345),
  // boid stuff
  cohesionWeight: 180,
  separationWeight: 70,
  alignmentWeight: 150,
  maxSteerForce: 1,
  perceptionRadius: 10,
  angleThreshold: Math.PI,
  // terrain
  ambientLightIntensity: 2.0,
  terrainColor: new THREE.Color("#0d3303"),
  // moai
  moaiScaleOffset: 1,
  moaiTranslationOffset: new THREE.Vector3(0, 0, 0),
  moaiRotationOffset: new THREE.Quaternion(0, 0, 0, 1),
  particleBaseColor: new THREE.Color(0.5, 0.5, 0.1),
};

export default controlledVariables;
