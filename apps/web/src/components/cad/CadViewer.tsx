"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  fitCameraToObject,
  setCameraView as setCadCameraView,
} from "@/lib/cad/camera";

declare global {
  interface Window {
    occtimportjs?: () => Promise<OcctModule>;
  }
}

type OcctMesh = {
  name: string;
  color?: [number, number, number];
  attributes: {
    position: {
      array: number[];
    };
    normal?: {
      array: number[];
    };
  };
  index: {
    array: number[];
  };
};

type OcctNode = {
  name: string;
  meshes: number[];
  children: OcctNode[];
};

type OcctResult = {
  success: boolean;
  root: OcctNode;
  meshes: OcctMesh[];
};

type OcctModule = {
  ReadStepFile: (
    content: Uint8Array,
    params: {
      linearUnit: string;
      linearDeflectionType: string;
      linearDeflection: number;
      angularDeflection: number;
    } | null
  ) => OcctResult;
};

type CadViewerProps = {
  file?: File | null;
};

function loadOcctScript(): Promise<void> {
  if (window.occtimportjs) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-occt-import-js="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load OpenCascade"))
      );
      return;
    }

    const script = document.createElement("script");

    script.src = "/occt-import-js.js";
    script.async = true;
    script.dataset.occtImportJs = "true";

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load OpenCascade JavaScript runtime"));

    document.head.appendChild(script);
  });
}

