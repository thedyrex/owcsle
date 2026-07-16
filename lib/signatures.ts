/**
 * Signature capture shared between the drawing board (app/components/SignatureModal)
 * and the upload route (app/api/signatures).
 *
 * The client never sends markup — it sends raw stroke points and the server
 * renders the SVG from them. Anything that lands in R2 is therefore built from
 * numbers we validated ourselves, so a signature can't smuggle in script.
 */

/** Logical drawing surface. The canvas is rendered at devicePixelRatio on top. */
export const SIGNATURE_WIDTH = 600;
export const SIGNATURE_HEIGHT = 260;

/** Brush size is chosen per stroke, so one signature can mix weights. */
export const MIN_BRUSH_WIDTH = 1;
export const MAX_BRUSH_WIDTH = 9;
export const DEFAULT_BRUSH_WIDTH = 2.6;

/**
 * Points closer together than this contribute nothing but bytes. It sits below
 * a rendered pixel (the pad draws ~0.85 CSS px per logical unit), so filtering
 * at this distance is invisible while still collapsing pointer-event noise.
 */
export const MIN_POINT_DISTANCE = 0.3;

/**
 * How much of each new sample to trust, 0..1 — 1 would be raw input.
 * A mouse reports whole device pixels, so a slow stroke arrives as a staircase
 * rather than a line, and every hand shakes a little. Easing each sample toward
 * the last removes both without visibly lagging the cursor at this sample rate.
 */
export const INPUT_SMOOTHING = 0.5;

/** Movement of this many units between samples is treated as pure intent. */
const SMOOTHING_FULL_SPEED = 3;

/**
 * Ease a raw sample toward the previous point, trusting it more the faster the
 * pointer was moving. Smoothing a slow stroke hard is what kills the staircase;
 * doing the same to a fast one would round off the flourishes, so speed decides.
 */
export function smoothSample(prev: Point, raw: Point): Point {
  const distance = Math.hypot(raw[0] - prev[0], raw[1] - prev[1]);
  const alpha = clamp(distance / SMOOTHING_FULL_SPEED, INPUT_SMOOTHING, 1);
  return [prev[0] + alpha * (raw[0] - prev[0]), prev[1] + alpha * (raw[1] - prev[1])];
}

/** Caps that keep a hostile payload from turning into a multi-megabyte object. */
export const MAX_STROKES = 400;
export const MAX_POINTS_PER_STROKE = 6000;
export const MAX_TOTAL_POINTS = 30000;

export type Point = [number, number];
/** A stroke carries the brush width it was drawn with. */
export interface Stroke {
  width: number;
  points: Point[];
}

/** Two decimals: curve control points land sub-pixel, which smooths the seams. */
const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Combining marks left behind by NFKD, e.g. the accent in "Someone". */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** URL segment for a player name: "Proper" -> "proper", "Da Bin" -> "da-bin". */
export function slugifyPlayerName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate an untrusted strokes payload, returning clamped/rounded strokes or a
 * reason to reject. Degenerate points (NaN, out of bounds) are dropped rather
 * than failing the whole submission — a stray pointer event shouldn't cost the
 * signer their drawing.
 */
