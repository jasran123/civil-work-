import {
  findPlacement,
  plotDistance,
  plotRectangle,
  polygonArea,
  polygonsOverlap,
  solvePlot,
  validatePlacement,
  validatePolygon,
} from './plotGeometry.js';
import { getFloorDetails, getFloorLayouts } from './projectState.js';
export { fromFeet, toFeet } from './plotGeometry.js';

export const PLOT_SHAPES = {
  rectangle: 'Rectangle',
  square: 'Square',
  trapezoid: 'Trapezoid',
  triangle: 'Triangle',
  'l-shape': 'L-shaped',
  irregular: 'Irregular',
};

export const SITE_FEATURES = {
  parking: { label: 'Parking', width: 9, depth: 18 },
  garden: { label: 'Garden', width: 8, depth: 8 },
  wall: { label: 'Compound wall', width: 10, depth: 0.5 },
};

export const cornerName = (index) => index < 26 ? String.fromCharCode(65 + index) : `P${index + 1}`;
export const edgeName = (index, count) => `${cornerName(index)}–${cornerName((index + 1) % count)}`;

export function getProjectPlot(design) {
  if (design.plot) return design.plot;
  const front = design.landWidth || 30;
  const depth = design.landLength || 40;
  const roadBearing = Math.max(0, ['North', 'East', 'South', 'West'].indexOf(design.roadFacing)) * 90;
  return {
    shape: front === depth ? 'square' : 'rectangle',
    source: 'measurements',
    unit: 'ft',
    sides: { front, back: front, left: depth, right: depth },
    angles: {},
    diagonal: {},
    diagonalLayout: 'auto',
    points: [],
    frontEdge: 0,
    northAngle: (360 - roadBearing) % 360,
    wallEnabled: true,
    wallHeight: 5,
    gate: { enabled: true, width: Math.min(10, front * 0.5), offset: 0.5 },
    setbacks: { front: 3, back: 3, left: 3, right: 3 },
    house: null,
    features: [],
  };
}

export function getPlotResult(plot) {
  if (plot.source === 'measurements') return solvePlot(plot);
  if (plot.points.some(({ x, y }) => x == null || y == null)) {
    return { status: 'insufficient', points: [], message: 'Enter both coordinates for each corner.' };
  }
  return validatePolygon(plot.points);
}

export function getRoadEdge(plot, points) {
  return Math.max(0, Math.min(points.length - 1, plot.frontEdge || 0));
}

export function getRoadDirection(points, frontEdge, northAngle) {
  const a = points[frontEdge];
  const b = points[(frontEdge + 1) % points.length];
  const signedArea = points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + (point.x - a.x) * (next.y - a.y) - (point.y - a.y) * (next.x - a.x);
  }, 0);
  const orientation = Math.sign(signedArea);
  const bearing = Math.atan2((b.y - a.y) * orientation, (b.x - a.x) * orientation) * 180 / Math.PI;
  const index = ((Math.round((bearing - northAngle) / 90) % 4) + 4) % 4;
  return ['North', 'East', 'South', 'West'][index];
}

export function getHouseTemplate(design) {
  const sourceLayouts = getFloorLayouts(design).map((floor) => floor.filter((room) => room
    && [room.x, room.y, room.width, room.height].every(Number.isFinite) && room.width > 0 && room.height > 0));
  const sourceDetails = getFloorDetails(design).map((floor) => ({
    ...floor,
    walls: floor.walls.filter((wall) => wall && [wall.x1, wall.y1, wall.x2, wall.y2].every(Number.isFinite)),
    furniture: floor.furniture.filter((item) => item && [item.x, item.y, item.width, item.depth].every(Number.isFinite)
      && item.width > 0 && item.depth > 0),
  }));
  const points = sourceLayouts.flatMap((floor) => floor.flatMap((room) => [
    { x: room.x, y: room.y }, { x: room.x + room.width, y: room.y + room.height },
  ]));
  for (const { walls, furniture } of sourceDetails) {
    for (const wall of walls) {
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const span = Math.hypot(dx, dy);
      if (span < 0.2) continue;
      const half = (Number.isFinite(wall.thickness) ? Math.max(0.05, Math.min(4, wall.thickness)) : 0.35) / 2;
      for (const [x, y] of [[wall.x1, wall.y1], [wall.x2, wall.y2]]) {
        points.push({ x: x - dy / span * half, y: y + dx / span * half }, { x: x + dy / span * half, y: y - dx / span * half });
      }
    }
    for (const item of furniture) points.push(...plotRectangle({ ...item, rotation: Number.isFinite(item.rotation) ? item.rotation : 0 }));
  }

  if (!points.length) return null;
  const allowance = 0.25;
  const minX = Math.min(...points.map(({ x }) => x)) - allowance;
  const minY = Math.min(...points.map(({ y }) => y)) - allowance;
  const floorLayouts = sourceLayouts.map((floor) => floor.map((room) => ({ ...room, x: room.x - minX, y: room.y - minY })));
  const floorDetails = sourceDetails.map((floor) => ({
    ...floor,
    walls: floor.walls.map((wall) => ({ ...wall, x1: wall.x1 - minX, x2: wall.x2 - minX, y1: wall.y1 - minY, y2: wall.y2 - minY })),
    furniture: floor.furniture.map((item) => ({ ...item, x: item.x - minX, y: item.y - minY })),
  }));
  return {
    width: Math.max(...points.map(({ x }) => x)) + allowance - minX,
    depth: Math.max(...points.map(({ y }) => y)) + allowance - minY,
    rooms: floorLayouts[0],
    floorLayouts,
    floorDetails,
  };
}

