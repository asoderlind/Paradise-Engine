/**
 * @author asoderlind / https://github.com/asoderlind
 *
 * Based on:
 * @author jbouny / https://github.com/fft-ocean
 *
 * Explanation of screen space grid:
 * http://habib.wikidot.com/projected-grid-ocean-shader-full-html-version
 */
import * as THREE from "three";

interface MirrorRendererOptions {
  textureWidth?: number;
  textureHeight?: number;
  clipBias?: number;
  texture?: THREE.WebGLRenderTarget;
  tempTexture?: THREE.WebGLRenderTarget;
}

class MirrorRenderer extends THREE.Object3D {
  hasPrinted = false;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  mirrorPlane: THREE.Plane;
  normal: THREE.Vector3;
  cameraWorldPosition: THREE.Vector3;
  rotationMatrix: THREE.Matrix4;
  lookAtPosition: THREE.Vector3;
  clipPlane: THREE.Vector4;
  camera: THREE.PerspectiveCamera;
  textureMatrix: THREE.Matrix4;
  declare matrixWorld: THREE.Matrix4;
  mirrorCamera: THREE.PerspectiveCamera;
  mesh: THREE.Object3D;
  texture: THREE.WebGLRenderTarget;
  tempTexture: THREE.WebGLRenderTarget;
  clipBias: number;
  eye!: THREE.Vector3;
  declare up: THREE.Vector3;
  declare parent: THREE.Object3D;
  declare id: number;
  name: string;
  matrixNeedsUpdate: boolean;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    options?: MirrorRendererOptions,
  ) {
    super();
    this.name = "mirror_" + this.id;

    options = options || {};

    this.matrixNeedsUpdate = true;

    const width = options?.textureWidth || 512;
    const height = options?.textureHeight || 512;
    this.clipBias = options?.clipBias || 0.0;

    this.renderer = renderer;
    this.scene = scene;
    this.mirrorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3(0, 0, 1);
    this.cameraWorldPosition = new THREE.Vector3();
    this.rotationMatrix = new THREE.Matrix4();
    this.lookAtPosition = new THREE.Vector3(0, 0, -1);
    this.clipPlane = new THREE.Vector4();

    if (camera instanceof THREE.PerspectiveCamera) {
      this.camera = camera;
    } else {
      this.camera = new THREE.PerspectiveCamera();
      console.log(this.name + ": camera is not a Perspective Camera!");
    }

    this.textureMatrix = new THREE.Matrix4();

    this.mirrorCamera = this.camera.clone();

    this.mesh = new THREE.Object3D();

    this.texture = new THREE.WebGLRenderTarget(width, height);
    this.tempTexture = new THREE.WebGLRenderTarget(width, height);

    if (
      !THREE.MathUtils.isPowerOfTwo(width) ||
      !THREE.MathUtils.isPowerOfTwo(height)
    ) {
      this.texture.texture.generateMipmaps = false;
      this.tempTexture.texture.generateMipmaps = false;
    }
  }
  updateTextureMatrix() {
    if (this.parent != undefined) {
      this.mesh = this.parent;
    }

    function sign(x: number) {
      return x ? (x < 0 ? -1 : 1) : 0;
    }

    this.camera.updateMatrixWorld();

    this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);

    this.rotationMatrix.extractRotation(this.matrixWorld);

    this.normal = new THREE.Vector3(0, 1, 0).applyEuler(this.mesh.rotation);
    const cameraLookAt = new THREE.Vector3(0, 0, 1).applyEuler(
      this.camera.rotation,
    );
    if (this.normal.dot(cameraLookAt) < 0) {
      const meshNormal = new THREE.Vector3(0, 0, 1).applyEuler(
        this.mesh.rotation,
      );
      this.normal.reflect(meshNormal);
    }

    const view = this.mesh.position.clone().sub(this.cameraWorldPosition);
    //view.y -= 0.1;
    view.reflect(this.normal).negate();
    view.add(this.mesh.position);

    this.rotationMatrix.extractRotation(this.camera.matrixWorld);

    this.lookAtPosition.set(0, 0, -1);
    this.lookAtPosition.applyMatrix4(this.rotationMatrix);
    this.lookAtPosition.add(this.cameraWorldPosition);

    const target = this.mesh.position.clone().sub(this.lookAtPosition);
    target.reflect(this.normal).negate();
    target.add(this.mesh.position);

    this.up.set(0, -1, 0);
    this.up.applyMatrix4(this.rotationMatrix);
    this.up.reflect(this.normal).negate();

    this.mirrorCamera.position.copy(view);
    this.mirrorCamera.up = this.up;
    this.mirrorCamera.lookAt(target);
    this.mirrorCamera.aspect = this.camera.aspect;

    this.mirrorCamera.updateProjectionMatrix();
    this.mirrorCamera.updateMatrixWorld();
    this.mirrorCamera.matrixWorldInverse
      .copy(this.mirrorCamera.matrixWorld)
      .invert();

    // Update the texture matrix
    this.textureMatrix.set(
      0.5,
      0.0,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0,
    );
    this.textureMatrix.multiply(this.mirrorCamera.projectionMatrix);
    this.textureMatrix.multiply(this.mirrorCamera.matrixWorldInverse);

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    this.mirrorPlane.setFromNormalAndCoplanarPoint(
      this.normal,
      this.mesh.position,
    );
    this.mirrorPlane.applyMatrix4(this.mirrorCamera.matrixWorldInverse);

    this.clipPlane.set(
      this.mirrorPlane.normal.x,
      this.mirrorPlane.normal.y,
      this.mirrorPlane.normal.z,
      this.mirrorPlane.constant,
    );

    const q = new THREE.Vector4();
    const projectionMatrix = this.mirrorCamera.projectionMatrix;

    q.x =
      (sign(this.clipPlane.x) + projectionMatrix.elements[8]) /
      projectionMatrix.elements[0];
    q.y =
      (sign(this.clipPlane.y) + projectionMatrix.elements[9]) /
      projectionMatrix.elements[5];
    q.z = -1.0;
    q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // Calculate the scaled plane vector
    let c = new THREE.Vector4();
    c = this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(q));

    // Replacing the third row of the projection matrix
    projectionMatrix.elements[2] = c.x;
    projectionMatrix.elements[6] = c.y;
    projectionMatrix.elements[10] = c.z + 1.0 - this.clipBias;
    projectionMatrix.elements[14] = c.w;

    const worldCoordinates = new THREE.Vector3();
    worldCoordinates.setFromMatrixPosition(this.camera.matrixWorld);
    this.eye = worldCoordinates;
  }
  render() {
    if (this.matrixNeedsUpdate) {
      this.updateTextureMatrix();
    }

    this.matrixNeedsUpdate = true;

    // Render the mirrored view of the current scene into the target texture
    if (this.scene !== undefined && this.scene instanceof THREE.Scene) {
      this.renderer.setRenderTarget(this.texture);
      this.renderer.render(this.scene, this.mirrorCamera);
      this.renderer.setRenderTarget(null);
    }
  }
}

export default MirrorRenderer;
