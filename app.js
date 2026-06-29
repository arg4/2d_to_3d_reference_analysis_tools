import { calculateFourAngles, intersectionPoint } from "./protractor.js";
import { getRatioMetrics } from "./ratio.js";
import {
  computeUnitsPerPixel,
  formatLength,
  formatScaleText,
  lineLength,
} from "./scale.js";
import {
  drawActiveTool,
  drawCanvasBackground,
  drawHoverPoint,
  drawImageHandles,
  drawImageLayer,
  drawProtractorOverlay,
  drawScaleGrid,
  drawScaleOverlay,
} from "./draw.js";
import { bindImageImportHandlers, setBackgroundImageFromFile } from "./image-io.js";
import {
  dragRectHandle,
  dragWarpHandle,
  findHandleNear,
  getRectHandles,
  getWarpHandles,
  rectToWarpPoints,
} from "./image-transform.js";

const canvas = document.getElementById("protractorCanvas");
const canvasWrap = document.querySelector(".canvas-wrap");
const ctx = canvas.getContext("2d");

const stepText = document.getElementById("stepText");
const angleText = document.getElementById("angleText");
const lengthText = document.getElementById("lengthText");
const scaleText = document.getElementById("scaleText");

const imageInput = document.getElementById("imageInput");
const clearLinesBtn = document.getElementById("clearLinesBtn");
const clearImageBtn = document.getElementById("clearImageBtn");
const clearScaleBtn = document.getElementById("clearScaleBtn");

const toolProtractorBtn = document.getElementById("toolProtractorBtn");
const toolRatioBtn = document.getElementById("toolRatioBtn");
const toolWarpBtn = document.getElementById("toolWarpBtn");
const setScaleModeBtn = document.getElementById("setScaleModeBtn");

const scaleLengthInput = document.getElementById("scaleLengthInput");
const scaleUnitInput = document.getElementById("scaleUnitInput");
const applyScaleBtn = document.getElementById("applyScaleBtn");

const POINT_HIT_RADIUS = 12;
const IMAGE_HANDLE_RADIUS = 14;
const ANGLE_LABEL_DISTANCE = 44;

const COLORS = {
  line1: "#0077c8",
  line2: "#e2482f",
  scale: "#1f8b4d",
};

const state = {
  activeTool: "protractor",
  interactionMode: "tool",
  tools: {
    protractor: { points: [] },
    ratio: { points: [] },
  },
  scale: {
    points: [],
    knownLength: null,
    unit: "units",
    unitsPerPixel: null,
  },
  image: {
    bitmap: null,
    rect: null,
    warpPoints: null,
    useWarp: false,
    aspectRatio: 1,
  },
  hoverPoint: null,
  hoverHit: null,
  hoverImageHandle: null,
  draggingHit: null,
  draggingImageHandle: null,
  suppressNextClick: false,
};

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function clampPoint(pt) {
  return {
    x: Math.max(0, Math.min(canvas.width, pt.x)),
    y: Math.max(0, Math.min(canvas.height, pt.y)),
  };
}

function resizeCanvasToViewport() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}

function getEditablePointGroups() {
  if (state.interactionMode === "scale") {
    return [{ kind: "scale", points: state.scale.points }];
  }

  if (state.activeTool === "warp") {
    return [];
  }

  return [{ kind: state.activeTool, points: state.tools[state.activeTool].points }];
}

function findPointHit(pt) {
  const groups = getEditablePointGroups();
  for (const group of groups) {
    for (let i = 0; i < group.points.length; i += 1) {
      const dx = group.points[i].x - pt.x;
      const dy = group.points[i].y - pt.y;
      if (Math.hypot(dx, dy) <= POINT_HIT_RADIUS) {
        return { kind: group.kind, index: i };
      }
    }
  }
  return null;
}

