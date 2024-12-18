import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "@/Components/ThreeJSComponent";
import * as THREE from "three";

interface FPSControllerProps {
  moveSpeed?: number;
  lookSpeed?: number;
  jumpHeight?: number;
}

export class FPSController extends Component {
  static CLASS_NAME = "FPSController";

  private camera!: THREE.PerspectiveCamera;
  private moveSpeed: number;
  private lookSpeed: number;
  private rotation: THREE.Quaternion;
  private translation: THREE.Vector3;
  private phi: number;
  private theta: number;
  private group: THREE.Group;
  private isLocked: boolean;
  private moveForward: boolean;
  private moveBackward: boolean;
  private moveLeft: boolean;
  private moveRight: boolean;
  private moveUp: boolean;
  private moveDown: boolean;

  get NAME() {
    return FPSController.CLASS_NAME;
  }

  constructor(props: FPSControllerProps = {}) {
    super();

    this.moveSpeed = props.moveSpeed || 10.0;
    this.lookSpeed = props.lookSpeed || 5.0;

    this.rotation = new THREE.Quaternion();
    this.translation = new THREE.Vector3(0, 40, -470);
    this.phi = 0;
    this.theta = 0;
    this.group = new THREE.Group();

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.isLocked = false;
  }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    this.camera = threejs.getMainCamera();

    // Sync initial state with camera
    this.translation.copy(this.camera.position);
    this.rotation.copy(this.camera.quaternion);

    // Initialize group to match camera
    this.group.position.copy(this.translation);
    this.group.quaternion.copy(this.rotation);

    threejs.scene.add(this.group);

    if (threejs.controls) {
      threejs.controls.enabled = false;
    }

    // Setup pointer lock
    document.addEventListener("click", this.requestPointerLock.bind(this));
    document.addEventListener(
      "pointerlockchange",
      this.onPointerLockChange.bind(this),
    );
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private requestPointerLock() {
    document.body.requestPointerLock();
  }

  private onPointerLockChange() {
    const wasLocked = this.isLocked;
    this.isLocked = document.pointerLockElement === document.body;

    if (!wasLocked && this.isLocked) {
      // When first locking, sync state with current camera
      this.translation.copy(this.camera.position);
      this.rotation.copy(this.camera.quaternion);

      // Extract initial rotation angles
      const euler = new THREE.Euler().setFromQuaternion(this.rotation, "YXZ");
      this.phi = euler.y;
      this.theta = euler.x;

      // Update group to match
      this.group.position.copy(this.translation);
      this.group.quaternion.copy(this.rotation);
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    const xh = movementX / window.innerWidth;
    const yh = movementY / window.innerHeight;

    this.phi += -xh * this.lookSpeed;
    this.theta = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, this.theta + -yh * this.lookSpeed),
    );
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case "KeyW":
        this.moveForward = true;
        break;
      case "KeyS":
        this.moveBackward = true;
        break;
      case "KeyA":
        this.moveLeft = true;
        break;
      case "KeyD":
        this.moveRight = true;
        break;
      case "KeyE":
        this.moveUp = true;
        break;
      case "ShiftLeft":
        this.moveDown = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case "KeyW":
        this.moveForward = false;
        break;
      case "KeyS":
        this.moveBackward = false;
        break;
      case "KeyA":
        this.moveLeft = false;
        break;
      case "KeyD":
        this.moveRight = false;
        break;
      case "KeyE":
        this.moveUp = false;
        break;
      case "ShiftLeft":
        this.moveDown = false;
        break;
    }
  }

  private updateRotation(deltaTime: number) {
    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    const t = 1.0 - Math.pow(0.01, 5 * deltaTime);
    this.rotation.slerp(q, t);
  }

  private updateTranslation(deltaTime: number) {
    const forwardVelocity =
      (this.moveForward ? 1 : 0) + (this.moveBackward ? -1 : 0);
    const strafeVelocity = (this.moveLeft ? 1 : 0) + (this.moveRight ? -1 : 0);
    const verticalVelocity = (this.moveUp ? 1 : 0) + (this.moveDown ? -1 : 0);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * deltaTime * this.moveSpeed);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * deltaTime * this.moveSpeed);

    const up = new THREE.Vector3(0, 1, 0);
    up.multiplyScalar(verticalVelocity * deltaTime * this.moveSpeed);

    this.translation.add(forward);
    this.translation.add(left);
    this.translation.add(up);
  }

  Update(deltaTime: number) {
    if (!this.isLocked) return;

    this.updateRotation(deltaTime);
    this.updateTranslation(deltaTime);

    // Update camera and group
    this.camera.quaternion.copy(this.rotation);
    this.camera.position.copy(this.translation);

    this.group.quaternion.copy(this.rotation);
    this.group.position.copy(this.translation);
  }

  Destroy() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    threejs.scene.remove(this.group);

    document.removeEventListener(
      "pointerlockchange",
      this.onPointerLockChange.bind(this),
    );
    document.removeEventListener("mousemove", this.onMouseMove.bind(this));
    document.removeEventListener("keydown", this.onKeyDown.bind(this));
    document.removeEventListener("keyup", this.onKeyUp.bind(this));
  }
}

export default FPSController;
