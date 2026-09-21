"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  fitCameraToObject,
  setCameraView as setCadCameraView,
} from "@/lib/cad/camera";
import { analyseGeometry } from "@/lib/cad/geometry";
import { analyseSheetMetal } from "@/lib/cad/sheet-metal";

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

type OcctMesh = {
  name: string;
  color?: [number, number, number];
  brep_faces?: Array<{ first: number; last: number }>;
  attributes: {
    position: {
      array: ArrayLike<number>;
    };
    normal?: {
      array: ArrayLike<number>;
    };
  };
  index: {
    array: ArrayLike<number>;
  };
};

type OcctNode = {
  name: string;
  meshes: number[];
  children: OcctNode[];
};

type ModelTreeNode = {
  id: string;
  name: string;
  meshes: number[];
  children: ModelTreeNode[];
};

type OcctResult = {
  success: boolean;
  root: OcctNode;
  meshes: OcctMesh[];
};

type WorkerResult = OcctResult & {
  timings: {
    occtInit: number;
    stepImport: number;
    geometryProcessing: number;
  };
  stats: {
    shapes: number;
    meshes: number;
    vertices: number;
    triangles: number;
  };
};

type StepPerformanceReport = {
  fileName: string;
  fileSize: number;
  fileRead: number;
  workerStartup: number;
  occtInit: number;
  stepImport: number;
  geometryProcessing: number;
  workerTransfer: number;
  mainThreadBlocking: number;
  maxFrameGap: number;
  responsiveFrames: number;
  threeGeometry: number;
  meshCreation: number;
  edgeCreation: number;
  sceneInsertion: number;
  cameraFitting: number;
  firstRender: number | null;
  firstFrameReady: number | null;
  total: number | null;
  memory: string;
  shapes: number;
  meshes: number;
  vertices: number;
  triangles: number;
  edges: number;
  startedAt: number;
};

type CadViewerProps = {
  file?: File | null;
};

type DisplayMode = "shaded" | "wireframe" | "hidden-lines" | "edges";

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMemoryReport(): string {
  const memory = performance.memory;

  if (!memory) {
    return "Memory measurement unavailable in this browser.";
  }

  return `Used JS heap: ${formatMegabytes(
    memory.usedJSHeapSize
  )} / ${formatMegabytes(memory.jsHeapSizeLimit)}`;
}

function updateGridForBounds(
  scene: THREE.Scene,
  gridRef: { current: THREE.GridHelper | null },
  bounds: THREE.Box3,
  visible: boolean
) {
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) return;

  const power = 10 ** Math.floor(Math.log10(largestDimension));
  const normalized = largestDimension / power;
  const intervalFactor = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  const majorInterval = intervalFactor * power;
  const gridSize = majorInterval * 2;
  const minorInterval = majorInterval / 10;
  const divisions = Math.max(10, Math.round(gridSize / minorInterval));

  if (gridRef.current) {
    scene.remove(gridRef.current);
    gridRef.current.geometry.dispose();
    const materials = Array.isArray(gridRef.current.material)
      ? gridRef.current.material
      : [gridRef.current.material];
    materials.forEach((material) => material.dispose());
  }

  const grid = new THREE.GridHelper(gridSize, divisions, 0x87939d, 0xc4c9c8);
  grid.name = "TemporaryGrid";
  grid.visible = visible;
  scene.add(grid);
  gridRef.current = grid;
}

