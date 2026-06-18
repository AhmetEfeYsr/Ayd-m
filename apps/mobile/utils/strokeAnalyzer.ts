export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  option: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Stroke = Point[];

// ─── Helpers ───────────────────────────────────────────────

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function getPathLength(stroke: Stroke): number {
  let len = 0;
  for (let i = 1; i < stroke.length; i++) {
    len += distance(stroke[i - 1], stroke[i]);
  }
  return len;
}

function getStrokeBoundingBox(stroke: Stroke) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of stroke) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    cx: minX + (maxX - minX) / 2,
    cy: minY + (maxY - minY) / 2,
  };
}

/**
 * Downsample a stroke so that consecutive points are at least `minDist` apart.
 * Styluses can produce 120Hz+ input resulting in points < 1px apart.
 * The noisy micro-vectors break angle calculations so we reduce the resolution first.
 */
function downsample(stroke: Stroke, minDist: number = 6): Stroke {
  if (stroke.length < 2) return stroke;
  const result: Point[] = [stroke[0]];
  let last = stroke[0];
  for (let i = 1; i < stroke.length; i++) {
    if (distance(last, stroke[i]) >= minDist) {
      result.push(stroke[i]);
      last = stroke[i];
    }
  }
  // Always keep the last point
  if (result[result.length - 1] !== stroke[stroke.length - 1]) {
    result.push(stroke[stroke.length - 1]);
  }
  return result;
}

// ─── Line Segment Intersection ──────────────────────────────

function lineSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 0.001) return false; // Parallel

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function checkSelfIntersection(stroke: Stroke): boolean {
  if (stroke.length < 4) return false;
  // Use downsampled points for self-intersection to avoid small scale noise
  const pts = downsample(stroke, 8);
  if (pts.length < 4) return false;

  for (let i = 1; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      if (lineSegmentsIntersect(pts[i - 1], pts[i], pts[j - 1], pts[j])) {
        return true;
      }
    }
  }
  return false;
}

// ─── Winding Angle Calculation (Circle Detection) ───────────

function calculateWindingAngle(stroke: Stroke): number {
  if (stroke.length < 3) return 0;
  const pts = downsample(stroke, 6);
  if (pts.length < 3) return 0;

  let totalAngle = 0;
  for (let i = 2; i < pts.length; i++) {
    const v1x = pts[i - 1].x - pts[i - 2].x;
    const v1y = pts[i - 1].y - pts[i - 2].y;
    const v2x = pts[i].x - pts[i - 1].x;
    const v2y = pts[i].y - pts[i - 1].y;

    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);

    let diff = angle2 - angle1;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    totalAngle += diff;
  }
  return totalAngle;
}

// ─── Tick Detection ──────────────────────────────────────────

function checkTickLike(stroke: Stroke): boolean {
  if (stroke.length < 4) return false;
  const pts = downsample(stroke, 6);
  if (pts.length < 4) return false;

  // Find bottom-most point (highest y value in screen space)
  let maxY = -Infinity;
  let pivotIndex = -1;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y > maxY) {
      maxY = pts[i].y;
      pivotIndex = i;
    }
  }

  // Pivot should be in the middle of the stroke
  if (pivotIndex <= 0 || pivotIndex >= pts.length - 1) return false;

  const start = pts[0];
  const pivot = pts[pivotIndex];
  const end = pts[pts.length - 1];

  const dx1 = pivot.x - start.x;
  const dy1 = pivot.y - start.y;
  const dx2 = end.x - pivot.x;
  const dy2 = end.y - pivot.y;

  // Tick segments:
  // Part 1: downward-right (dy1 > 0, and generally rightward or neutral dx1)
  // Part 2: upward-right (dy2 < 0, and clear rightward dx2)
  const isDownRight = dy1 > 0 && dx1 > -5;
  const isUpRight = dy2 < 0 && dx2 > 5;

  if (!isDownRight || !isUpRight) return false;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  // The upward stroke should be longer or similar, but not extremely short
  return len2 > len1 * 0.7;
}

// ─── Horizontal Strike-through Detection ────────────────────

function checkHorizontalLine(stroke: Stroke): boolean {
  const bbox = getStrokeBoundingBox(stroke);
  const straightness = stroke.length >= 2 ? distance(stroke[0], stroke[stroke.length - 1]) / getPathLength(stroke) : 0;
  return straightness > 0.85 && bbox.w > bbox.h * 2.2 && bbox.w > 12;
}