function getImageHandles() {
  if (!state.image.bitmap || !state.image.rect) {
    return { rectHandles: [], warpHandles: [] };
  }

  const rectHandles = getRectHandles(state.image.rect);
  const warpPoints = state.image.warpPoints || rectToWarpPoints(state.image.rect);
  const warpHandles = getWarpHandles(warpPoints);
  return { rectHandles, warpHandles };
}

function getActiveImageHandleAtPoint(pt) {
  if (!state.image.bitmap || !state.image.rect) {
    return null;
  }

  const { rectHandles, warpHandles } = getImageHandles();

  if (state.activeTool === "warp") {
    return findHandleNear(warpHandles, pt, IMAGE_HANDLE_RADIUS);
  }

  return findHandleNear(rectHandles, pt, IMAGE_HANDLE_RADIUS);
}

function updateToolButtons() {
  toolProtractorBtn.classList.toggle("active", state.activeTool === "protractor");
  toolRatioBtn.classList.toggle("active", state.activeTool === "ratio");
  toolWarpBtn.classList.toggle("active", state.activeTool === "warp");
  setScaleModeBtn.classList.toggle("active", state.interactionMode === "scale");
}

function updateStepText() {
  if (state.interactionMode === "scale") {
    if (state.scale.points.length < 2) {
      stepText.textContent = "Scale mode: click 2 points to define the scale reference line.";
      return;
    }

    stepText.textContent =
      "Scale mode: enter known length, click Apply Scale, or drag scale endpoints to refine.";
    return;
  }

  if (state.activeTool === "warp") {
    stepText.textContent =
      "Image Warp: drag the 4 corner control points to skew the image perspective.";
    return;
  }

  const points = state.tools[state.activeTool].points;
  const toolLabel = state.activeTool === "protractor" ? "Protractor" : "Line Ratio";

  if (points.length < 2) {
    stepText.textContent = `${toolLabel}: click two points for line 1.`;
    return;
  }

  if (points.length < 4) {
    stepText.textContent = `${toolLabel}: click two points for line 2.`;
    return;
  }

  stepText.textContent = "Lines ready. Drag endpoints to refine measurement.";
}

function updateScaleText() {
  scaleText.textContent = formatScaleText(state.scale);
}

function updateProtractorMeasurements(points) {
  if (points.length < 4) {
    angleText.textContent = "Angles: -";
    lengthText.textContent = "Lengths: -";
    return;
  }

  const sectors = calculateFourAngles(points[0], points[1], points[2], points[3]);
  const len1 = lineLength(points[0], points[1]);
  const len2 = lineLength(points[2], points[3]);

  if (sectors) {
    angleText.textContent = `Angles: ${sectors
      .map((sector) => `${sector.degrees.toFixed(2)} deg`)
      .join(" | ")}`;
  } else {
    angleText.textContent = "Angles: -";
  }

  lengthText.textContent = `Lengths: L1 ${formatLength(len1, state.scale)} | L2 ${formatLength(len2, state.scale)}`;
}

function updateRatioMeasurements(points) {
  const metrics = getRatioMetrics(points);
  if (!metrics) {
    angleText.textContent = "Ratio: -";
    lengthText.textContent = "Lengths: -";
    return;
  }

  if (metrics.ratio === null || metrics.normalized === null) {
    angleText.textContent = "Ratio: -";
  } else {
    angleText.textContent = `Ratio L1/L2: ${metrics.ratio.toFixed(4)} | normalized: ${metrics.normalized.toFixed(4)} : 1`;
  }

  lengthText.textContent =
    `Lengths: L1 ${formatLength(metrics.len1, state.scale)} | L2 ${formatLength(metrics.len2, state.scale)}`;
}

function updateMeasurements() {
  if (state.activeTool === "warp") {
    angleText.textContent = "Warp: drag corner controls";
    lengthText.textContent = "Lengths: -";
    return;
  }

  const points = state.tools[state.activeTool].points;
  if (state.activeTool === "protractor") {
    updateProtractorMeasurements(points);
    return;
  }

  updateRatioMeasurements(points);
}

