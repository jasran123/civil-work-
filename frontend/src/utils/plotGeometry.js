const EPSILON = 1e-7;
const FEET_PER_METRE = 1 / 0.3048;
const MEASUREMENT_TOLERANCE = 0.01;
const ANGLE_TOLERANCE = 0.05;
const SIDE_KEYS = ['front', 'right', 'back', 'left'];
const ANGLE_KEYS = ['frontLeft', 'frontRight', 'backRight', 'backLeft'];

const invalid = (message) => ({ status: 'invalid', points: [], message });
const insufficient = (message) => ({ status: 'insufficient', points: [], message });
const valid = (points) => ({ status: 'valid', points, message: '' });
const radians = (angle) => angle * Math.PI / 180;
const degrees = (angle) => angle * 180 / Math.PI;
const hasValue = (value) => value != null && String(value).trim() !== '';
const number = (value) => hasValue(value) ? Number(value) : undefined;
const vector = (origin, end) => ({ x: end.x - origin.x, y: end.y - origin.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = (v) => Math.hypot(v.x, v.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const near = (a, b, tolerance = MEASUREMENT_TOLERANCE) => Math.abs(a - b) <= tolerance;

export const toFeet = (value, unit) => hasValue(value) ? Number(value) * (unit === 'm' ? FEET_PER_METRE : 1) : undefined;
export const fromFeet = (value, unit) => hasValue(value) ? Number(value) / (unit === 'm' ? FEET_PER_METRE : 1) : undefined;
export const plotDistance = (a, b) => length(vector(a, b));

export function areaMeasurements(squareFeet) {
  return {
    squareFeet,
    squareMetres: squareFeet * 0.3048 ** 2,
    cents: squareFeet / 435.6,
    grounds: squareFeet / 2400,
  };
}

function signedArea(points) {
  if (points.length < 3) return 0;
  const origin = points[0];
  let twiceArea = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    twiceArea += cross(vector(origin, points[index]), vector(origin, points[index + 1]));
  }
  return twiceArea / 2;
}

export const polygonArea = (points) => Math.abs(signedArea(points));

export function polygonBounds(points) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  let { x: minX, y: minY } = points[0];
  let maxX = minX;
  let maxY = minY;
  for (const { x, y } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function polygonMetrics(points) {
  const area = signedArea(points);
  const sides = points.map((point, index) => plotDistance(point, points[(index + 1) % points.length]));
  const angles = points.map((point, index) => {
    const previous = vector(point, points[(index + points.length - 1) % points.length]);
    const next = vector(point, points[(index + 1) % points.length]);
    const angle = degrees(Math.atan2(-Math.sign(area) * cross(previous, next), dot(previous, next)));
    return angle < 0 ? angle + 360 : angle;
  });
  return {
    area: Math.abs(area),
    perimeter: sides.reduce((sum, side) => sum + side, 0),
    sides,
    angles,
    bounds: polygonBounds(points),
  };
}

function orientation(a, b, c) {
  const ab = vector(a, b);
  const ac = vector(a, c);
  const turn = cross(ab, ac);
  return Math.abs(turn) <= EPSILON * Math.max(length(ab), length(ac), 1) ? 0 : Math.sign(turn);
}

function pointOnSegment(point, a, b) {
  return orientation(a, b, point) === 0
    && point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON
    && point.y >= Math.min(a.y, b.y) - EPSILON && point.y <= Math.max(a.y, b.y) + EPSILON;
}

function segmentsIntersect(a, b, c, d) {
  const abc = orientation(a, b, c);
  const abd = orientation(a, b, d);
  const cda = orientation(c, d, a);
  const cdb = orientation(c, d, b);
  return (abc * abd < 0 && cda * cdb < 0)
    || (abc === 0 && pointOnSegment(c, a, b))
    || (abd === 0 && pointOnSegment(d, a, b))
    || (cda === 0 && pointOnSegment(a, c, d))
    || (cdb === 0 && pointOnSegment(b, c, d));
}

export function validatePolygon(points) {
  if (!Array.isArray(points) || points.length < 3) return insufficient('Enter at least three plot corners.');
  if (points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return invalid('Every corner needs a finite X and Y coordinate.');
  }

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index + points.length - 1) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (plotDistance(current, next) <= EPSILON) return invalid('Two neighboring corners occupy the same position.');
    if (orientation(previous, current, next) === 0 && dot(vector(current, previous), vector(current, next)) > 0) {
      return invalid('Adjacent plot sides overlap.');
    }

    for (let other = index + 2; other < points.length; other += 1) {
      if (index === 0 && other === points.length - 1) continue;
      if (segmentsIntersect(current, next, points[other], points[(other + 1) % points.length])) {
        return invalid('Plot sides cross or touch away from their shared corners.');
      }
    }
  }

  const area = polygonArea(points);
  if (!Number.isFinite(area) || area <= EPSILON ** 2) return invalid('The plot must enclose a positive area.');
  return valid(points);
}

function circleIntersection(base, fromStart, fromEnd) {
  const x = (base + (fromStart - fromEnd) * (fromStart + fromEnd) / base) / 2;
  const radiusRemainder = fromStart - Math.abs(x);
  const roundingTolerance = 8 * Number.EPSILON * Math.max(base, fromStart, fromEnd);
  if (radiusRemainder < -roundingTolerance) return null;
  const height = radiusRemainder <= roundingTolerance ? 0 : Math.sqrt(radiusRemainder * (fromStart + Math.abs(x)));
  return { x, y: height };
}

function canonicalize(points) {
  const baseline = vector(points[0], points[1]);
  const size = length(baseline);
  const direction = { x: baseline.x / size, y: baseline.y / size };
  const winding = Math.sign(signedArea(points));
  return points.map((point) => {
    const offset = vector(points[0], point);
    return { x: dot(direction, offset), y: cross(direction, offset) * winding };
  });
}

function splitQuadrilateral(lengths, diagonal, start) {
  const orderedLengths = lengths.map((_, index) => lengths[(start + index) % 4]);
  const first = circleIntersection(diagonal, orderedLengths[0], orderedLengths[1]);
  const second = circleIntersection(diagonal, orderedLengths[3], orderedLengths[2]);
  if (!first || !second) return [];

  // The two triangles can share a diagonal on the same side or on opposite sides.
  return [second.y, -second.y].map((secondY) => {
    const orderedPoints = [{ x: 0, y: 0 }, first, { x: diagonal, y: 0 }, { ...second, y: secondY }];
    const points = orderedPoints.map((_, index) => orderedPoints[(index + 4 - start) % 4]);
    return canonicalize(points);
  });
}

function trapezoid(front, right, back, left) {
  const baseDifference = front - back;
  const offset = circleIntersection(Math.abs(baseDifference), left, right);
  if (!offset || offset.y <= EPSILON) return [];
  const start = Math.sign(baseDifference) * offset.x;
  return [{ x: 0, y: 0 }, { x: front, y: 0 }, { x: start + back, y: offset.y }, { x: start, y: offset.y }];
}

function matchesConstraints(points, angles, diagonals, layout, parallelBases) {
  const measured = polygonMetrics(points);
  if (!angles.every((value, index) => value === undefined || near(value, measured.angles[index], ANGLE_TOLERANCE))) {
    return false;
  }
  if (points.length !== 4) return true;
  const [a, b, c, d] = points;
  if (diagonals.ac !== undefined && !near(diagonals.ac, plotDistance(a, c))) return false;
  if (diagonals.bd !== undefined && !near(diagonals.bd, plotDistance(b, d))) return false;
  if (parallelBases) {
    const parallel = vector(d, c);
    if (Math.abs(parallel.y) > EPSILON * Math.max(length(parallel), 1) || parallel.x <= EPSILON) return false;
  }
  const positions = orientation(a, c, b) * orientation(a, c, d);
  return layout === 'opposite' ? positions < 0 : layout === 'same' ? positions > 0 : true;
}

function angleDiagonal(lengths, index, angle) {
  const previous = lengths[(index + 3) % 4];
  const next = lengths[index];
  return Math.hypot(previous - next, 2 * Math.sqrt(previous * next) * Math.sin(radians(angle) / 2));
}

export function solvePlot({ shape, sides = {}, diagonal, angles = {}, diagonalLayout = 'auto', notch } = {}) {
  const lengths = SIDE_KEYS.map((key) => number(sides[key]));
  const triangle = shape === 'triangle';
  const usedLengths = triangle ? [lengths[0], lengths[1], lengths[3]] : lengths;
  const angleValues = ANGLE_KEYS.slice(0, triangle ? 3 : 4).map((key, index) => (
    number(Array.isArray(angles) ? angles[index] : angles[key])
  ));
  const diagonals = diagonal && typeof diagonal === 'object'
    ? { ac: number(diagonal.ac), bd: number(diagonal.bd) }
    : { ac: number(diagonal), bd: undefined };
  const positive = (value) => value === undefined || (Number.isFinite(value) && value > EPSILON);
  if (usedLengths.some((value) => !positive(value))) return invalid('Side lengths must be positive numbers.');
  if (Object.values(diagonals).some((value) => !positive(value))) return invalid('Diagonals must be positive numbers.');
  if (angleValues.some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0 || value >= 360))) {
    return invalid('Interior angles must be greater than 0° and less than 360°.');
  }

  const [front, right, back, left] = lengths;
  const rectangle = shape === 'rectangle' || shape === 'square';
  let candidates = [];
  if (rectangle) {
    const width = front ?? back;
    const depth = shape === 'square' ? width ?? right ?? left : right ?? left;
    const actualWidth = shape === 'square' ? depth : width;
    if (actualWidth === undefined || depth === undefined) return insufficient('Enter the plot dimensions.');
    const resolved = [actualWidth, depth, actualWidth, depth];
    if (lengths.some((value, index) => value !== undefined && !near(value, resolved[index]))) {
      return invalid(shape === 'square' ? 'All four sides of a square must match.' : 'Opposite sides of a rectangle must match.');
    }
    candidates = [[{ x: 0, y: 0 }, { x: actualWidth, y: 0 }, { x: actualWidth, y: depth }, { x: 0, y: depth }]];
  } else if (shape === 'l-shape') {
    const notchWidth = number(notch?.width);
    const notchDepth = number(notch?.depth);
    if (front === undefined || left === undefined || notchWidth === undefined || notchDepth === undefined) {
      return insufficient('Enter the outer dimensions and rear-right cutout, or supply the six corner coordinates.');
    }
    if (!positive(notchWidth) || !positive(notchDepth) || notchWidth >= front || notchDepth >= left) {
      return invalid('The rear-right cutout must fit inside the outer plot dimensions.');
    }
    const innerX = front - notchWidth;
    const innerY = left - notchDepth;
    if ((back !== undefined && !near(back, innerX)) || (right !== undefined && !near(right, innerY))) {
      return invalid('The back and right sides must match the outer dimensions after subtracting the cutout.');
    }
    candidates = [[{ x: 0, y: 0 }, { x: front, y: 0 }, { x: front, y: innerY }, { x: innerX, y: innerY },
      { x: innerX, y: left }, { x: 0, y: left }]];
  } else {
    if (usedLengths.some((value) => value === undefined)) return insufficient('Enter each side length.');
    const longest = Math.max(...usedLengths);
    if (usedLengths.reduce((sum, value) => sum + value, 0) - 2 * longest <= EPSILON) {
      return invalid('The longest side must be shorter than the other sides combined.');
    }

    if (triangle) {
      const top = circleIntersection(front, left, right);
      if (top) candidates = [[{ x: 0, y: 0 }, { x: front, y: 0 }, top]];
    } else if (shape === 'trapezoid' && Math.abs(front - back) > EPSILON) {
      candidates = [trapezoid(front, right, back, left)];
    } else {
      if (shape === 'trapezoid' && !near(left, right)) {
        return invalid('Equal parallel bases require equal left and right sides.');
      }
      const angleIndex = angleValues.findIndex((value) => value !== undefined);
      let distance = diagonals.ac ?? diagonals.bd;
      let start = diagonals.ac === undefined && diagonals.bd !== undefined ? 1 : 0;
      if (distance === undefined && angleIndex !== -1) {
        distance = angleDiagonal(lengths, angleIndex, angleValues[angleIndex]);
        start = angleIndex % 2 === 0 ? 1 : 0;
      }
      if (distance === undefined) return insufficient('Add a measured diagonal, a corner angle, or survey coordinates.');
      if (distance > EPSILON) candidates = splitQuadrilateral(lengths, distance, start);
    }
  }

  const matches = candidates.filter((points) => validatePolygon(points).status === 'valid'
    && matchesConstraints(points, angleValues, diagonals, diagonalLayout, shape === 'trapezoid'));
  if (matches.length === 0) return invalid('These measurements do not close into a valid plot of the selected shape.');
  if (matches.length > 1 && !matches[0].every((point, index) => plotDistance(point, matches[1][index]) <= EPSILON)) {
    return insufficient('The measurements allow two layouts. Specify the diagonal layout, another angle, or a second diagonal.');
  }
  return valid(matches[0]);
}

