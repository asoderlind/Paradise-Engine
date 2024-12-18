// define enum of scenes

import * as THREE from "three";

export type ControlledVariables = ControlledProgramVariables;

export interface ControlledProgramVariables {
  oceanWindSpeedX: number;
  oceanWindSpeedY: number;
  waterColor: number;
  sunColor: number;
  dawnColorZenith: THREE.Color;
  dawnColorHorizon: THREE.Color;
  noonColorZenith: THREE.Color;
  noonColorHorizon: THREE.Color;
  duskColorZenith: THREE.Color;
  duskColorHorizon: THREE.Color;
  nightColorZenith: THREE.Color;
  nightColorHorizon: THREE.Color;
  sunDawn: THREE.Color;
  sunNoon: THREE.Color;
  sunDusk: THREE.Color;
  moon: THREE.Color;
  uCloudNoiseScale: number;
  uCloudDensity: number;
  uCloudColor: THREE.Color;
  cameraPosition: THREE.Vector3;
  cameraRotation: THREE.Quaternion;
  rocksYOffset: number;
  timeOfDay: number;
  duckYOffset: number;
  grassHeight: number;
  grassTipColor: THREE.Vector3;
  grassBaseColor: THREE.Vector3;
  terrainColor: THREE.Color;
  cohesionWeight: number;
  separationWeight: number;
  alignmentWeight: number;
  maxSteerForce: number;
  perceptionRadius: number;
  angleThreshold: number;
  ambientLightIntensity: number;
  moaiScaleOffset: number;
  moaiTranslationOffset: THREE.Vector3;
  moaiRotationOffset: THREE.Quaternion;
  particleBaseColor: THREE.Color;
  [key: string]: number | THREE.Color | THREE.Vector3 | THREE.Quaternion;
}

export enum Poses {
  UNDEFINED_POSE = "Undefined pose",
  TPOSE = "T pose",
  RIGHT_ARM_TO_SIDE = "Right arm to side",
  LEFT_ARM_TO_SIDE = "Left arm to side",
  BOTH_ARMS_UP = "Both arms up",
  PRAISE_THE_SUN = "Praise the sun",
  LEFT_KNEE_UP = "Left knee up",
  RIGHT_KNEE_UP = "Right knee up",
  SUMO_SQUAT = "Sumo squat",
  PEE_SQUAT = "Pee squat",
  RIGHT_ARM_SIDE_LEFT_KNEE_UP = "Right arm side and left knee up",
  RIGHT_ARM_SIDE_RIGHT_KNEE_UP = "Right arm side and right knee up",
  RIGHT_ARM_SIDE_SUMO_SQUAT = "Right arm side and sumo squat",
  RIGHT_ARM_SIDE_PEE_SQUAT = "Right arm side and pee squat",
  LEFT_ARM_SIDE_LEFT_KNEE_UP = "Left arm side and left knee up",
  LEFT_ARM_SIDE_RIGHT_KNEE_UP = "Left arm side and right knee up",
  LEFT_ARM_SIDE_SUMO_SQUAT = "Left arm side and sumo squat",
  LEFT_ARM_SIDE_PEE_SQUAT = "Left arm side and pee squat",
  BOTH_ARMS_UP_LEFT_KNEE_UP = "Both arms up and left knee up",
  BOTH_ARMS_UP_RIGHT_KNEE_UP = "Both arms up and right knee up",
  BOTH_ARMS_UP_SUMO_SQUAT = "Both arms up and sumo squat",
  BOTH_ARMS_UP_PEE_SQUAT = "Both arms up and pee squat",
  PRAISE_THE_SUN_LEFT_KNEE_UP = "Praise the sun and left knee up",
  PRAISE_THE_SUN_RIGHT_KNEE_UP = "Praise the sun and right knee up",
  PRAISE_THE_SUN_SUMO_SQUAT = "Praise the sun and sumo squat",
  PRAISE_THE_SUN_PEE_SQUAT = "Praise the sun and pee squat",
  INCREASE_ON_RIGHT_ARM = "Increase on right arm",
  INCREASE_ON_LEFT_ARM = "Increase on left arm",
  DECREASE_ON_RIGHT_ARM = "Decrease on right arm",
  DECREASE_ON_LEFT_ARM = "Decrease on left arm",
}