function redraw() {
  drawCanvasBackground(ctx, canvas, null, null);
  drawImageLayer(
    ctx,
    state.image.bitmap,
    state.image.rect,
    state.image.warpPoints,
    state.image.useWarp
  );

  drawScaleGrid(ctx, canvas, state.scale);

  if (state.activeTool !== "warp") {
    drawActiveTool(
      ctx,
      state.tools[state.activeTool].points,
      COLORS,
      state.scale,
      lineLength,
      formatLength
    );
  }

  if (state.activeTool === "protractor") {
    drawProtractorOverlay(
      ctx,
      state.tools.protractor.points,
      ANGLE_LABEL_DISTANCE,
      calculateFourAngles,
      intersectionPoint
    );
  }

  drawScaleOverlay(ctx, state.scale.points, COLORS, state.scale, lineLength, formatLength);

  const { rectHandles, warpHandles } = getImageHandles();
  drawImageHandles(
    ctx,
    state.image.rect,
    rectHandles,
    warpHandles,
    state.activeTool,
    state.image.useWarp
  );

  drawHoverPoint(ctx, state.hoverPoint);
  updateMeasurements();
  updateScaleText();
}

function switchTool(toolName) {
  state.activeTool = toolName;
  state.interactionMode = "tool";

  if (toolName === "warp" && state.image.rect) {
    if (!state.image.warpPoints) {
      state.image.warpPoints = rectToWarpPoints(state.image.rect);
    }
  }

  updateToolButtons();
  updateStepText();
  redraw();
}

function enterScaleMode() {
  state.interactionMode = "scale";
  updateToolButtons();
  updateStepText();
  redraw();
}

function setImageFromFile(file) {
  setBackgroundImageFromFile(file, canvas, (image, rect) => {
    state.image.bitmap = image;
    state.image.rect = rect;
    state.image.warpPoints = rectToWarpPoints(rect);
    state.image.useWarp = false;
    state.image.aspectRatio = image.width / image.height;
    redraw();
  });
}

canvas.addEventListener("click", (event) => {
  if (state.suppressNextClick) {
    state.suppressNextClick = false;
    return;
  }

  if (state.activeTool === "warp") {
    return;
  }

  const point = getCanvasPoint(event);

  if (state.interactionMode === "scale") {
    if (state.scale.points.length < 2) {
      state.scale.points.push(point);
    }
    updateStepText();
    redraw();
    return;
  }

  const activePoints = state.tools[state.activeTool].points;
  if (activePoints.length < 4) {
    activePoints.push(point);
  }

  updateStepText();
  redraw();
});

canvas.addEventListener("mousedown", (event) => {
  const point = getCanvasPoint(event);

  const imageHandle = getActiveImageHandleAtPoint(point);
  if (imageHandle) {
    state.draggingImageHandle = imageHandle;
    state.suppressNextClick = true;
    canvas.style.cursor = imageHandle.cursor || "grabbing";
    return;
  }

  const hit = findPointHit(point);
  if (hit) {
    state.draggingHit = hit;
    state.suppressNextClick = true;
    canvas.style.cursor = "grabbing";
  }
});

