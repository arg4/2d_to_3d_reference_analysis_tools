function drawPoint(ctx, point, color, radius = 5) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLine(ctx, a, b, color, dashed = false, lineWidth = 3) {
  ctx.beginPath();
  ctx.setLineDash(dashed ? [8, 6] : []);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTextPill(ctx, x, y, text) {
  ctx.font = "600 13px Trebuchet MS, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + 12;
  const boxHeight = 22;

  ctx.fillStyle = "rgba(255, 250, 241, 0.95)";
  ctx.strokeStyle = "rgba(42, 37, 32, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2a2520";
  ctx.fillText(text, x, y + 1);
}

function drawSegmentLengthLabel(ctx, a, b, scaleState, lineLength, formatLength) {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  drawTextPill(ctx, midX, midY - 14, formatLength(lineLength(a, b), scaleState));
}

export function drawCanvasBackground(ctx, canvas, bgImage, bgRect) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!bgImage || !bgRect) {
    return;
  }

  ctx.drawImage(bgImage, bgRect.x, bgRect.y, bgRect.width, bgRect.height);
}

function getGridStepUnits(unitsPerPixel) {
  const minPx = 28;
  const maxPx = 120;
  const baseSteps = [1, 2, 5];

  let factor = 1;
  let bestUnits = 1;
  let bestDist = Infinity;

  for (let i = -6; i <= 6; i += 1) {
    factor = 10 ** i;
    for (const step of baseSteps) {
      const units = step * factor;
      const px = units / unitsPerPixel;
      if (px < minPx || px > maxPx) {
        continue;
      }
      const dist = Math.abs(px - 56);
      if (dist < bestDist) {
        bestDist = dist;
        bestUnits = units;
      }
    }
  }

  return bestUnits;
}

export function drawScaleGrid(ctx, canvas, scaleState) {
  if (!scaleState.unitsPerPixel) {
    return;
  }

  const stepUnits = getGridStepUnits(scaleState.unitsPerPixel);
  const minorStepPx = stepUnits / scaleState.unitsPerPixel;
  const majorEvery = 5;
  const majorStepPx = minorStepPx * majorEvery;

  ctx.save();
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += minorStepPx) {
    ctx.strokeStyle = "rgba(15, 109, 106, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += minorStepPx) {
    ctx.strokeStyle = "rgba(15, 109, 106, 0.08)";
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }

  for (let x = 0; x <= canvas.width; x += majorStepPx) {
    ctx.strokeStyle = "rgba(15, 109, 106, 0.18)";
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += majorStepPx) {
    ctx.strokeStyle = "rgba(15, 109, 106, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawImageTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-8) {
    return;
  }

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    denom;
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    denom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export function drawImageLayer(ctx, image, imageRect, warpPoints, useWarp) {
  if (!image || !imageRect) {
    return;
  }

  if (!useWarp || !warpPoints || warpPoints.length !== 4) {
    ctx.drawImage(image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
    return;
  }

  const src = [
    { x: 0, y: 0 },
    { x: image.width, y: 0 },
    { x: image.width, y: image.height },
    { x: 0, y: image.height },
  ];

  drawImageTriangle(ctx, image, src[0], src[1], src[2], warpPoints[0], warpPoints[1], warpPoints[2]);
  drawImageTriangle(ctx, image, src[0], src[2], src[3], warpPoints[0], warpPoints[2], warpPoints[3]);
}

export function drawImageHandles(ctx, imageRect, rectHandles, warpHandles, activeTool, useWarp) {
  if (!imageRect) {
    return;
  }

  if (activeTool === "warp") {
    if (warpHandles.length < 4) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(warpHandles[0].x, warpHandles[0].y);
    for (let i = 1; i < warpHandles.length; i += 1) {
      ctx.lineTo(warpHandles[i].x, warpHandles[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(219, 95, 47, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const handle of warpHandles) {
      drawPoint(ctx, handle, "#db5f2f", 6);
    }
    return;
  }

  drawLine(
    ctx,
    { x: imageRect.x, y: imageRect.y },
    { x: imageRect.x + imageRect.width, y: imageRect.y },
    "rgba(15, 109, 106, 0.9)",
    false,
    2
  );
  drawLine(
    ctx,
    { x: imageRect.x + imageRect.width, y: imageRect.y },
    { x: imageRect.x + imageRect.width, y: imageRect.y + imageRect.height },
    "rgba(15, 109, 106, 0.9)",
    false,
    2
  );
  drawLine(
    ctx,
    { x: imageRect.x + imageRect.width, y: imageRect.y + imageRect.height },
    { x: imageRect.x, y: imageRect.y + imageRect.height },
    "rgba(15, 109, 106, 0.9)",
    false,
    2
  );
  drawLine(
    ctx,
    { x: imageRect.x, y: imageRect.y + imageRect.height },
    { x: imageRect.x, y: imageRect.y },
    "rgba(15, 109, 106, 0.9)",
    false,
    2
  );

  for (const handle of rectHandles) {
    const color = handle.type === "corner" ? "#0f6d6a" : "#1f8b4d";
    drawPoint(ctx, handle, color, 6);
  }
}

export function drawActiveTool(ctx, points, colors, scaleState, lineLength, formatLength) {
  if (points.length >= 2) {
    drawLine(ctx, points[0], points[1], colors.line1);
    drawPoint(ctx, points[0], colors.line1);
    drawPoint(ctx, points[1], colors.line1);
    drawSegmentLengthLabel(ctx, points[0], points[1], scaleState, lineLength, formatLength);
  }

  if (points.length >= 4) {
    drawLine(ctx, points[2], points[3], colors.line2);
    drawPoint(ctx, points[2], colors.line2);
    drawPoint(ctx, points[3], colors.line2);
    drawSegmentLengthLabel(ctx, points[2], points[3], scaleState, lineLength, formatLength);
  }
}

export function drawScaleOverlay(ctx, scalePoints, colors, scaleState, lineLength, formatLength) {
  if (scalePoints.length >= 1) {
    drawPoint(ctx, scalePoints[0], colors.scale);
  }

  if (scalePoints.length >= 2) {
    drawLine(ctx, scalePoints[0], scalePoints[1], colors.scale, true);
    drawPoint(ctx, scalePoints[1], colors.scale);
    drawSegmentLengthLabel(ctx, scalePoints[0], scalePoints[1], scaleState, lineLength, formatLength);

    const midX = (scalePoints[0].x + scalePoints[1].x) / 2;
    const midY = (scalePoints[0].y + scalePoints[1].y) / 2;
    drawTextPill(ctx, midX, midY + 18, "Scale Ref");
  }
}

export function drawProtractorOverlay(
  ctx,
  points,
  angleLabelDistance,
  calculateFourAngles,
  intersectionPoint
) {
  if (points.length < 4) {
    return;
  }

  const intersect = intersectionPoint(points[0], points[1], points[2], points[3]);
  const sectors = calculateFourAngles(points[0], points[1], points[2], points[3]);

  if (intersect) {
    ctx.beginPath();
    ctx.arc(intersect.x, intersect.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 109, 106, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (!intersect || !sectors) {
    return;
  }

  for (const sector of sectors) {
    const labelX = intersect.x + Math.cos(sector.midAngle) * angleLabelDistance;
    const labelY = intersect.y + Math.sin(sector.midAngle) * angleLabelDistance;
    drawTextPill(ctx, labelX, labelY, `${sector.degrees.toFixed(2)} deg`);
  }
}

export function drawHoverPoint(ctx, point) {
  if (!point) {
    return;
  }

  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(42, 37, 32, 0.65)";
  ctx.fill();
}
