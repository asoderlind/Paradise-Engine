import * as THREE from "three";

import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

interface ProgressEvent extends Event {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

function onProgress(xhr: ProgressEvent) {
  if (xhr.lengthComputable) {
    const percentComplete = (xhr.loaded / xhr.total) * 100;
    console.log("model " + percentComplete.toFixed(2) + "% downloaded");
  }
}

function onError(error: ErrorEvent) {
  console.error("Error loading object:", error);
}

function loadObj(
  objPath: string,
  material?: THREE.Material,
  texture?: THREE.Texture | THREE.DataTexture,
): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();

    loader.load(
      objPath,
      (object) => {
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            if (material) (child as THREE.Mesh).material = material;
            if (
              texture &&
              (child as THREE.Mesh).material instanceof
                THREE.MeshStandardMaterial
            ) {
              (
                (child as THREE.Mesh).material as THREE.MeshStandardMaterial
              ).map = texture;
            }
          }
        });
        resolve(object);
      },
      onProgress,
      (error) => {
        //@ts-expect-error: ErrorEvent type is not compatible with onError parameter type
        onError(error);
        reject(error);
      },
    );
  });
}

export { loadObj };