canvas.addEventListener("mousemove", (event) => {
  const point = getCanvasPoint(event);
  state.hoverPoint = point;

  if (state.draggingImageHandle && state.image.rect) {
    const clamped = clampPoint(point);

    if (state.draggingImageHandle.type === "warp-corner") {
      state.image.warpPoints = dragWarpHandle(
        state.image.warpPoints || rectToWarpPoints(state.image.rect),
        state.draggingImageHandle.index,
        clamped,
        canvas
      );
      state.image.useWarp = true;
      canvas.style.cursor = "grabbing";
      redraw();
      return;
    }

    state.image.rect = dragRectHandle(
      state.image.rect,
      state.draggingImageHandle.id,
      clamped,
      canvas,
      state.image.aspectRatio
    );
    state.image.warpPoints = rectToWarpPoints(state.image.rect);
    state.image.useWarp = false;
    canvas.style.cursor = "grabbing";
    redraw();
    return;
  }

  if (state.draggingHit) {
    const clamped = clampPoint(point);
    if (state.draggingHit.kind === "scale") {
      state.scale.points[state.draggingHit.index] = clamped;
    } else {
      state.tools[state.draggingHit.kind].points[state.draggingHit.index] = clamped;
    }
    canvas.style.cursor = "grabbing";
    redraw();
    return;
  }

  state.hoverImageHandle = getActiveImageHandleAtPoint(point);
  if (state.hoverImageHandle) {
    canvas.style.cursor = state.hoverImageHandle.cursor || "pointer";
  } else {
    state.hoverHit = findPointHit(point);
    canvas.style.cursor = state.hoverHit ? "grab" : "crosshair";
  }

  redraw();
});

canvas.addEventListener("mouseleave", () => {
  state.hoverPoint = null;
  state.hoverHit = null;
  state.hoverImageHandle = null;
  state.draggingHit = null;
  state.draggingImageHandle = null;
  canvas.style.cursor = "crosshair";
  redraw();
});

window.addEventListener("mouseup", () => {
  if (state.draggingHit || state.draggingImageHandle) {
    state.draggingHit = null;
    state.draggingImageHandle = null;
    if (state.hoverImageHandle) {
      canvas.style.cursor = state.hoverImageHandle.cursor || "pointer";
    } else {
      canvas.style.cursor = state.hoverHit ? "grab" : "crosshair";
    }
  }
});

bindImageImportHandlers({
  canvas,
  canvasWrap,
  imageInput,
  onImageFile: setImageFromFile,
});

toolProtractorBtn.addEventListener("click", () => switchTool("protractor"));
toolRatioBtn.addEventListener("click", () => switchTool("ratio"));
toolWarpBtn.addEventListener("click", () => switchTool("warp"));
setScaleModeBtn.addEventListener("click", enterScaleMode);

applyScaleBtn.addEventListener("click", () => {
  if (state.scale.points.length < 2) {
    stepText.textContent = "Define scale line first: click Set Scale, then place 2 scale points.";
    return;
  }

  const knownLength = Number.parseFloat(scaleLengthInput.value);
  if (!Number.isFinite(knownLength) || knownLength <= 0) {
    stepText.textContent = "Scale length must be a positive number.";
    return;
  }

  const unitsPerPixel = computeUnitsPerPixel(state.scale.points, knownLength);
  if (!unitsPerPixel) {
    stepText.textContent = "Scale line is too short. Move scale points farther apart.";
    return;
  }

  state.scale.knownLength = knownLength;
  state.scale.unit = scaleUnitInput.value.trim() || "units";
  state.scale.unitsPerPixel = unitsPerPixel;
  state.interactionMode = "tool";

  updateToolButtons();
  updateStepText();
  redraw();
});

clearLinesBtn.addEventListener("click", () => {
  if (state.activeTool !== "warp") {
    state.tools[state.activeTool].points = [];
  }
  state.hoverHit = null;
  state.draggingHit = null;
  updateStepText();
  redraw();
});

clearScaleBtn.addEventListener("click", () => {
  state.scale.points = [];
  state.scale.knownLength = null;
  state.scale.unitsPerPixel = null;
  state.scale.unit = scaleUnitInput.value.trim() || "units";
  updateStepText();
  redraw();
});

clearImageBtn.addEventListener("click", () => {
  state.image.bitmap = null;
  state.image.rect = null;
  state.image.warpPoints = null;
  state.image.useWarp = false;
  redraw();
});

window.addEventListener("resize", resizeCanvasToViewport);

resizeCanvasToViewport();
updateToolButtons();
updateStepText();
canvas.style.cursor = "crosshair";
redraw();
