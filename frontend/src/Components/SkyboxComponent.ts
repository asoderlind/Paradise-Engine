import { Component } from "@/ComponentSystem/Component";
import ThreeJS from "./ThreeJSComponent";
import * as THREE from "three";

class SkyboxComponent extends Component {
  static CLASS_NAME = "SkyboxComponent";

  get NAME() {
    return SkyboxComponent.CLASS_NAME;
  }

  constructor() {
    super();
  }

  InitEntity() {
    const threejs = this.FindEntity("threeJSEntity").GetComponent(
      "ThreeJSComponent",
    ) as ThreeJS;

    const scene = threejs.scene;
    const loader = new THREE.TextureLoader();
    const texture = loader.load("textures/skybox.jpg", () => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Update(_deltaTime: number): void {}
}

export default SkyboxComponent;