export function getSiteItems(plot, houseTemplate) {
  const house = plot.house && houseTemplate && { ...plot.house, ...houseTemplate, id: 'house', kind: 'house', label: 'House' };
  return [house, ...plot.features].filter(Boolean).map((item) => ({
    ...item,
    points: plotRectangle(item),
    position: { x: item.x, y: item.y },
  }));
}

export function checkSiteItem(points, candidate, plot, items) {
  if (![candidate.x, candidate.y, candidate.rotation, candidate.width, candidate.depth].every(Number.isFinite) || candidate.width <= 0 || candidate.depth <= 0) {
    return { valid: false, message: 'Enter a position, rotation and positive footprint dimensions.' };
  }
  const footprint = plotRectangle(candidate);
  const edge = getRoadEdge(plot, points);
  const fit = validatePlacement(points, footprint, candidate.kind === 'house' ? plot.setbacks : {}, edge);
  if (!fit.valid) return fit;
  const collision = items.find((item) => item.id !== candidate.id && polygonsOverlap(footprint, item.points));
  return collision ? { valid: false, message: `${candidate.label} overlaps ${collision.label.toLowerCase()}.` } : fit;
}

export function validateSite(points, plot, houseTemplate) {
  const items = getSiteItems(plot, houseTemplate);
  for (const item of items) {
    const fit = checkSiteItem(points, item, plot, items);
    if (!fit.valid) return { ...fit, item };
  }
  return { valid: true };
}

export function findSiteItem(points, item, plot, items) {
  const setbacks = item.kind === 'house' ? plot.setbacks : {};
  const orientations = new Set([0, 90]);
  points.forEach((point, index) => {
    const end = points[(index + 1) % points.length];
    const bearing = Math.atan2(end.y - point.y, end.x - point.x) * 180 / Math.PI;
    orientations.add((bearing + 180) % 180);
    orientations.add((bearing + 270) % 180);
  });
  for (const rotation of orientations) {
    const dimensions = { ...item, rotation };
    const pose = findPlacement(points, dimensions, setbacks, getRoadEdge(plot, points), (candidate) =>
      checkSiteItem(points, { ...dimensions, ...candidate }, plot, items).valid,
    );
    if (pose && checkSiteItem(points, { ...dimensions, ...pose }, plot, items).valid) return { ...dimensions, ...pose };
  }
  return null;
}

export function getPlotSceneData(design, plot = design.plot, result = plot && getPlotResult(plot), siteItems) {
  if (result?.status !== 'valid') return null;
  const { points } = result;
  const frontEdge = getRoadEdge(plot, points);
  const items = siteItems ?? getSiteItems(plot, getHouseTemplate(design));
  const frontLength = plotDistance(points[frontEdge], points[(frontEdge + 1) % points.length]);
  return {
    points,
    frontEdge,
    wallEnabled: plot.wallEnabled,
    wallHeight: plot.wallHeight,
    gate: { ...plot.gate, enabled: plot.gate.enabled && plot.gate.width <= frontLength },
    northAngle: plot.northAngle,
    items: items.filter((item) => checkSiteItem(points, item, plot, items).valid),
    design,
  };
}

export function getDesignPlotArea(design) {
  if (!design.plot) return design.landArea ?? (design.landLength || 40) * (design.landWidth || 30);
  const result = getPlotResult(design.plot);
  return result.status === 'valid' ? polygonArea(result.points) : null;
}

export function describeDesignPlot(design, area = getDesignPlotArea(design)) {
  if (area == null) return 'Additional measurements required';
  const name = design.plot ? (design.plot.source === 'measurements' && PLOT_SHAPES[design.plot.shape]) || 'Custom plot' : `${design.landLength}' × ${design.landWidth}'`;
  return `${name} (${area.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq.ft)`;
}
