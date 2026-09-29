/** Decodes an encoded polyline (Google format, precision 5 at Strava) into [lat, lng][]. */
export function decodePolyline(str: string, precision = 5): [number, number][] {
  const factor = 10 ** precision;
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < str.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / factor, lng / factor]);
  }
  return points;
}

/** Web Mercator projection of a [lat, lng] point, in radians-based units (x, y in [-π, π]). */
export const project = ([lat, lng]: [number, number]): [number, number] => [
  (lng * Math.PI) / 180,
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

/** Affine map from Mercator units to card pixels: px = scale·x + tx, py = -scale·y + ty. */
export type MercatorTransform = { scale: number; tx: number; ty: number };

/**
 * Projects the points (Web Mercator) and fits them into a box, keeping their aspect
 * ratio. Returns the pixel coordinates [x, y] and the transform used, so that other
 * layers (the map background) share exactly the same projection.
 */
export function fitToBoxWithTransform(
  points: [number, number][],
  box: { x: number; y: number; w: number; h: number },
): { points: [number, number][]; transform: MercatorTransform | null } {
  if (points.length === 0) return { points: [], transform: null };
  const projected = points.map(project);

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of projected) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const scale = Math.min(box.w / spanX, box.h / spanY);
  const offX = box.x + (box.w - spanX * scale) / 2;
  const offY = box.y + (box.h - spanY * scale) / 2;

  // y is flipped: north at the top
  const transform = { scale, tx: offX - minX * scale, ty: offY + maxY * scale };
  return {
    points: projected.map(([x, y]) => [
      transform.scale * x + transform.tx,
      transform.ty - transform.scale * y,
    ]),
    transform,
  };
}

export function fitToBox(
  points: [number, number][],
  box: { x: number; y: number; w: number; h: number },
): [number, number][] {
  return fitToBoxWithTransform(points, box).points;
}