export function editPlotEdge(points, index, value) {
  const current = points[index];
  const nextIndex = (index + 1) % points.length;
  const next = points[nextIndex];
  if (!current || !next || !Number.isFinite(value) || value <= EPSILON) return invalid('Enter a positive side length.');
  const edge = vector(current, next);
  const scale = value / length(edge);
  return validatePolygon(points.map((point, pointIndex) => (
    pointIndex === nextIndex ? { x: current.x + edge.x * scale, y: current.y + edge.y * scale } : point
  )));
}

export function editPlotAngle(points, index, value) {
  const current = points[index];
  if (!current || !Number.isFinite(value) || value <= 0 || value >= 360) {
    return invalid('Enter an interior angle between 0° and 360°.');
  }
  const nextIndex = (index + 1) % points.length;
  const previous = vector(current, points[(index + points.length - 1) % points.length]);
  const edgeLength = plotDistance(current, points[nextIndex]);
  const direction = Math.atan2(previous.y, previous.x) - Math.sign(signedArea(points)) * radians(value);
  const result = validatePolygon(points.map((point, pointIndex) => (
    pointIndex === nextIndex ? { x: current.x + Math.cos(direction) * edgeLength, y: current.y + Math.sin(direction) * edgeLength } : point
  )));
  if (result.status === 'valid' && !near(polygonMetrics(result.points).angles[index], value, ANGLE_TOLERANCE)) {
    return invalid('That angle would reverse the plot boundary.');
  }
  return result;
}

