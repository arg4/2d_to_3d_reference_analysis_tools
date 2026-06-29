export function intersectionPoint(a, b, c, d) {
  const x1 = a.x;
  const y1 = a.y;
  const x2 = b.x;
  const y2 = b.y;
  const x3 = c.x;
  const y3 = c.y;
  const x4 = d.x;
  const y4 = d.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) -
      (x1 - x2) * (x3 * y4 - y3 * x4)) /
    denom;
  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) -
      (y1 - y2) * (x3 * y4 - y3 * x4)) /
    denom;

  return { x: px, y: py };
}

function normalizeVector(vec) {
  const magnitude = Math.hypot(vec.x, vec.y);
  if (magnitude < 1e-8) {
    return null;
  }
  return {
    x: vec.x / magnitude,
    y: vec.y / magnitude,
  };
}

export function calculateFourAngles(a, b, c, d) {
  const dir1 = normalizeVector({ x: b.x - a.x, y: b.y - a.y });
  const dir2 = normalizeVector({ x: d.x - c.x, y: d.y - c.y });

  if (!dir1 || !dir2) {
    return null;
  }

  const rays = [
    { angle: Math.atan2(dir1.y, dir1.x) },
    { angle: Math.atan2(-dir1.y, -dir1.x) },
    { angle: Math.atan2(dir2.y, dir2.x) },
    { angle: Math.atan2(-dir2.y, -dir2.x) },
  ].sort((left, right) => left.angle - right.angle);

  const sectors = [];
  for (let i = 0; i < rays.length; i += 1) {
    const start = rays[i].angle;
    const end = i === rays.length - 1 ? rays[0].angle + Math.PI * 2 : rays[i + 1].angle;
    const sweep = end - start;
    sectors.push({
      degrees: (sweep * 180) / Math.PI,
      midAngle: start + sweep / 2,
    });
  }

  return sectors;
}
