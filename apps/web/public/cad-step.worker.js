let occtFactory;

try {
  importScripts("/occt-import-js.js");
  occtFactory = self.occtimportjs;

  if (typeof occtFactory !== "function") {
    throw new Error("OpenCascade runtime was not found in the Worker.");
  }

  self.postMessage({ type: "ready" });
} catch (error) {
  self.postMessage({
    type: "error",
    message:
      error instanceof Error
        ? error.message
        : "Failed to initialize the OpenCascade Worker.",
  });
}

self.onmessage = async (event) => {
  if (event.data?.type !== "load") return;

  try {
    const occtInitStartedAt = performance.now();
    const occt = await occtFactory();
    const occtInit = performance.now() - occtInitStartedAt;

    const stepImportStartedAt = performance.now();
    const result = occt.ReadStepFile(new Uint8Array(event.data.buffer), {
      linearUnit: "millimeter",
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.1,
      angularDeflection: 0.5,
    });
    const stepImport = performance.now() - stepImportStartedAt;

    if (!result.success) {
      throw new Error("OpenCascade could not successfully read this STEP file.");
    }

    const geometryProcessingStartedAt = performance.now();
    let shapes = 0;
    let vertices = 0;
    let triangles = 0;

    const collectGeometryStats = (node) => {
      shapes += 1;

      for (const meshIndex of node.meshes) {
        const meshData = result.meshes[meshIndex];

        if (!meshData) continue;

        vertices += meshData.attributes.position.array.length / 3;
        triangles += meshData.index.array.length / 3;
      }

      for (const child of node.children ?? []) {
        collectGeometryStats(child);
      }
    };

    collectGeometryStats(result.root);

    const meshes = result.meshes.map((meshData) => {
      const position = new Float32Array(meshData.attributes.position.array);
      const normal = meshData.attributes.normal
        ? new Float32Array(meshData.attributes.normal.array)
        : undefined;
      const index = new Uint32Array(meshData.index.array);

      return {
        name: meshData.name,
        color: meshData.color,
        brep_faces: meshData.brep_faces,
        attributes: {
          position: { array: position },
          ...(normal ? { normal: { array: normal } } : {}),
        },
        index: { array: index },
      };
    });

    const geometryProcessing = performance.now() - geometryProcessingStartedAt;
    const transferables = [];

    for (const meshData of meshes) {
      transferables.push(meshData.attributes.position.array.buffer);
      if (meshData.attributes.normal) {
        transferables.push(meshData.attributes.normal.array.buffer);
      }
      transferables.push(meshData.index.array.buffer);
    }

    self.postMessage(
      {
        type: "result",
        result: {
          success: true,
          root: result.root,
          meshes,
          timings: {
            occtInit,
            stepImport,
            geometryProcessing,
          },
          stats: {
            shapes,
            meshes: meshes.length,
            vertices,
            triangles,
          },
        },
      },
      transferables
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to process the STEP file in the Worker.",
    });
  }
};