export function plotRectangle({ x, y, width, depth, rotation = 0 }) {
  const angle = radians(rotation);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]]
    .map(([offsetX, offsetY]) => ({ x: x + cos * offsetX - sin * offsetY, y: y + sin * offsetX + cos * offsetY }));
}

function pointLocation(point, points) {
  let inside = false;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    if (pointOnSegment(point, a, b)) return 0;
    if ((a.y > point.y) !== (b.y > point.y)
        && point.x < a.x + (b.x - a.x) * (point.y - a.y) / (b.y - a.y)) {
      inside = !inside;
    }
  }
  return inside ? 1 : -1;
}

function edgeIntervals(a, b, polygon) {
  const ab = vector(a, b);
  const abLength = length(ab);
  const cuts = [0, 1];
  for (let index = 0; index < polygon.length; index += 1) {
    const c = polygon[index];
    const d = polygon[(index + 1) % polygon.length];
    const cd = vector(c, d);
    const ac = vector(a, c);
    const determinant = cross(ab, cd);
    if (Math.abs(determinant) <= EPSILON * Math.max(abLength, length(cd), 1)) {
      for (const point of [c, d]) {
        if (pointOnSegment(point, a, b)) cuts.push(clamp(dot(vector(a, point), ab) / abLength ** 2, 0, 1));
      }
      continue;
    }
    const alongAB = cross(ac, cd) / determinant;
    const alongCD = cross(ac, ab) / determinant;
    if (alongAB > 0 && alongAB < 1 && alongCD >= -EPSILON && alongCD <= 1 + EPSILON) cuts.push(alongAB);
  }
  cuts.sort((first, second) => first - second);
  const midpoints = [];
  for (let index = 1; index < cuts.length; index += 1) {
    if ((cuts[index] - cuts[index - 1]) * abLength <= EPSILON) continue;
    const parameter = (cuts[index] + cuts[index - 1]) / 2;
    midpoints.push({ x: a.x + ab.x * parameter, y: a.y + ab.y * parameter });
  }
  return midpoints;
}

