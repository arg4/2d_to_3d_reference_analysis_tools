export function createInitialImageRect(canvas, image) {
  const fitScale = Math.min((canvas.width * 0.8) / image.width, (canvas.height * 0.8) / image.height, 1);
  const width = image.width * fitScale;
  const height = image.height * fitScale;

  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
  };
}

export function rectToWarpPoints(rect) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

export function getRectHandles(rect) {
  if (!rect) {
    return [];
  }

  const x1 = rect.x;
  const y1 = rect.y;
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return [
    { id: "nw", type: "corner", x: x1, y: y1, cursor: "nwse-resize" },
    { id: "ne", type: "corner", x: x2, y: y1, cursor: "nesw-resize" },
    { id: "se", type: "corner", x: x2, y: y2, cursor: "nwse-resize" },
    { id: "sw", type: "corner", x: x1, y: y2, cursor: "nesw-resize" },
    { id: "n", type: "side", x: cx, y: y1, cursor: "ns-resize" },
    { id: "e", type: "side", x: x2, y: cy, cursor: "ew-resize" },
    { id: "s", type: "side", x: cx, y: y2, cursor: "ns-resize" },
    { id: "w", type: "side", x: x1, y: cy, cursor: "ew-resize" },
  ];
}

export function getWarpHandles(warpPoints) {
  return warpPoints.map((pt, index) => ({
    id: `warp-${index}`,
    type: "warp-corner",
    x: pt.x,
    y: pt.y,
    index,
    cursor: "move",
  }));
}

export function findHandleNear(handles, point, radius) {
  for (const handle of handles) {
    const dx = handle.x - point.x;
    const dy = handle.y - point.y;
    if (Math.hypot(dx, dy) <= radius) {
      return handle;
    }
  }
  return null;
}

function clampRect(rect, canvas) {
  return {
    x: Math.max(-rect.width + 20, Math.min(canvas.width - 20, rect.x)),
    y: Math.max(-rect.height + 20, Math.min(canvas.height - 20, rect.y)),
    width: Math.max(20, rect.width),
    height: Math.max(20, rect.height),
  };
}

export function dragRectHandle(rect, handleId, point, canvas, imageAspect) {
  const x1 = rect.x;
  const y1 = rect.y;
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;

  if (handleId === "e") {
    return clampRect({ x: x1, y: y1, width: Math.max(20, point.x - x1), height: rect.height }, canvas);
  }
  if (handleId === "w") {
    const newX = Math.min(point.x, x2 - 20);
    return clampRect({ x: newX, y: y1, width: x2 - newX, height: rect.height }, canvas);
  }
  if (handleId === "s") {
    return clampRect({ x: x1, y: y1, width: rect.width, height: Math.max(20, point.y - y1) }, canvas);
  }
  if (handleId === "n") {
    const newY = Math.min(point.y, y2 - 20);
    return clampRect({ x: x1, y: newY, width: rect.width, height: y2 - newY }, canvas);
  }

  const cornerAnchors = {
    nw: { ax: x2, ay: y2, sx: -1, sy: -1 },
    ne: { ax: x1, ay: y2, sx: 1, sy: -1 },
    se: { ax: x1, ay: y1, sx: 1, sy: 1 },
    sw: { ax: x2, ay: y1, sx: -1, sy: 1 },
  };

  const anchor = cornerAnchors[handleId];
  if (!anchor) {
    return rect;
  }

  const dxAbs = Math.abs(point.x - anchor.ax);
  const dyAbs = Math.abs(point.y - anchor.ay);

  let width = Math.max(20, dxAbs);
  let height = Math.max(20, dyAbs);

  if (width / height > imageAspect) {
    height = width / imageAspect;
  } else {
    width = height * imageAspect;
  }

  const cornerX = anchor.ax + anchor.sx * width;
  const cornerY = anchor.ay + anchor.sy * height;

  const newX = Math.min(anchor.ax, cornerX);
  const newY = Math.min(anchor.ay, cornerY);
  const newW = Math.abs(cornerX - anchor.ax);
  const newH = Math.abs(cornerY - anchor.ay);

  return clampRect({ x: newX, y: newY, width: newW, height: newH }, canvas);
}

export function dragWarpHandle(warpPoints, index, point, canvas) {
  const next = warpPoints.map((pt) => ({ x: pt.x, y: pt.y }));
  next[index] = {
    x: Math.max(0, Math.min(canvas.width, point.x)),
    y: Math.max(0, Math.min(canvas.height, point.y)),
  };
  return next;
}