export function sanitizeStrokes(
  input: unknown
): { ok: true; strokes: Stroke[]; pointCount: number } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: 'strokes must be an array' };
  if (input.length === 0) return { ok: false, error: 'Signature is empty' };
  if (input.length > MAX_STROKES) return { ok: false, error: 'Too many strokes' };

  const strokes: Stroke[] = [];
  let pointCount = 0;

  for (const rawStroke of input) {
    if (typeof rawStroke !== 'object' || rawStroke === null || Array.isArray(rawStroke)) {
      return { ok: false, error: 'Each stroke must be an object' };
    }

    const { width, points } = rawStroke as { width?: unknown; points?: unknown };
    if (!Array.isArray(points)) return { ok: false, error: 'Each stroke needs points' };
    if (points.length > MAX_POINTS_PER_STROKE) return { ok: false, error: 'Stroke too long' };

    // An out-of-range or non-numeric width falls back to the default rather
    // than failing: the drawing is the part worth keeping.
    const strokeWidth =
      typeof width === 'number' && Number.isFinite(width)
        ? round(clamp(width, MIN_BRUSH_WIDTH, MAX_BRUSH_WIDTH))
        : DEFAULT_BRUSH_WIDTH;

    const cleaned: Point[] = [];
    for (const rawPoint of points) {
      if (!Array.isArray(rawPoint) || rawPoint.length < 2) continue;
      const [x, y] = rawPoint;
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      cleaned.push([round(clamp(x, 0, SIGNATURE_WIDTH)), round(clamp(y, 0, SIGNATURE_HEIGHT))]);
    }

    if (cleaned.length === 0) continue;
    pointCount += cleaned.length;
    if (pointCount > MAX_TOTAL_POINTS) return { ok: false, error: 'Signature is too detailed' };
    strokes.push({ width: strokeWidth, points: cleaned });
  }

  if (strokes.length === 0) return { ok: false, error: 'Signature is empty' };
  return { ok: true, strokes, pointCount };
}

/**
 * Build the `d` attribute for one stroke. Consecutive points are joined by
 * quadratic curves through their midpoints, which smooths the polyline that
 * pointer events produce without needing to fit real splines.
 */
export function strokeToPath(points: Point[]): string {
  if (points.length === 1) {
    // A tap: emit a dot as a zero-length line, which round linecaps render as a circle.
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x} ${y}`;
  }
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    // Segments at the ends duplicate the endpoint as their missing neighbour.
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const [c1, c2] = catmullRomControls(p0, p1, p2, p3);
    d += ` C ${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * Bézier control points for the p1→p2 span of a centripetal Catmull-Rom spline.
 *
 * Centripetal (the exponent below) rather than uniform: where a fast stroke
 * leaves points far apart and a slow one packs them tight, uniform spacing
 * overshoots and can knot the curve back through itself. Centripetal is the
 * variant proven not to cusp or self-intersect, whatever the spacing.
 */
function catmullRomControls(p0: Point, p1: Point, p2: Point, p3: Point): [Point, Point] {
  const t1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) ** 0.5;
  const t2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) ** 0.5;
  const t3 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) ** 0.5;

  // Coincident neighbours would divide by zero; fall back to a plain third.
  const c1: Point = t1 > 0
    ? axes((a) => (t1 ** 2 * p2[a] - t2 ** 2 * p0[a] + (2 * t1 ** 2 + 3 * t1 * t2 + t2 ** 2) * p1[a]) / (3 * t1 * (t1 + t2)))
    : axes((a) => p1[a] + (p2[a] - p1[a]) / 3);
  const c2: Point = t3 > 0
    ? axes((a) => (t3 ** 2 * p1[a] - t2 ** 2 * p3[a] + (2 * t3 ** 2 + 3 * t3 * t2 + t2 ** 2) * p2[a]) / (3 * t3 * (t3 + t2)))
    : axes((a) => p2[a] + (p1[a] - p2[a]) / 3);

  return [c1, c2];
}

/** Evaluate a control-point formula for x then y. */
const axes = (f: (axis: 0 | 1) => number): Point => [f(0), f(1)];

/**
 * Render sanitized strokes to a standalone SVG document. Transparent
 * background and currentColor-friendly ink so the mark drops onto any surface.
 */
export function strokesToSvg(strokes: Stroke[], meta?: { playerName?: string }): string {
  // stroke-width sits on each path because the brush can change mid-signature.
  const paths = strokes
    .map((stroke) => `    <path stroke-width="${stroke.width}" d="${strokeToPath(stroke.points)}" />`)
    .join('\n');

  const title = escapeXml(meta?.playerName ? `Signature for ${meta.playerName}` : 'Signature');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}" width="${SIGNATURE_WIDTH}" height="${SIGNATURE_HEIGHT}" role="img" aria-label="${title}">
  <title>${title}</title>
  <g fill="none" stroke="#0a0a0a" stroke-linecap="round" stroke-linejoin="round">
${paths}
  </g>
</svg>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