export function polygonContainsPolygon(plot, footprint) {
  return footprint.every((point, index) => pointLocation(point, plot) >= 0
    && edgeIntervals(point, footprint[(index + 1) % footprint.length], plot)
      .every((sample) => pointLocation(sample, plot) >= 0));
}

function distanceToSegment(point, a, b) {
  const ab = vector(a, b);
  const parameter = clamp(dot(vector(a, point), ab) / dot(ab, ab), 0, 1);
  return plotDistance(point, { x: a.x + ab.x * parameter, y: a.y + ab.y * parameter });
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(distanceToSegment(a, c, d), distanceToSegment(b, c, d), distanceToSegment(c, a, b), distanceToSegment(d, a, b));
}

function interiorSample(points) {
  const [a, b] = points;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const edge = vector(a, b);
  const edgeLength = length(edge);
  let clearance = edgeLength / 2;
  for (let index = 1; index < points.length; index += 1) {
    clearance = Math.min(clearance, distanceToSegment(mid, points[index], points[(index + 1) % points.length]));
  }
  const scale = Math.sign(signedArea(points)) * clearance / (2 * edgeLength);
  return { x: mid.x - edge.y * scale, y: mid.y + edge.x * scale };
}

export function polygonsOverlap(first, second) {
  if (first.length < 3 || second.length < 3) return false;
  const enters = (points, other) => points.some((point, index) => pointLocation(point, other) > 0
    || edgeIntervals(point, points[(index + 1) % points.length], other).some((sample) => pointLocation(sample, other) > 0));
  return enters(first, second) || enters(second, first)
    || pointLocation(interiorSample(first), second) > 0 || pointLocation(interiorSample(second), first) > 0;
}