export default function CadViewer({ file }: CadViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const performanceReportRef = useRef<StepPerformanceReport | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const normalModeRef = useRef(false);
  const boundingBoxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const modelBoundsRef = useRef<THREE.Box3 | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const gridVisibleRef = useRef(true);
  const treeRootRef = useRef<ModelTreeNode | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("shaded");
  const [boundingBoxVisible, setBoundingBoxVisible] = useState(false);
  const [normalMode, setNormalMode] = useState(false);
  const [treeSearch, setTreeSearch] = useState("");
  const [treeRoot, setTreeRoot] = useState<ModelTreeNode | null>(null);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(
    new Set(["root"])
  );
  const [measurement, setMeasurement] = useState("Select Measure to inspect the loaded model.");
  const [modelDimensions, setModelDimensions] = useState({ x: 0, y: 0, z: 0 });
  const [modelStats, setModelStats] = useState({ shapes: 0, meshes: 0, vertices: 0, triangles: 0, edges: 0 });
  const [panMode, setPanMode] = useState(false);
  const setPan = (enabled: boolean) => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    setPanMode(enabled);
  };
  const setDisplay = (mode: DisplayMode) => {
    const model = modelRef.current;
    if (!model) return;

    setDisplayMode(mode);
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.visible = mode !== "edges";
        object.material.wireframe = mode === "wireframe" || mode === "hidden-lines";
        object.material.depthWrite = mode !== "hidden-lines";
      }
      if (object instanceof THREE.LineSegments) {
        object.visible = mode === "edges" || mode === "hidden-lines";
      }
    });
  };
  const toggleGrid = () => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.visible = !grid.visible;
    gridVisibleRef.current = grid.visible;
    setGridVisible(grid.visible);
  };
  const toggleBoundingBox = () => {
    const scene = sceneRef.current;
    const model = modelRef.current;
    if (!scene || !model) return;

    if (boundingBoxHelperRef.current) {
      scene.remove(boundingBoxHelperRef.current);
      boundingBoxHelperRef.current = null;
      setBoundingBoxVisible(false);
      return;
    }

    const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(model), 0x2468c9);
    helper.name = "CadBoundingBox";
    scene.add(helper);
    boundingBoxHelperRef.current = helper;
    setBoundingBoxVisible(true);
  };
  const measureModel = () => {
    const model = modelRef.current;
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    setMeasurement(`Overall size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} mm`);
  };
  const toggleNormalMode = () => {
    const next = !normalModeRef.current;
    normalModeRef.current = next;
    setNormalMode(next);
    setMeasurement(next ? "Select a face in the viewport to orient normal to surface." : "Normal selection cancelled.");
  };
  const toggleTreeNode = (name: string, visible: boolean) => {
    modelRef.current?.traverse((object) => {
      const treeNodeId = object.userData.treeNodeId as string | undefined;
      if (treeNodeId === name || treeNodeId?.startsWith(`${name}/`)) {
        object.visible = visible;
      }
    });
  };
  const toggleTreeExpanded = (id: string) => {
    setExpandedTreeNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
  modelBoundsRef.current = null;

    if (boundingBoxHelperRef.current) {
      scene.remove(boundingBoxHelperRef.current);
      boundingBoxHelperRef.current = null;
    }

  setStatus("Ready");
  setError(null);
    setTreeRoot(null);
    setExpandedTreeNodes(new Set(["root"]));
    setModelDimensions({ x: 0, y: 0, z: 0 });
    setModelStats({ shapes: 0, meshes: 0, vertices: 0, triangles: 0, edges: 0 });
    setBoundingBoxVisible(false);
    setMeasurement("Select Measure to inspect the loaded model.");
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

  const takeScreenshot = () => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "cad-toolbox-view.png";
    link.click();
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
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;

    controlsRef.current = controls;

    // Lighting

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Temporary grid

    const grid = new THREE.GridHelper(10, 10, 0x87939d, 0xc4c9c8);
    grid.name = "TemporaryGrid";
    scene.add(grid);
    gridRef.current = grid;

    // Temporary axes

    const axes = new THREE.AxesHelper(3);
    axes.name = "TemporaryAxes";
    scene.add(axes);

    const handleSurfaceSelection = (event: PointerEvent) => {
      if (!normalModeRef.current || !modelRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycasterRef.current.setFromCamera(pointer, camera);
      const hits = raycasterRef.current.intersectObjects(modelRef.current.children, true);
      const hit = hits.find((intersection) => intersection.object instanceof THREE.Mesh);
      if (!hit || !hit.face) return;

      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      setCadCameraView(camera, controls, modelRef.current, normal);
      normalModeRef.current = false;
      setNormalMode(false);
      setMeasurement(`Surface normal: ${normal.x.toFixed(3)}, ${normal.y.toFixed(3)}, ${normal.z.toFixed(3)}`);
    };

    renderer.domElement.addEventListener("pointerdown", handleSurfaceSelection);

    // Animation

    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      controls.update();
      renderer.render(scene, camera);

      const report = performanceReportRef.current;
      if (report && report.firstRender === null && modelRef.current) {
        report.firstRender = performance.now() - report.startedAt;

        requestAnimationFrame(() => {
          if (performanceReportRef.current !== report) return;

          report.firstFrameReady = performance.now() - report.startedAt;
          report.total = report.firstFrameReady;
          report.memory = getMemoryReport();
          const firstRender = report.firstRender;
          const firstFrameReady = report.firstFrameReady;
          const total = report.total;

          if (
            firstRender === null ||
            firstFrameReady === null ||
            total === null
          ) {
            return;
          }

          console.info(
            `CAD TOOLBOX PERFORMANCE\n=======================\n\nFile: ${report.fileName}\nFile size: ${formatMegabytes(report.fileSize)}\n\nTiming (worker stages are nested within worker processing):\nMain-thread file read:  ${report.fileRead.toFixed(2)} ms\nWorker startup:         ${report.workerStartup.toFixed(2)} ms\nOCCT initialization:    ${report.occtInit.toFixed(2)} ms\nSTEP import:            ${report.stepImport.toFixed(2)} ms\nWorker geometry:        ${report.geometryProcessing.toFixed(2)} ms\nWorker -> main transfer: ${report.workerTransfer.toFixed(2)} ms\nThree.js geometry:      ${report.threeGeometry.toFixed(2)} ms\nMesh creation:          ${report.meshCreation.toFixed(2)} ms\nEdge creation:          ${report.edgeCreation.toFixed(2)} ms\nScene insertion:        ${report.sceneInsertion.toFixed(2)} ms\nCamera fitting:         ${report.cameraFitting.toFixed(2)} ms\nFirst render:           ${firstRender.toFixed(2)} ms\nReady (first rAF):      ${firstFrameReady.toFixed(2)} ms\nTotal:                  ${total.toFixed(2)} ms\nMain-thread blocking:   ${report.mainThreadBlocking.toFixed(2)} ms\nMax frame gap:          ${report.maxFrameGap.toFixed(2)} ms\nResponsive frames:     ${report.responsiveFrames}\n\nGeometry:\nShapes:                 ${report.shapes}\nMeshes:                 ${report.meshes}\nVertices:               ${report.vertices}\nTriangles:              ${report.triangles}\nEdges:                  ${report.edges}\n\nMemory:\n${report.memory}`
          );
        });
      }
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
      if (gridRef.current) {
        gridRef.current.geometry.dispose();
        const materials = Array.isArray(gridRef.current.material)
          ? gridRef.current.material
          : [gridRef.current.material];
        materials.forEach((material) => material.dispose());
        gridRef.current = null;
      }
      renderer.domElement.removeEventListener("pointerdown", handleSurfaceSelection);
      rendererRef.current = null;

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

    const fileName = file.name;
    let cancelled = false;
    let worker: Worker | null = null;

    const loadStepFile = async () => {
      const startedAt = performance.now();

      try {
        setStatus("Loading OpenCascade...");
        setError(null);

        const workerStartupStartedAt = performance.now();
        worker = new Worker("/cad-step.worker.js");

        await new Promise<void>((resolve, reject) => {
          if (!worker) {
            reject(new Error("Failed to create the CAD Worker."));
            return;
          }

          worker.onmessage = (event: MessageEvent) => {
            if (event.data?.type === "ready") {
              resolve();
            } else if (event.data?.type === "error") {
              reject(new Error(event.data.message));
            }
          };
          worker.onerror = () =>
            reject(new Error("The CAD Worker could not be started."));
        });

        const workerStartup = performance.now() - workerStartupStartedAt;

        if (cancelled) return;

        const fileReadStartedAt = performance.now();
        const buffer = await file.arrayBuffer();
        const fileRead = performance.now() - fileReadStartedAt;

        setStatus("Converting CAD geometry...");

        let responsiveFrames = 0;
        let maxFrameGap = 0;
        let previousFrameAt: number | null = null;
        let responsivenessActive = true;

        const recordFrame = (frameAt: number) => {
          if (!responsivenessActive) return;

          responsiveFrames += 1;
          if (previousFrameAt !== null) {
            maxFrameGap = Math.max(maxFrameGap, frameAt - previousFrameAt);
          }
          previousFrameAt = frameAt;
          requestAnimationFrame(recordFrame);
        };

        requestAnimationFrame(recordFrame);

        const workerRequestSentAt = performance.now();
        const result = await new Promise<WorkerResult>((resolve, reject) => {
          if (!worker) {
            reject(new Error("The CAD Worker is unavailable."));
            return;
          }

          worker.onmessage = (event: MessageEvent) => {
            if (event.data?.type === "result") {
              resolve(event.data.result as WorkerResult);
            } else if (event.data?.type === "error") {
              reject(new Error(event.data.message));
            }
          };
          worker.onerror = () =>
            reject(new Error("The CAD Worker failed while loading the STEP file."));
          worker.postMessage({ type: "load", buffer }, [buffer]);
        });
        const workerResponseReceivedAt = performance.now();
        responsivenessActive = false;

        const workerProcessing =
          result.timings.occtInit +
          result.timings.stepImport +
          result.timings.geometryProcessing;
        const workerTransfer = Math.max(
          0,
          workerResponseReceivedAt - workerRequestSentAt - workerProcessing
        );
        const mainThreadBlocking = Math.max(0, maxFrameGap - 16.67);
        worker.terminate();
        worker = null;

        if (cancelled) return;

        const geometryAnalysis = analyseGeometry(result.root, result.meshes);
        const sheetMetalAnalysis = analyseSheetMetal(geometryAnalysis);
        console.info("CAD Toolbox geometry analysis", {
          solidCount: geometryAnalysis.solidCount,
          faceCount: geometryAnalysis.faces.length,
          bounds: geometryAnalysis.bounds,
          sheetMetal: sheetMetalAnalysis,
        });

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

        // Create CAD model

        const model = new THREE.Group();
        model.name = file.name;
        const createTreeNode = (node: OcctNode, id: string): ModelTreeNode => ({
          id,
          name: node.name,
          meshes: node.meshes,
          children: (node.children ?? []).map((child, index) =>
            createTreeNode(child, `${id}/${index}`)
          ),
        });
        const nextTreeRoot = createTreeNode(result.root, "root");
        treeRootRef.current = nextTreeRoot;
        setTreeRoot(nextTreeRoot);
        setExpandedTreeNodes(new Set(["root"]));
        let threeGeometry = 0;
        let meshCreation = 0;
        let edgeCreation = 0;
        let edgeCount = 0;

        const addNode = (node: OcctNode, nodeId = "root") => {
          for (const meshIndex of node.meshes) {
            const meshData = result.meshes[meshIndex];

            if (!meshData) continue;

            const threeGeometryStartedAt = performance.now();
            const geometry = new THREE.BufferGeometry();

            const positions =
              meshData.attributes.position.array instanceof Float32Array
                ? meshData.attributes.position.array
                : new Float32Array(meshData.attributes.position.array);

            geometry.setAttribute(
              "position",
              new THREE.BufferAttribute(positions, 3)
            );

            if (meshData.attributes.normal) {
              const normals =
                meshData.attributes.normal.array instanceof Float32Array
                  ? meshData.attributes.normal.array
                  : new Float32Array(meshData.attributes.normal.array);

              geometry.setAttribute(
                "normal",
                new THREE.BufferAttribute(normals, 3)
              );
            } else {
              geometry.computeVertexNormals();
            }

            const indices =
              meshData.index.array instanceof Uint32Array
                ? meshData.index.array
                : new Uint32Array(meshData.index.array);

            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            geometry.computeBoundingSphere();
            threeGeometry += performance.now() - threeGeometryStartedAt;

            const color = meshData.color ?? [0.72, 0.75, 0.78];

            const meshCreationStartedAt = performance.now();
            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color[0], color[1], color[2]),
              metalness: 0.05,
              roughness: 0.65,
              side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);

            mesh.name = meshData.name;
            mesh.userData.treeNodeId = nodeId;

            model.add(mesh);
            meshCreation += performance.now() - meshCreationStartedAt;

            // CAD-style edges

            const edgeCreationStartedAt = performance.now();
            const edgesGeometry = new THREE.EdgesGeometry(
              geometry,
              30
            );

            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x333333,
              transparent: true,
              opacity: 0.65,
            });

            const edgeLines = new THREE.LineSegments(
              edgesGeometry,
              edgesMaterial
            );

            edgeLines.name = `${meshData.name}-edges`;
            edgeLines.userData.treeNodeId = nodeId;

            model.add(edgeLines);
            edgeCreation += performance.now() - edgeCreationStartedAt;
            edgeCount += edgesGeometry.getAttribute("position").count / 2;
          }

          for (const [index, child] of (node.children ?? []).entries()) {
            addNode(child, `${nodeId}/${index}`);
          }
        };

        addNode(result.root);

        const sceneInsertionStartedAt = performance.now();
        scene.add(model);
        const sceneInsertion = performance.now() - sceneInsertionStartedAt;
        modelRef.current = model;

        const cameraFittingStartedAt = performance.now();

        performanceReportRef.current = {
          fileName,
          fileSize: file.size,
          fileRead,
          workerStartup,
          occtInit: result.timings.occtInit,
          stepImport: result.timings.stepImport,
          geometryProcessing: result.timings.geometryProcessing,
          workerTransfer,
          mainThreadBlocking,
          maxFrameGap,
          responsiveFrames,
          threeGeometry,
          meshCreation,
          edgeCreation,
          sceneInsertion,
          cameraFitting: 0,
          firstRender: null,
          firstFrameReady: null,
          total: null,
          memory: "Memory measurement unavailable in this browser.",
          shapes: result.stats.shapes,
          meshes: result.stats.meshes,
          vertices: result.stats.vertices,
          triangles: result.stats.triangles,
          edges: edgeCount,
          startedAt,
        };

        // --------------------------------------------------------
        // FIT MODEL TO VIEW
        // --------------------------------------------------------

        const boundingBox = new THREE.Box3().setFromObject(model);

        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        setModelDimensions({ x: size.x, y: size.y, z: size.z });
        setModelStats({
          shapes: result.stats.shapes,
          meshes: result.stats.meshes,
          vertices: result.stats.vertices,
          triangles: result.stats.triangles,
          edges: edgeCount,
        });

        const maxDimension = Math.max(
          size.x,
          size.y,
          size.z
        );

        model.position.sub(center);
        const worldBounds = new THREE.Box3().setFromObject(model);
        modelBoundsRef.current = worldBounds;
        updateGridForBounds(scene, gridRef, worldBounds, gridVisibleRef.current);

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

        const report = performanceReportRef.current;
        if (report) {
          report.cameraFitting = performance.now() - cameraFittingStartedAt;
        }

        setStatus(
          `Loaded ${file.name} • ${result.meshes.length} mesh${
            result.meshes.length === 1 ? "" : "es"
          }`
        );
      } catch (err) {
        console.error(err);

        worker?.terminate();
        worker = null;

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
      worker?.terminate();
    };
  }, [file]);

  const renderTreeNode = (node: ModelTreeNode, depth = 0): ReactNode => {
    const query = treeSearch.trim().toLowerCase();
    const visibleChildren = node.children.filter((child) => {
      return child.name.toLowerCase().includes(query) || child.children.some((descendant) => descendant.name.toLowerCase().includes(query));
    });
    const matches = !query || node.name.toLowerCase().includes(query);

    if (!matches && visibleChildren.length === 0) {
      return <></>;
    }

    return (
      <div className="cad-tree-node" key={node.id}>
        <label className="cad-tree-row" style={{ paddingLeft: `${12 + depth * 14}px` }}>
          <input
            type="checkbox"
            defaultChecked
            aria-label={node.name || "Unnamed part"}
            onChange={(event) => toggleTreeNode(node.id, event.target.checked)}
          />
          <button className="cad-tree-chevron" type="button" aria-label={`${expandedTreeNodes.has(node.id) ? "Collapse" : "Expand"} ${node.name || "part"}`} onClick={() => toggleTreeExpanded(node.id)}>{node.children.length ? (expandedTreeNodes.has(node.id) ? "⌄" : "›") : "·"}</button>
          <span className="cad-tree-part-icon" aria-hidden="true">◇</span>
          <span>{node.name || "Unnamed part"}</span>
        </label>
        {expandedTreeNodes.has(node.id) && node.children.filter((child) => !query || child.name.toLowerCase().includes(query) || child.children.length > 0).map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="cad-workbench">
      <aside className={`cad-side-panel cad-info-panel ${leftPanelCollapsed ? "is-collapsed" : ""}`}>
        <button className="cad-panel-collapse" type="button" onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)} aria-label="Toggle information panel" title="Toggle information panel">{leftPanelCollapsed ? "›" : "‹"}</button>
        {!leftPanelCollapsed && <div className="cad-panel-content">
          <div className="cad-panel-heading"><span className="cad-panel-kicker">INSPECT</span><h2>Model data</h2></div>
          <section className="cad-data-section"><h3>File Info</h3><dl><div><dt>Name</dt><dd>{file?.name || "No file loaded"}</dd></div><div><dt>Status</dt><dd>{status}</dd></div><div><dt>Units</dt><dd>Millimetres</dd></div></dl></section>
          <section className="cad-data-section"><h3>Measurement</h3><p className="cad-measurement-result">{measurement}</p></section>
          <section className="cad-data-section"><h3>Bounding Box</h3><dl className="cad-dimension-list"><div><dt>X</dt><dd>{modelDimensions.x.toFixed(2)} mm</dd></div><div><dt>Y</dt><dd>{modelDimensions.y.toFixed(2)} mm</dd></div><div><dt>Z</dt><dd>{modelDimensions.z.toFixed(2)} mm</dd></div></dl></section>
          <section className="cad-data-section"><h3>Model Statistics</h3><dl><div><dt>Shapes</dt><dd>{modelStats.shapes}</dd></div><div><dt>Meshes</dt><dd>{modelStats.meshes}</dd></div><div><dt>Vertices</dt><dd>{modelStats.vertices.toLocaleString()}</dd></div><div><dt>Triangles</dt><dd>{modelStats.triangles.toLocaleString()}</dd></div><div><dt>Edges</dt><dd>{modelStats.edges.toLocaleString()}</dd></div></dl></section>
        </div>}
      </aside>

      <section className="cad-viewport-shell">
        <div className="cad-viewport-tools"><button className={`cad-viewport-toggle ${gridVisible ? "is-active" : ""}`} type="button" onClick={toggleGrid} title="Toggle grid"><span aria-hidden="true">▦</span> Grid</button><span className="cad-status-line">{normalMode ? "Select a face" : status}</span></div>
        <div ref={containerRef} className="cad-viewport-canvas" />
        {error && <div className="cad-error-banner">{error}</div>}
      </section>

      <aside className={`cad-side-panel cad-tree-panel ${treePanelCollapsed ? "is-collapsed" : ""}`}>
        <button className="cad-panel-collapse" type="button" onClick={() => setTreePanelCollapsed(!treePanelCollapsed)} aria-label="Toggle model tree" title="Toggle model tree">{treePanelCollapsed ? "‹" : "›"}</button>
        {!treePanelCollapsed && <div className="cad-panel-content"><div className="cad-panel-heading"><span className="cad-panel-kicker">STRUCTURE</span><h2>Model tree</h2></div><label className="cad-tree-search"><span aria-hidden="true">⌕</span><input value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} placeholder="Search parts and features" /></label><div className="cad-tree-list">{treeRoot ? renderTreeNode(treeRoot) : <p className="cad-empty-state">Load a STEP file to inspect its structure.</p>}</div></div>}
      </aside>

      <div className="cad-bottom-toolbar">
        <div className="cad-tool-group"><span className="cad-tool-group-label">Views</span><button className="cad-tool-button" type="button" onClick={setFrontView} title="Front"><span aria-hidden="true">↑</span><small>Front</small></button><button className="cad-tool-button" type="button" onClick={setBackView} title="Back"><span aria-hidden="true">↓</span><small>Back</small></button><button className="cad-tool-button" type="button" onClick={setLeftView} title="Left"><span aria-hidden="true">←</span><small>Left</small></button><button className="cad-tool-button" type="button" onClick={setRightView} title="Right"><span aria-hidden="true">→</span><small>Right</small></button><button className="cad-tool-button" type="button" onClick={setTopView} title="Top"><span aria-hidden="true">⊤</span><small>Top</small></button><button className="cad-tool-button" type="button" onClick={setBottomView} title="Bottom"><span aria-hidden="true">⊥</span><small>Bottom</small></button><button className="cad-tool-button" type="button" onClick={setIsometricView} title="Isometric"><span aria-hidden="true">◇</span><small>ISO</small></button><button className={`cad-tool-button ${panMode ? "is-active" : ""}`} type="button" onClick={() => setPan(!panMode)} title="Pan"><span aria-hidden="true">✥</span><small>Pan</small></button></div>
        <div className="cad-tool-group"><span className="cad-tool-group-label">Display</span><button className={`cad-tool-button ${displayMode === "shaded" ? "is-active" : ""}`} type="button" onClick={() => setDisplay("shaded")} title="Shaded"><span aria-hidden="true">●</span><small>Shaded</small></button><button className={`cad-tool-button ${displayMode === "wireframe" ? "is-active" : ""}`} type="button" onClick={() => setDisplay("wireframe")} title="Wireframe"><span aria-hidden="true">⌗</span><small>Wireframe</small></button><button className={`cad-tool-button ${displayMode === "hidden-lines" ? "is-active" : ""}`} type="button" onClick={() => setDisplay("hidden-lines")} title="Hidden Lines"><span aria-hidden="true">⊞</span><small>Hidden Lines</small></button><button className={`cad-tool-button ${displayMode === "edges" ? "is-active" : ""}`} type="button" onClick={() => setDisplay("edges")} title="Edges"><span aria-hidden="true">⌁</span><small>Edges</small></button></div>
        <div className="cad-tool-group cad-tool-group-actions"><span className="cad-tool-group-label">Inspect</span><button className={`cad-tool-button ${boundingBoxVisible ? "is-active" : ""}`} type="button" onClick={toggleBoundingBox} title="Bounding box"><span aria-hidden="true">□</span><small>Box</small></button><button className="cad-tool-button" type="button" onClick={measureModel} title="Measure"><span aria-hidden="true">↔</span><small>Measure</small></button><button className={`cad-tool-button ${normalMode ? "is-active" : ""}`} type="button" onClick={toggleNormalMode} title="Normal to surface"><span aria-hidden="true">◉</span><small>Normal</small></button><button className="cad-tool-button" type="button" onClick={takeScreenshot} title="Screenshot"><span aria-hidden="true">▣</span><small>Shot</small></button><button className="cad-tool-button" type="button" onClick={resetView} title="Fit model"><span aria-hidden="true">⛶</span><small>Fit</small></button><button className="cad-tool-button" type="button" onClick={clearModel} title="Clear model"><span aria-hidden="true">×</span><small>Clear</small></button></div>
      </div>
    </div>
  );
}