// ─── Stroke Classification ──────────────────────────────────

export function classifyStroke(rawStroke: Stroke): 'CIRCLE' | 'SLASH' | 'TICK' | 'CROSS' | 'SCRIBBLE' | 'HORIZONTAL' | 'UNKNOWN' {
  const stroke = downsample(rawStroke);
  if (stroke.length < 2) return 'UNKNOWN';

  const bbox = getStrokeBoundingBox(stroke);
  const diag = Math.sqrt(bbox.w ** 2 + bbox.h ** 2);
  if (diag < 4) return 'UNKNOWN'; // Too small noise

  const pathLength = getPathLength(stroke);
  const startEndDist = distance(stroke[0], stroke[stroke.length - 1]);
  const straightness = pathLength > 0 ? startEndDist / pathLength : 0;

  // 1. Scribble (Dense coloring-in)
  if (pathLength > diag * 4.0) {
    return 'SCRIBBLE';
  }

  // 2. Circle / Loop
  // A circular loop has start and end points close, and accumulated winding angle near 2*PI (6.28 rad)
  const winding = calculateWindingAngle(stroke);
  if (startEndDist < diag * 0.45 && Math.abs(winding) > 4.2) {
    return 'CIRCLE';
  }

  // 3. Tick
  if (checkTickLike(stroke)) {
    return 'TICK';
  }

  // 4. Cross (Single-stroke 'X')
  if (checkSelfIntersection(stroke) && bbox.w > 8 && bbox.h > 8) {
    return 'CROSS';
  }

  // 5. Horizontal Line (strike-through)
  if (checkHorizontalLine(stroke)) {
    return 'HORIZONTAL';
  }

  // 6. Straight Line / Slash
  if (straightness > 0.85) {
    return 'SLASH';
  }

  return 'UNKNOWN';
}

// ─── Cross Detection (Multi-stroke Slashes) ─────────────────

function doSlashesCross(a: Stroke, b: Stroke): boolean {
  const p1 = a[0], p2 = a[a.length - 1];
  const p3 = b[0], p4 = b[b.length - 1];
  return lineSegmentsIntersect(p1, p2, p3, p4);
}

// ─── Proximity & Overlap Metrics ───────────────────────────

function getStrokeIntersectionMetric(stroke: Stroke, box: BoundingBox): number {
  // 1. Point ratio (how many points of the stroke are inside the option box)
  let pointsInside = 0;
  for (const p of stroke) {
    if (p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h) {
      pointsInside++;
    }
  }
  const pointRatio = stroke.length > 0 ? pointsInside / stroke.length : 0;

  // 2. Bounding box overlap ratio
  const sBox = getStrokeBoundingBox(stroke);
  const interX1 = Math.max(sBox.x, box.x);
  const interY1 = Math.max(sBox.y, box.y);
  const interX2 = Math.min(sBox.x + sBox.w, box.x + box.w);
  const interY2 = Math.min(sBox.y + sBox.h, box.y + box.h);

  let overlapAreaRatio = 0;
  if (interX2 > interX1 && interY2 > interY1) {
    const interArea = (interX2 - interX1) * (interY2 - interY1);
    const strokeArea = sBox.w * sBox.h || 1;
    const boxArea = box.w * box.h || 1;
    overlapAreaRatio = interArea / Math.min(strokeArea, boxArea);
  }

  // 3. Proximity score (distance between stroke center and option box center)
  const strokeCx = sBox.x + sBox.w / 2;
  const strokeCy = sBox.y + sBox.h / 2;
  const boxCx = box.x + box.w / 2;
  const boxCy = box.y + box.h / 2;
  const maxDist = Math.max(box.w, box.h) * 1.6;
  const dist = Math.sqrt((strokeCx - boxCx) ** 2 + (strokeCy - boxCy) ** 2);
  const proximityScore = dist < maxDist ? 1.0 - dist / maxDist : 0;

  // Combining metrics
  // If the stroke is a circle around the option box, pointRatio might be low, but overlapAreaRatio & proximity will be high.
  return Math.max(pointRatio, overlapAreaRatio * 0.85) * (0.4 + 0.6 * proximityScore);
}

// ─── Coordinate Mapping ─────────────────────────────────────

