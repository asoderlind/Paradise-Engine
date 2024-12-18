import ThreeJS from "@/Components/ThreeJSComponent";
import { EntityManager } from "@/ComponentSystem/EntityManager";
import { Entity } from "@/ComponentSystem/Entity";
import options from "@/utils/options";
import { DisplacementComponent } from "./Components/GrassFieldComponents/DisplacementComponent";
import TerrainComponent from "./Components/GrassFieldComponents/TerrainComponent";
import DynamicSkyboxComponent from "./Components/DynamicSkyboxComponent";
import OceanComponent from "./Components/OceanComponents/OceanFFTComponent";
import GrassFieldComponent from "./Components/GrassFieldComponents/GrassFieldComponent";
import GrassParticleSystemComponent from "./Components/GrassFieldComponents/GrassParticleSystemComponent";
import { ControlledProgramVariables } from "./types";
import ObjectManager from "./Components/ObjectManagerComponent";
import * as THREE from "three";
import { Poses } from "@/types";
import BoidSwarmComponent from "./Components/BoidSwarmComponent";

// Connect to the WebSocket server (run from a backend server on localhost:8080)
const ws = new WebSocket("ws://localhost:8080"); // Ensure this matches your server address

// This guy is global and will be connected to ALL entities
const entityManager = EntityManager.Init();

const threeJSEntity = new Entity("threeJSEntity");
threeJSEntity.AddComponent(new ThreeJS(options));
threeJSEntity.Init();

const overlayText =
  document.getElementById("overlayText") || document.createElement("div");

// deepcopy of options
const targets: ControlledProgramVariables = JSON.parse(JSON.stringify(options));

let currentPositionIndex = 0;
const positions = [
  {
    translation: new THREE.Vector3(64, 82, -143),
    rotation: new THREE.Quaternion(0.01, -1, -0.05, -0.2),
  },
  {
    translation: new THREE.Vector3(7.5, 87, -113),
    rotation: new THREE.Quaternion(-0.001, 1.0, 0.02, -0.05),
  },
  {
    translation: new THREE.Vector3(7.5, 87, -30),
    rotation: new THREE.Quaternion(-0.001, 2.0, 0.07, -0.4),
  },
  {
    translation: new THREE.Vector3(-1.3, 87, 91),
    rotation: new THREE.Quaternion(0, 1, -0.02, -0.04),
  },
  {
    translation: new THREE.Vector3(67, 73, -240),
    rotation: new THREE.Quaternion(0.01, 0.1, 0.0, 0.8),
  },
];

const updateOptions = (
  options: ControlledProgramVariables,
  targets: ControlledProgramVariables,
  smoothingFactor: number,
) => {
  for (const key in targets) {
    if (
      key === "oceanWindSpeedX" ||
      key === "oceanWindSpeedY" ||
      key === "timeOfDay"
    ) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(targets, key)) {
      if (
        typeof options[key] === "number" &&
        typeof targets[key] === "number"
      ) {
        options[key] += (targets[key] - options[key]) * smoothingFactor;
      } else if (
        options[key] instanceof THREE.Color &&
        targets[key] instanceof THREE.Color
      ) {
        options[key].copy(options[key].lerp(targets[key], smoothingFactor));
      } else if (
        options[key] instanceof THREE.Vector3 &&
        targets[key] instanceof THREE.Vector3
      ) {
        options[key].lerp(targets[key], smoothingFactor);
      } else if (
        options[key] instanceof THREE.Quaternion &&
        targets[key] instanceof THREE.Quaternion
      ) {
        options[key].slerp(targets[key], smoothingFactor);
      }
    }
  }
};

const render = () => {
  const deltaT = (
    threeJSEntity.GetComponent("ThreeJSComponent") as ThreeJS
  ).clock.getDelta();

  const smoothingFactor = 0.005; // Adjust this value to control the speed of transition (0 < smoothingFactor <= 1)

  updateOptions(options, targets, smoothingFactor);

  entityManager.Update(deltaT);
  requestAnimationFrame(render);
};

