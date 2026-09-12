import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D
) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const maxDimension = Math.max(size.x, size.y, size.z);

  const distance =
    maxDimension /
    (2 * Math.tan((camera.fov * Math.PI) / 360));

  camera.position.set(
    center.x + distance * 1.2,
    center.y + distance * 1.2,
    center.z + distance * 1.2
  );

  camera.near = Math.max(maxDimension / 10000, 0.01);
  camera.far = Math.max(maxDimension * 100, 1000);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

export function setCameraView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  direction: THREE.Vector3
) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const maxDimension = Math.max(size.x, size.y, size.z);

  const distance =
    maxDimension /
    (2 * Math.tan((camera.fov * Math.PI) / 360));

  camera.position.copy(
    center.clone().add(
      direction
        .clone()
        .normalize()
        .multiplyScalar(distance * 1.2)
    )
  );

  controls.target.copy(center);
  controls.update();
}