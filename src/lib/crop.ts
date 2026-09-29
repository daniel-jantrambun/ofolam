/**
 * Focal point + zoom crop, the same model as an `object-fit: cover` image with
 * `object-position` and `scale`. Pure math shared by the crop picker (to draw the
 * visible frame) and the canvas renderer (to draw the photo), so both always agree.
 */
export type Crop = {
  /** Focal point, 0..100 (%). */
  x: number;
  y: number;
  /** 1 = no zoom. */
  zoom: number;
};

export type Size = { w: number; h: number };

/** Visible region of the source image, as fractions (0..1) of its size. */
export type Frame = { left: number; top: number; width: number; height: number };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.05;
export const DEFAULT_CROP: Crop = { x: 50, y: 50, zoom: 1 };

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Region of `natural` shown when covering a box of aspect `target`, centred on the
 * focal point and shrunk by the zoom.
 */
export function visibleFrame(natural: Size, target: Size, crop: Crop): Frame {
  let left = 0;
  let top = 0;
  let width = 1;
  let height = 1;
  const x = clamp(crop.x, 0, 100) / 100;
  const y = clamp(crop.y, 0, 100) / 100;

  if (natural.w > 0 && natural.h > 0 && target.w > 0 && target.h > 0) {
    const na = natural.w / natural.h;
    const ta = target.w / target.h;
    if (na > ta) {
      width = ta / na;
      left = x * (1 - width);
    } else if (na < ta) {
      height = na / ta;
      top = y * (1 - height);
    }
  }

  const zoom = clamp(crop.zoom, ZOOM_MIN, ZOOM_MAX);
  if (zoom > 1) {
    const zw = width / zoom;
    const zh = height / zoom;
    left += x * (width - zw);
    top += y * (height - zh);
    width = zw;
    height = zh;
  }

  return { left, top, width, height };
}