export function plotBoundaryEdges(points, roadEdge = 0) {
  if (points.length < 3) return [];
  const index = Number.isInteger(roadEdge) && roadEdge >= 0 && roadEdge < points.length ? roadEdge : 0;
  const winding = Math.sign(signedArea(points));
  // With three or four corners, the side names follow the measured boundary order.
  const orderedSides = points.length === 3 ? ['front', 'right', 'left'] : points.length === 4 ? SIDE_KEYS : null;
  const road = vector(points[index], points[(index + 1) % points.length]);
  const inward = { x: -road.y * winding, y: road.x * winding };
  const right = { x: road.x * winding, y: road.y * winding };
  return points.map((start, edgeIndex) => {
    const end = points[(edgeIndex + 1) % points.length];
    if (orderedSides) {
      const offset = ((edgeIndex - index) * winding + points.length) % points.length;
      return { start, end, index: edgeIndex, side: orderedSides[offset] };
    }
    // For multi-segment boundaries, group edges by the closest road-relative direction.
    const edge = vector(start, end);
    const normal = { x: -edge.y * winding, y: edge.x * winding };
    const longitudinal = dot(normal, inward);
    const lateral = dot(normal, right);
    const side = Math.abs(longitudinal) >= Math.abs(lateral)
      ? longitudinal >= 0 ? 'front' : 'back'
      : lateral >= 0 ? 'left' : 'right';
    return { start, end, index: edgeIndex, side };
  });
}