export function mapStrokesToImageSpace(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): Stroke[] {
  if (!canvasWidth || !canvasHeight || !imageWidth || !imageHeight) return strokes;

  // resizeMode="contain" matching aspect ratio scaling
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  if (scale <= 0) return strokes;

  const dx = (canvasWidth - imageWidth * scale) / 2;
  const dy = (canvasHeight - imageHeight * scale) / 2;

  return strokes.map(stroke =>
    stroke.map(p => ({
      x: (p.x - dx) / scale,
      y: (p.y - dy) / scale,
    }))
  );
}

// ─── Main Analysis ──────────────────────────────────────────

export function analyzeOptions(
  strokes: Stroke[],
  options: BoundingBox[],
  extra?: {
    imageWidth?: number;
    imageHeight?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }
): { selected: string | null; eliminated: string[] } {
  // Pre-process coordinate mapping if dimensions are supplied
  let processedStrokes = strokes;
  if (extra?.imageWidth && extra?.imageHeight && extra?.canvasWidth && extra?.canvasHeight) {
    processedStrokes = mapStrokesToImageSpace(
      strokes,
      extra.canvasWidth,
      extra.canvasHeight,
      extra.imageWidth,
      extra.imageHeight
    );
  }

  const optionStatus: Record<string, { selectionScore: number; eliminationScore: number }> = {};

  for (const opt of options) {
    optionStatus[opt.option] = { selectionScore: 0, eliminationScore: 0 };
  }

  // Associate strokes with option bounds using soft-matching (proximity & intersection metric)
  const optionStrokes: Record<string, { stroke: Stroke; assocMetric: number }[]> = {};
  for (const opt of options) {
    optionStrokes[opt.option] = [];
    for (const stroke of processedStrokes) {
      const metric = getStrokeIntersectionMetric(stroke, opt);
      if (metric > 0.22) { // Minimum threshold to associate stroke with this option
        optionStrokes[opt.option].push({ stroke, assocMetric: metric });
      }
    }
  }

  // Classify strokes and assign scores
  for (const opt of options) {
    const associated = optionStrokes[opt.option];
    if (associated.length === 0) continue;

    const slashStrokes: Stroke[] = [];

    for (const { stroke, assocMetric } of associated) {
      const classification = classifyStroke(stroke);

      switch (classification) {
        case 'CIRCLE':
        case 'SCRIBBLE':
        case 'TICK':
          optionStatus[opt.option].selectionScore += 2.0 * assocMetric;
          break;

        case 'CROSS':
          optionStatus[opt.option].eliminationScore += 5.0 * assocMetric;
          break;

        case 'HORIZONTAL':
          optionStatus[opt.option].eliminationScore += 3.0 * assocMetric;
          break;

        case 'SLASH':
          slashStrokes.push(stroke);
          // A single slash is ambiguous — minor elimination signal
          optionStatus[opt.option].eliminationScore += 1.0 * assocMetric;
          break;

        case 'UNKNOWN':
          // Weak selection signal if inside the box and has decent length
          if (stroke.length >= 5) {
            optionStatus[opt.option].selectionScore += 0.5 * assocMetric;
          }
          break;
      }
    }

    // Multi-slash cross detection
    if (slashStrokes.length >= 2) {
      let foundCross = false;
      for (let i = 0; i < slashStrokes.length && !foundCross; i++) {
        for (let j = i + 1; j < slashStrokes.length && !foundCross; j++) {
          if (doSlashesCross(slashStrokes[i], slashStrokes[j])) {
            foundCross = true;
          }
        }
      }
      if (foundCross) {
        // Confirmed X cross — strong elimination override
        optionStatus[opt.option].eliminationScore += 4.5;
      } else {
        // Parallel strike-through lines
        optionStatus[opt.option].eliminationScore += 2.0;
      }
    }
  }

  // ── Decision ──────────────────────────────────────────────

  const eliminated: string[] = [];
  let bestSelectedOption: string | null = null;
  let highestSelectionScore = 0.4; // Require at least 0.4 score to count as selected

  for (const opt of options) {
    const status = optionStatus[opt.option];

    // Option with no interaction → skip
    if (status.selectionScore === 0 && status.eliminationScore === 0) continue;

    if (status.eliminationScore > 0 && status.eliminationScore > status.selectionScore) {
      eliminated.push(opt.option);
    } else if (status.selectionScore > 0 && status.selectionScore > status.eliminationScore) {
      if (status.selectionScore > highestSelectionScore) {
        highestSelectionScore = status.selectionScore;
        bestSelectedOption = opt.option;
      }
    }
  }

  return {
    selected: bestSelectedOption,
    eliminated,
  };
}