async function initSpecificScene() {
  /*
  const displacementEntity = new Entity("displacementEntity");
  displacementEntity.AddComponent(new DisplacementComponent(1000));
  displacementEntity.Init();
  */

  const noiseTerrainEntity = new Entity("terrainEntity");
  //noiseTerrainEntity.AddComponent(new TerrainComponent(options));
  noiseTerrainEntity.AddComponent(new DynamicSkyboxComponent(options));
  noiseTerrainEntity.Init();

  const oceanEntity = new Entity("oceanEntity");
  oceanEntity.AddComponent(new OceanComponent(options));
  oceanEntity.Init();

  /*
  const heightMap = (
    displacementEntity.GetComponent(
      "DisplacementComponent",
    ) as DisplacementComponent
  ).heightMap;

  const grassEntity = new Entity("grassEntity");
  grassEntity.AddComponent(
    new GrassFieldComponent({ terrainDim: 1000, heightMap }),
  );
  grassEntity.Init();

  const particleSystemEntity = new Entity("particleSystemEntity");
  particleSystemEntity.AddComponent(
    new GrassParticleSystemComponent(options, heightMap),
  );
  particleSystemEntity.Init();

  const boidSwarmEntity = new Entity("boidSwarmEntity");
  boidSwarmEntity.AddComponent(new BoidSwarmComponent(options));
  boidSwarmEntity.Init();

  const objectManagerEntity = new Entity("objectManagerEntity");
  objectManagerEntity.AddComponent(new ObjectManager(options));
  objectManagerEntity.Init();
  */

  render();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

const setDuckYOffset = (offset: number) => {
  targets.duckYOffset = offset;
};

const setCyberpunkTheme = () => {
  targets.dawnColorHorizon = new THREE.Color(0xff00ff); // Neon Magenta
  targets.dawnColorZenith = new THREE.Color(0x800080); // Purple
  targets.noonColorHorizon = new THREE.Color(0x00ffff); // Cyan
  targets.noonColorZenith = new THREE.Color(0x0000ff); // Electric Blue
  targets.duskColorHorizon = new THREE.Color(0xff1493); // Deep Pink
  targets.duskColorZenith = new THREE.Color(0x4b0082); // Indigo
  targets.nightColorHorizon = new THREE.Color(0x00008b); // Dark Blue
  targets.nightColorZenith = new THREE.Color(0x000000); // Black
  targets.sunDawn = new THREE.Color(0xff69b4); // Hot Pink
  targets.sunNoon = new THREE.Color(0xffff00); // Bright Yellow
  targets.sunDusk = new THREE.Color(0xff4500); // Orange Red
  targets.moon = new THREE.Color(0x00ffff); // Cyan
  targets.grassBaseColor = new THREE.Vector3(0.05, 0.2, 0.01);
  targets.grassTipColor = new THREE.Vector3(0.1, 0.0, 0.4);
  targets.terrainColor = new THREE.Color(0x000000); // Black
  targets.particleBaseColor = new THREE.Color(0xffffff); // White
};

const setPsychedelicTheme = () => {
  targets.dawnColorHorizon = new THREE.Color(0xff0000); // Red
  targets.dawnColorZenith = new THREE.Color(0x00ff00); // Green
  targets.noonColorHorizon = new THREE.Color(0x0000ff); // Blue
  targets.noonColorZenith = new THREE.Color(0xff00ff); // Magenta
  targets.duskColorHorizon = new THREE.Color(0xffff00); // Yellow
  targets.duskColorZenith = new THREE.Color(0x00ffff); // Cyan
  targets.nightColorHorizon = new THREE.Color(0x000000); // Black
  targets.nightColorZenith = new THREE.Color(0x000000); // Black
  targets.sunDawn = new THREE.Color(0xff0000); // Red
  targets.sunNoon = new THREE.Color(0x00ff00); // Green
  targets.sunDusk = new THREE.Color(0x0000ff); // Blue
  targets.moon = new THREE.Color(0xffff00); // Yellow
  targets.grassBaseColor = new THREE.Vector3(0.05, 0.2, 0.01);
  targets.grassTipColor = new THREE.Vector3(1.0, 0.0, 0.345);
  targets.terrainColor = new THREE.Color(0x000000); // Black
  targets.particleBaseColor = new THREE.Color(0xffffff); // White
};

const increaseWindSpeed = () => {
  if (targets.oceanWindSpeedX < 20 && targets.oceanWindSpeedY < 20) {
    targets.oceanWindSpeedX += 5;
    targets.oceanWindSpeedY += 5;
  }
};

const decreaseWindSpeed = () => {
  if (targets.oceanWindSpeedX > 5 && targets.oceanWindSpeedY > 5) {
    targets.oceanWindSpeedX -= 5;
    targets.oceanWindSpeedY -= 5;
  }
};

const increaseGrassHeight = () => {
  if (targets.grassHeight < 5.5) targets.grassHeight += 1.5;
};

const decreaseGrassHeight = () => {
  if (targets.grassHeight > 1.0) targets.grassHeight -= 1.5;
};

const changeGrassRedColor = () => {
  targets.grassBaseColor = new THREE.Vector3(0.05, 0.2, 0.01);
  targets.grassTipColor = new THREE.Vector3(1.0, 0.0, 0.345);
};

const changeGrassLavenderColor = () => {
  targets.grassBaseColor = new THREE.Vector3(0.05, 0.2, 0.01);
  targets.grassTipColor = new THREE.Vector3(0.1, 0.0, 0.4);
};

const nextPosition = () => {
  // Move to the next position
  currentPositionIndex = (currentPositionIndex + 1) % positions.length;
  targets.cameraPosition = positions[currentPositionIndex].translation;
  targets.cameraRotation = positions[currentPositionIndex].rotation;
};

const previousPosition = () => {
  // Move to the previous position
  currentPositionIndex =
    (currentPositionIndex - 1 + positions.length) % positions.length;
  targets.cameraPosition = positions[currentPositionIndex].translation;
  targets.cameraRotation = positions[currentPositionIndex].rotation;
};

const increaseCloudDensity = () => {
  targets.uCloudNoiseScale += 0.5;
  targets.uCloudDensity = 2.0;
};

const decreaseCloudDensity = () => {
  targets.uCloudNoiseScale -= 0.5;
  targets.uCloudDensity = 2.0;
};

const increaseRocksYOffset = () => {
  targets.rocksYOffset = 10;
};

const resetRocksYOffset = () => {
  targets.rocksYOffset = 0;
};

const positiveModulo = (dividend: number, divisor: number): number => {
  return ((dividend % divisor) + divisor) % divisor;
};

const setAmbientLightIntensity = () => {
  const dayAmbientLightIntensity = 3.0;
  const nightAmbientLightIntensity = 1.0;
  targets.ambientLightIntensity =
    targets.timeOfDay > 6 && targets.timeOfDay < 15
      ? dayAmbientLightIntensity
      : nightAmbientLightIntensity;
};

/**
 * Increases the timeOfDay by a specified increment.
 * Wraps around to stay within [0, 24).
 *
 * @param increment - The amount to increase (default is 4).
 */
const increaseTimeOfDay = (increment: number = 4): void => {
  targets.timeOfDay = positiveModulo(targets.timeOfDay + increment, 24);
  setAmbientLightIntensity();
};

/**
 * Decreases the timeOfDay by a specified decrement.
 * Wraps around to stay within [0, 24).
 *
 * @param decrement - The amount to decrease (default is 4).
 */
const decreaseTimeOfDay = (decrement: number = 4): void => {
  targets.timeOfDay = positiveModulo(targets.timeOfDay - decrement, 24);
  setAmbientLightIntensity();
};

const turnCameraRight = () => {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  targets.cameraRotation = options.cameraRotation.clone().multiply(quaternion);
};

const turnCameraLeft = () => {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
  targets.cameraRotation = options.cameraRotation.clone().multiply(quaternion);
};

const setTimeOfDay = (time: number) => {
  targets.timeOfDay = time;
  setAmbientLightIntensity();
};

const setBoidCohesion = (target: number) => {
  targets.cohesionWeight = target;
};

const moveMoaiLeft = () => {
  targets.moaiTranslationOffset = options.moaiTranslationOffset
    .clone()
    .add(new THREE.Vector3(0, 0, 2));
};

const moveMoaiRight = () => {
  targets.moaiTranslationOffset = options.moaiTranslationOffset
    .clone()
    .add(new THREE.Vector3(0, 0, -2));
};

const moveMoaiUp = () => {
  targets.moaiTranslationOffset = options.moaiTranslationOffset
    .clone()
    .add(new THREE.Vector3(0, 2, 0));
};

const moveMoaiDown = () => {
  targets.moaiTranslationOffset = options.moaiTranslationOffset
    .clone()
    .add(new THREE.Vector3(0, -2, 0));
};

const scaleUpMoai = () => {
  targets.moaiScaleOffset = options.moaiScaleOffset + 1;
};

const scaleDownMoai = () => {
  targets.moaiScaleOffset = options.moaiScaleOffset - 1;
};

const rotateMoai = () => {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  targets.moaiRotationOffset = options.moaiRotationOffset
    .clone()
    .multiply(quaternion);
};

const playQuackSound = () => {
  const audio = new Audio("sounds/quack.mp3");
  audio.play();
};

const playVineSound = () => {
  const audio = new Audio("sounds/vine.mp3");
  audio.play();
};

const blackAndWhiteTheme = () => {
  targets.dawnColorHorizon = new THREE.Color(0xffffff); // White
  targets.dawnColorZenith = new THREE.Color(0x000000); // Black
  targets.noonColorHorizon = new THREE.Color(0xffffff); // White
  targets.noonColorZenith = new THREE.Color(0x000000); // Black
  targets.duskColorHorizon = new THREE.Color(0xffffff); // White
  targets.duskColorZenith = new THREE.Color(0x000000); // Black
  targets.nightColorZenith = new THREE.Color(0x000000); // Black
  targets.sunDawn = new THREE.Color(0xffffff); // White
  targets.sunNoon = new THREE.Color(0xffffff); // White
  targets.sunDusk = new THREE.Color(0xffffff); // White
  targets.moon = new THREE.Color(0xffffff); // White
  targets.grassBaseColor = new THREE.Vector3(0, 0, 0);
  targets.grassTipColor = new THREE.Vector3(1, 1, 1);
  targets.terrainColor = new THREE.Color(0x000000); // Black
  targets.particleBaseColor = new THREE.Color(0xffffff); // Black
};

/*
 * Pose handlers
 */

const onTPose = () => {
  overlayText.innerText = "T-Pose:\nNext position";
  nextPosition();
};

const onIncreaseLeftArm = () => {
  overlayText.innerText = "Left Arm Raised: Increasing time of day";
  increaseTimeOfDay();
};

const onDecreaseLeftArm = () => {
  overlayText.innerText = "Left Arm Lowered: Decreasing time of day";
  decreaseTimeOfDay();
};

const onIncreaseRightArm = () => {
  overlayText.innerText =
    "Right Arm Raised: Increasing wind speed and cloud density";
  increaseWindSpeed();
  increaseCloudDensity();
};

const onDecreaseRightArm = () => {
  overlayText.innerText =
    "Right Arm Lowered: Decreasing wind speed and cloud density";
  decreaseWindSpeed();
  decreaseCloudDensity();
};

const onRightArmSide = () => {
  overlayText.innerText = "Right Arm to Side: Turning camera right";
  turnCameraLeft();
};

const onLeftArmSide = () => {
  overlayText.innerText = "Left Arm to Side: Turning camera left";
  turnCameraRight();
};

const onBothArmsUp = () => {
  overlayText.innerText = "Both Arms Up: Special action";
  if (currentPositionIndex === 1) {
    overlayText.innerText += "\n Increasing rocks' Y-offset";
    increaseRocksYOffset();
  } else if (currentPositionIndex === 3) {
    overlayText.innerText += "\nDuck appears!";
    setDuckYOffset(0);
    playQuackSound();
  }
};

const onPraiseTheSun = () => {
  overlayText.innerText = "Praise the Sun: \nSetting time to noon";
  setTimeOfDay(12);
};

const onLeftKneeUp = () => {
  overlayText.innerText = "Left Knee Up: \nSetting boid cohesion to 100";
  setBoidCohesion(100);
};

const onRightArmSideLeftKneeUp = () => {
  overlayText.innerText = "Right Arm Side + Left Knee Up: \nMoving Moai right";
  moveMoaiRight();
};

const onLeftArmSideLeftKneeUp = () => {
  overlayText.innerText = "Left Arm Side + Left Knee Up: \nMoving Moai left";
  moveMoaiLeft();
};

const onBothArmsUpLeftKneeUp = () => {
  overlayText.innerText = "Both Arms Up + Left Knee Up: \nMoving Moai up";
  moveMoaiUp();
};

const onPraiseTheSunLeftKneeUp = () => {
  overlayText.innerText =
    "Praise the Sun + Left Knee Up: \nActivating cyberpunk theme";
  setCyberpunkTheme();
};

const onRightKneeUp = () => {
  overlayText.innerText = "Right Knee Up: \nSetting boid cohesion to 200";
  setBoidCohesion(200);
};

const onRightArmSideRightKneeUp = () => {
  overlayText.innerText =
    "Right Arm Side + Right Knee Up: \nChanging grass to lavender";
  changeGrassLavenderColor();
};

const onLeftArmSideRightKneeUp = () => {
  overlayText.innerText =
    "Left Arm Side + Right Knee Up: \nChanging grass to red";
  changeGrassRedColor();
};

const onBothArmsUpRightKneeUp = () => {
  overlayText.innerText =
    "Both Arms Up + Right Knee Up: \nIncreasing grass height";
  increaseGrassHeight();
};

const onPraiseTheSunRightKneeUp = () => {
  overlayText.innerText =
    "Praise the Sun + Right Knee Up: \nDecreasing grass height";
  decreaseGrassHeight();
};

const onPeeSquat = () => {
  overlayText.innerText =
    "Pee Squat: Moai moves down and psychedelic theme activates";
  moveMoaiDown();
  setPsychedelicTheme();
};

const onLeftArmSidePeeSquat = () => {
  overlayText.innerText = "Left Arm Side + Pee Squat: Playing Vine sound";
  playVineSound();
};

const onRightArmSidePeeSquat = () => {
  overlayText.innerText =
    "Right Arm Side + Pee Squat: Black and white theme activates";
  blackAndWhiteTheme();
};

const onBothArmsUpPeeSquat = () => {
  overlayText.innerText =
    "Both Arms Up + Pee Squat: Reverting to previous position";
  previousPosition();
};

const onPraiseTheSunPeeSquat = () => {
  overlayText.innerText = "Praise the Sun + Pee Squat: Scaling down Moai";
  scaleDownMoai();
};

const onSumoSquat = () => {
  overlayText.innerText = "Sumo Squat: Resetting rocks and duck offsets";
  resetRocksYOffset();
  setDuckYOffset(-100);
};

const onLeftArmSideSumoSquat = () => {
  overlayText.innerText =
    "Left Arm Side + Sumo Squat: Moving and rotating Moai left";
  moveMoaiLeft();
  rotateMoai();
};

const onRightArmSideSumoSquat = () => {
  overlayText.innerText = "Right Arm Side + Sumo Squat: Moving Moai right";
  moveMoaiRight();
};

const onBothArmsUpSumoSquat = () => {
  overlayText.innerText = "Both Arms Up + Sumo Squat: Moving Moai up";
  moveMoaiUp();
};

const onPraiseTheSunSumoSquat = () => {
  overlayText.innerText =
    "Praise the Sun + Sumo Squat: Scaling \n up Moai and playing Vine sound";
  scaleUpMoai();
  playVineSound();
};

const onUndefinedPose = () => {};

/*
 * Keyboard event handlers
 */
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case "1": // t-pose
      setPsychedelicTheme();
      break;
    case "2": // both arms up
      onBothArmsUp();
      break;
    case "3": // sumo squat
      onSumoSquat();
      break;
    case "4": // increase on left arm
      onIncreaseLeftArm();
      break;
    case "5": // decrease on left arm
      onDecreaseLeftArm();
      break;
    case "6": // increase on right arm
      onIncreaseRightArm();
      break;
    case "7": // decrease on right arm
      onDecreaseRightArm();
      break;
    case "8": // right arm to side
      onRightArmSide();
      break;
    case "9": // left arm to side
      onLeftArmSide();
      break;
    case "0": // praise the sun
      onPraiseTheSun();
      break;
    case "q": // left knee up
      onLeftKneeUp();
      break;
    case "r": // both arms up and left knee up
      onBothArmsUpLeftKneeUp();
      break;
    case "t": // praise the sun and left knee up
      onPraiseTheSunLeftKneeUp();
      break;
    case "y": // right knee up
      onRightKneeUp();
      break;
    case "u": // right arm side and right knee up
      onRightArmSideRightKneeUp();
      break;
    case "i": // left arm side and right knee up
      onLeftArmSideRightKneeUp();
      break;
    case "o": // both arms up and right knee up
      onBothArmsUpRightKneeUp();
      break;
    case "p": // praise the sun and right knee up
      onPraiseTheSunRightKneeUp();
      break;
    case "f": // left arm side and pee squat
      onLeftArmSidePeeSquat();
      break;
    case "g": // left arm side and sumo squat
      onLeftArmSideSumoSquat();
      break;
    case "h": // right arm side and pee squat
      onRightArmSidePeeSquat();
      break;
    case "j": // right arm side and sumo squat
      onRightArmSideSumoSquat();
      break;
    case "k": // praise the sun and pee squat
      onPraiseTheSunPeeSquat();
      break;
    case "l": // praise the sun and sumo squat
      onPraiseTheSunSumoSquat();
      break;
    case "z": // undefined pose
      onUndefinedPose();
      break;
    default:
      console.warn(`Unhandled key: ${e.key}`);
      break;
  }
};

