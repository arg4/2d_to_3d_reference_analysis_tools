export function lineLength(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function formatLength(pxLength, scaleState) {
  if (!Number.isFinite(pxLength)) {
    return "-";
  }

  if (scaleState.unitsPerPixel) {
    const scaled = pxLength * scaleState.unitsPerPixel;
    return `${scaled.toFixed(2)} ${scaleState.unit} (${pxLength.toFixed(2)} px)`;
  }

  return `${pxLength.toFixed(2)} px`;
}

export function formatScaleText(scaleState) {
  if (!scaleState.unitsPerPixel) {
    return "Scale: none (optional)";
  }

  const pxPerUnit = 1 / scaleState.unitsPerPixel;
  return `Scale: 1 px = ${scaleState.unitsPerPixel.toFixed(5)} ${scaleState.unit} | 1 ${scaleState.unit} = ${pxPerUnit.toFixed(2)} px`;
}

export function computeUnitsPerPixel(scalePoints, knownLength) {
  if (scalePoints.length < 2) {
    return null;
  }

  const pixelLength = lineLength(scalePoints[0], scalePoints[1]);
  if (pixelLength < 1e-8) {
    return null;
  }

  return knownLength / pixelLength;
}
