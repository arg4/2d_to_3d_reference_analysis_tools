import { lineLength } from "./scale.js";

export function getRatioMetrics(points) {
  if (points.length < 4) {
    return null;
  }

  const len1 = lineLength(points[0], points[1]);
  const len2 = lineLength(points[2], points[3]);

  if (len1 < 1e-8 || len2 < 1e-8) {
    return {
      len1,
      len2,
      ratio: null,
      normalized: null,
    };
  }

  const ratio = len1 / len2;
  const larger = Math.max(len1, len2);
  const smaller = Math.min(len1, len2);

  return {
    len1,
    len2,
    ratio,
    normalized: larger / smaller,
  };
}
