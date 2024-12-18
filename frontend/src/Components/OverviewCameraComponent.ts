import { Component } from "@/ComponentSystem/Component";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import ThreeJSComponent from "./ThreeJSComponent";

class OverviewCameraComponent extends Component {
  static CLASS_NAME = "OverviewCameraComponent";

  get NAME() {
    return OverviewCameraComponent.CLASS_NAME;
  }

  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJSComponent;
    const scene = threejs.scene;

    // Set up camera
    this.camera.position.set(0, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // Set up renderer
    this.renderer.setSize(window.innerWidth / 4, window.innerHeight / 4);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.bottom = "10px";
    this.renderer.domElement.style.right = "10px";
    document.body.appendChild(this.renderer.domElement);

    // Set up controls
    this.controls.enableDamping = true;

    // Create a frustum helper for the main camera
    const frustumHelper = new THREE.CameraHelper(threejs.getMainCamera());
    scene.add(frustumHelper);

    // Render loop
    const renderOverview = () => {
      requestAnimationFrame(renderOverview);
      this.controls.update();
      frustumHelper.update();
      this.renderer.render(scene, this.camera);
    };
    renderOverview();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Update(_deltaTime: number) {
    // Update logic if needed
  }
}

export default OverviewCameraComponent;