document.addEventListener("keydown", throttle(handleKeydown, 200)); // 200 ms throttle

/*
 * Handle incoming WebSocket messages
 */
ws.onmessage = (event: MessageEvent) => {
  if (typeof event.data !== "string") {
    return;
  }

  const data = JSON.parse(event.data);
  switch (data.pose) {
    case Poses.TPOSE:
      onTPose();
      break;
    case Poses.BOTH_ARMS_UP:
      onBothArmsUp();
      break;
    case Poses.SUMO_SQUAT:
      onSumoSquat();
      break;
    case Poses.INCREASE_ON_LEFT_ARM:
      onIncreaseLeftArm();
      break;
    case Poses.DECREASE_ON_LEFT_ARM:
      onDecreaseLeftArm();
      break;
    case Poses.INCREASE_ON_RIGHT_ARM:
      onIncreaseRightArm();
      break;
    case Poses.DECREASE_ON_RIGHT_ARM:
      onDecreaseRightArm();
      break;
    case Poses.RIGHT_ARM_TO_SIDE:
      onRightArmSide();
      break;
    case Poses.LEFT_ARM_TO_SIDE:
      onLeftArmSide();
      break;
    case Poses.PRAISE_THE_SUN:
      onPraiseTheSun();
      break;
    case Poses.LEFT_KNEE_UP:
      onLeftKneeUp();
      break;
    case Poses.RIGHT_ARM_SIDE_LEFT_KNEE_UP:
      onRightArmSideLeftKneeUp();
      break;
    case Poses.LEFT_ARM_SIDE_LEFT_KNEE_UP:
      onLeftArmSideLeftKneeUp();
      break;
    case Poses.BOTH_ARMS_UP_LEFT_KNEE_UP:
      onBothArmsUpLeftKneeUp();
      break;
    case Poses.PRAISE_THE_SUN_LEFT_KNEE_UP:
      onPraiseTheSunLeftKneeUp();
      break;
    case Poses.RIGHT_KNEE_UP:
      onRightKneeUp();
      break;
    case Poses.RIGHT_ARM_SIDE_RIGHT_KNEE_UP:
      onRightArmSideRightKneeUp();
      break;
    case Poses.LEFT_ARM_SIDE_RIGHT_KNEE_UP:
      onLeftArmSideRightKneeUp();
      break;
    case Poses.BOTH_ARMS_UP_RIGHT_KNEE_UP:
      onBothArmsUpRightKneeUp();
      break;
    case Poses.PRAISE_THE_SUN_RIGHT_KNEE_UP:
      onPraiseTheSunRightKneeUp();
      break;
    case Poses.PEE_SQUAT:
      onPeeSquat();
      break;
    case Poses.LEFT_ARM_SIDE_PEE_SQUAT:
      onLeftArmSidePeeSquat();
      break;
    case Poses.RIGHT_ARM_SIDE_PEE_SQUAT:
      onRightArmSidePeeSquat();
      break;
    case Poses.BOTH_ARMS_UP_PEE_SQUAT:
      onBothArmsUpPeeSquat();
      break;
    case Poses.PRAISE_THE_SUN_PEE_SQUAT:
      onPraiseTheSunPeeSquat();
      break;
    case Poses.LEFT_ARM_SIDE_SUMO_SQUAT:
      onLeftArmSideSumoSquat();
      break;
    case Poses.RIGHT_ARM_SIDE_SUMO_SQUAT:
      onRightArmSideSumoSquat();
      break;
    case Poses.BOTH_ARMS_UP_SUMO_SQUAT:
      onBothArmsUpSumoSquat();
      break;
    case Poses.PRAISE_THE_SUN_SUMO_SQUAT:
      onPraiseTheSunSumoSquat();
      break;
    case Poses.UNDEFINED_POSE:
      onUndefinedPose();
      break;
    default:
      console.warn(`Unhandled pose: ${data.pose}`);
      break;
  }

  console.log("Received message from WebSocket:", data);
};

// Error handling for WebSocket
ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

// WebSocket connection opened
ws.onopen = () => {
  console.log("WebSocket connection established.");
};

// WebSocket connection closed
ws.onclose = () => {
  console.log("WebSocket connection closed.");
};

function main() {
  initSpecificScene();
  render();
}

main();