function checkPlacement(plot, footprint, boundary, setbacks) {
  if (!polygonContainsPolygon(plot, footprint)) return { valid: false, message: 'The footprint must stay inside the plot boundary.' };

  for (const { start, end, side } of boundary) {
    const setback = Number(setbacks[side] ?? 0);
    if (setback <= 0) continue;
    const violatesSetback = footprint.some((point, index) => (
      segmentDistance(start, end, point, footprint[(index + 1) % footprint.length]) + EPSILON < setback
    ));
    if (violatesSetback) return { valid: false, message: `The footprint must meet the ${side} setback.` };
  }
  return { valid: true, message: '' };
}

export function validatePlacement(points, footprint, setbacks = {}, roadEdge = 0) {
  if (validatePolygon(points).status !== 'valid') return { valid: false, message: 'Complete the plot boundary before placing items.' };
  if (validatePolygon(footprint).status !== 'valid') return { valid: false, message: 'Enter valid footprint dimensions.' };
  if (SIDE_KEYS.some((side) => !Number.isFinite(Number(setbacks[side] ?? 0)) || Number(setbacks[side]) < 0)) {
    return { valid: false, message: 'Setbacks must be zero or positive distances.' };
  }
  return checkPlacement(points, footprint, plotBoundaryEdges(points, roadEdge), setbacks);
}

export function findPlacement(points, { width, depth, rotation = 0 }, setbacks = {}, roadEdge = 0, acceptPose = () => true) {
  if (validatePolygon(points).status !== 'valid' || !(width > EPSILON && depth > EPSILON)) return null;
  if ([width, depth, rotation].some((value) => !Number.isFinite(value))) return null;
  if (SIDE_KEYS.some((side) => !Number.isFinite(Number(setbacks[side] ?? 0)) || Number(setbacks[side]) < 0)) return null;

  const bounds = polygonBounds(points);
  const footprint = plotRectangle({ x: 0, y: 0, width, depth, rotation });
  const { maxX: halfWidth, maxY: halfDepth } = polygonBounds(footprint);
  const minX = bounds.minX + halfWidth;
  const maxX = bounds.maxX - halfWidth;
  const minY = bounds.minY + halfDepth;
  const maxY = bounds.maxY - halfDepth;
  if (maxX + EPSILON < minX || maxY + EPSILON < minY) return null;

  const middle = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const boundary = plotBoundaryEdges(points, roadEdge);
  const centers = [middle, interiorSample(points)];
  const samplingDivisions = 24;
  const xValues = Array.from({ length: samplingDivisions + 1 }, (_, index) => minX + (maxX - minX) * index / samplingDivisions);
  const yValues = Array.from({ length: samplingDivisions + 1 }, (_, index) => minY + (maxY - minY) * index / samplingDivisions);
  for (const { start, end, side } of boundary) {
    const setback = Number(setbacks[side] ?? 0);
    if (Math.abs(start.x - end.x) <= EPSILON) {
      xValues.push(start.x - halfWidth - setback, start.x + halfWidth + setback);
    }
    if (Math.abs(start.y - end.y) <= EPSILON) {
      yValues.push(start.y - halfDepth - setback, start.y + halfDepth + setback);
    }
  }
  for (const x of new Set(xValues)) {
    if (x < minX - EPSILON || x > maxX + EPSILON) continue;
    for (const y of new Set(yValues)) {
      if (y >= minY - EPSILON && y <= maxY + EPSILON) centers.push({ x, y });
    }
  }
  centers.sort((first, second) => plotDistance(first, middle) - plotDistance(second, middle));
  for (const center of centers) {
    const pose = { ...center, width, depth, rotation };
    const translated = footprint.map(({ x, y }) => ({ x: x + center.x, y: y + center.y }));
    if (checkPlacement(points, translated, boundary, setbacks).valid && acceptPose(pose)) return pose;
  }
  return null;
}