export default function CadViewer({ file }: CadViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const edgesRef = useRef(true);
  const shadedRef = useRef(true);
  const toggleEdges = () => {
  if (!modelRef.current) return;

  const showEdges = !edgesRef.current;
  edgesRef.current = showEdges;

  modelRef.current.traverse((object) => {
    if (object instanceof THREE.LineSegments) {
      object.visible = showEdges;
      }
    });
  };
  const resetView = () => {
  if (!modelRef.current || !cameraRef.current || !controlsRef.current) {
    return;
  }

  fitCameraToObject(
    cameraRef.current,
    controlsRef.current,
    modelRef.current
  );
};
  
  const clearModel = () => {
  const scene = sceneRef.current;
  const model = modelRef.current;

  if (!scene || !model) return;

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }

    if (object instanceof THREE.LineSegments) {
      object.geometry.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  scene.remove(model);
  modelRef.current = null;

  setStatus("Ready");
  setError(null);
  };

  const setCameraView = (direction: THREE.Vector3) => {
  if (!modelRef.current || !cameraRef.current || !controlsRef.current) {
    return;
  }

  setCadCameraView(
    cameraRef.current,
    controlsRef.current,
    modelRef.current,
    direction
  );
};

const setFrontView = () => {
  setCameraView(new THREE.Vector3(0, 0, 1));
};

const setBackView = () => {
  setCameraView(new THREE.Vector3(0, 0, -1));
};

const setTopView = () => {
  setCameraView(new THREE.Vector3(0, 1, 0));
};

const setBottomView = () => {
  setCameraView(new THREE.Vector3(0, -1, 0));
};

const setRightView = () => {
  setCameraView(new THREE.Vector3(1, 0, 0));
};

const setLeftView = () => {
  setCameraView(new THREE.Vector3(-1, 0, 0));
};

const setIsometricView = () => {
  setCameraView(new THREE.Vector3(1, 1, 1));
};

  const toggleShaded = () => {
  if (!modelRef.current) return;

  const shaded = !shadedRef.current;
  shadedRef.current = shaded;

  modelRef.current.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material.wireframe = !shaded;
    }
  });
  };

  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------
  // THREE.JS VIEWER
  // ------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);

    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );

    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    controlsRef.current = controls;

    // Lighting

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Temporary grid

    const grid = new THREE.GridHelper(10, 10);
    grid.name = "TemporaryGrid";
    scene.add(grid);

    // Temporary axes

    const axes = new THREE.AxesHelper(3);
    axes.name = "TemporaryAxes";
    scene.add(axes);

    // Animation

    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener("resize", handleResize);

      controls.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ------------------------------------------------------------
  // LOAD STEP FILE
  // ------------------------------------------------------------

  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    const loadStepFile = async () => {
      try {
        setStatus("Loading OpenCascade...");
        setError(null);

        await loadOcctScript();

        if (cancelled) return;

        if (!window.occtimportjs) {
          throw new Error("OpenCascade runtime was not found.");
        }

        setStatus("Reading STEP file...");

        const occt = await window.occtimportjs();

        if (cancelled) return;

        const buffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(buffer);

        setStatus("Converting CAD geometry...");

        const result = occt.ReadStepFile(fileBuffer, {
          linearUnit: "millimeter",
          linearDeflectionType: "bounding_box_ratio",
          linearDeflection: 0.1,
          angularDeflection: 0.5,
        });

        if (!result.success) {
          throw new Error(
            "OpenCascade could not successfully read this STEP file."
          );
        }

        if (cancelled) return;

        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        if (!scene || !camera || !controls) {
          throw new Error("3D viewer is not initialized.");
        }

        // Remove previous model

        if (modelRef.current) {
          scene.remove(modelRef.current);

          modelRef.current.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();

              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });

          modelRef.current = null;
        }

        // Remove temporary grid and axes

        const grid = scene.getObjectByName("TemporaryGrid");
        const axes = scene.getObjectByName("TemporaryAxes");

        if (grid) scene.remove(grid);
        if (axes) scene.remove(axes);

        // Create CAD model

        const model = new THREE.Group();
        model.name = file.name;

        const addNode = (node: OcctNode) => {
          for (const meshIndex of node.meshes) {
            const meshData = result.meshes[meshIndex];

            if (!meshData) continue;

            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(
              meshData.attributes.position.array
            );

            geometry.setAttribute(
              "position",
              new THREE.BufferAttribute(positions, 3)
            );

            if (meshData.attributes.normal) {
              const normals = new Float32Array(
                meshData.attributes.normal.array
              );

              geometry.setAttribute(
                "normal",
                new THREE.BufferAttribute(normals, 3)
              );
            } else {
              geometry.computeVertexNormals();
            }

            const indices = new Uint32Array(meshData.index.array);

            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            geometry.computeBoundingSphere();

            const color = meshData.color ?? [0.72, 0.75, 0.78];

            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color[0], color[1], color[2]),
              metalness: 0.05,
              roughness: 0.65,
              side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);

            mesh.name = meshData.name;

            model.add(mesh);

            // CAD-style edges

            const edgesGeometry = new THREE.EdgesGeometry(
              geometry,
              30
            );

            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x333333,
              transparent: true,
              opacity: 0.65,
            });

            const edges = new THREE.LineSegments(
              edgesGeometry,
              edgesMaterial
            );

            edges.name = `${meshData.name}-edges`;

            model.add(edges);
          }

          for (const child of node.children ?? []) {
            addNode(child);
          }
        };

        addNode(result.root);

        scene.add(model);
        modelRef.current = model;

        // --------------------------------------------------------
        // FIT MODEL TO VIEW
        // --------------------------------------------------------

        const boundingBox = new THREE.Box3().setFromObject(model);

        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());

        const maxDimension = Math.max(
          size.x,
          size.y,
          size.z
        );

        model.position.sub(center);

        const distance =
          maxDimension /
          (2 * Math.tan((camera.fov * Math.PI) / 360));

        camera.position.set(
          distance * 1.2,
          distance * 1.2,
          distance * 1.2
        );

        camera.near = Math.max(maxDimension / 10000, 0.01);
        camera.far = Math.max(maxDimension * 100, 1000);

        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();

        setStatus(
          `Loaded ${file.name} • ${result.meshes.length} mesh${
            result.meshes.length === 1 ? "" : "es"
          }`
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load CAD file."
          );

          setStatus("Failed");
        }
      }
    };

    loadStepFile();

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-16 z-10 flex flex-wrap gap-2">
  <button
    type="button"
    onClick={setFrontView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Front
  </button>

  <button
    type="button"
    onClick={setBackView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Back
  </button>

  <button
    type="button"
    onClick={setTopView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Top
  </button>

  <button
    type="button"
    onClick={setBottomView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Bottom
  </button>

  <button
    type="button"
    onClick={setLeftView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Left
  </button>

  <button
    type="button"
    onClick={setRightView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Right
  </button>

  <button
    type="button"
    onClick={setIsometricView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    ISO
  </button>

  <button
    type="button"
    onClick={resetView}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Reset
  </button>

  <button
    type="button"
    onClick={toggleShaded}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Shaded
  </button>

  <button
    type="button"
    onClick={toggleEdges}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Edges
  </button>

  <button
    type="button"
    onClick={clearModel}
    className="rounded-md bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100"
  >
    Clear
  </button>
</div>
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden rounded-lg"
      />

      <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-2 text-sm shadow">
        {status}
      </div>

      {error && (
        <div className="absolute bottom-4 left-4 right-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 shadow">
          {error}
        </div>
      )}
    </div>
  );
}