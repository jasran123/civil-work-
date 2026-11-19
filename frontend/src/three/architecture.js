export const DEFAULT_FLOOR_HEIGHT = 10;
export const FLOOR_SLAB_THICKNESS = 0.36;
export const WALK_EYE_HEIGHT = 5.45;
export const WALL_THICKNESS = 0.28;

const EPSILON = 1e-5;
const limit = (value, min, max) => Math.min(max, Math.max(min, value));
const isRoom = (room) => room && [room.x, room.y, room.width, room.height].every(Number.isFinite)
  && room.width > EPSILON && room.height > EPSILON;

export function getFloorLevels(count, floorHeight = DEFAULT_FLOOR_HEIGHT, floorHeights = []) {
  let elevation = 0;
  const standard = Number.isFinite(floorHeight) ? limit(floorHeight, 7, 24) : DEFAULT_FLOOR_HEIGHT;
  return Array.from({ length: Math.max(1, count || 1) }, (_, index) => {
    const height = Number.isFinite(floorHeights?.[index]) ? limit(floorHeights[index], 7, 24) : standard;
    const level = { elevation, height, clearHeight: height - FLOOR_SLAB_THICKNESS };
    elevation += height;
    return level;
  });
}

export function getBuildingLayouts(floorLayouts, legacyRooms, floors) {
  const count = Math.max(1, Number(floors) || 1, floorLayouts?.length || 0);
  return Array.from({ length: count }, (_, index) => {
    const source = Array.isArray(floorLayouts?.[index]) ? floorLayouts[index] : legacyRooms;
    return Array.isArray(source) ? source.filter(isRoom) : [];
  });
}

export function getLastOccupiedFloor(layouts = [], details = []) {
  for (let index = Math.max(layouts.length, details.length) - 1; index >= 0; index -= 1) {
    if (layouts[index]?.length || details[index]?.walls?.length || details[index]?.furniture?.length) return index;
  }
  return -1;
}

export function getRoomBounds(rooms) {
  if (!rooms.length) return null;
  const x = Math.min(...rooms.map((room) => room.x));
  const y = Math.min(...rooms.map((room) => room.y));
  const maxX = Math.max(...rooms.map((room) => room.x + room.width));
  const maxY = Math.max(...rooms.map((room) => room.y + room.height));
  return { x, y, width: maxX - x, height: maxY - y };
}

// The stair opening follows the upper flight and leaves a landing for the incoming floor.
export function getStairOpening(room) {
  if (room.type !== 'staircase' || room.width < 2 || room.height < 3) return null;
  return {
    x: room.x + room.width * 0.49,
    y: room.y + room.height * 0.08,
    width: room.width * 0.47,
    height: room.height * 0.64,
  };
}

function subtractRectangle(area, cut) {
  const endX = area.x + area.width;
  const endY = area.y + area.height;
  const x0 = Math.max(area.x, cut.x);
  const y0 = Math.max(area.y, cut.y);
  const x1 = Math.min(endX, cut.x + cut.width);
  const y1 = Math.min(endY, cut.y + cut.height);
  if (x1 - x0 <= EPSILON || y1 - y0 <= EPSILON) return [area];
  return [
    { x: area.x, y: area.y, width: x0 - area.x, height: area.height },
    { x: x1, y: area.y, width: endX - x1, height: area.height },
    { x: x0, y: area.y, width: x1 - x0, height: y0 - area.y },
    { x: x0, y: y1, width: x1 - x0, height: endY - y1 },
  ].filter((section) => section.width > EPSILON && section.height > EPSILON);
}

export function cutSurface(area, blockers) {
  return blockers.reduce((sections, blocker) => sections.flatMap((section) => subtractRectangle(section, blocker)), [area]);
}

export function getFloorSurfaces(rooms, previousRooms = []) {
  const openings = previousRooms.map(getStairOpening).filter(Boolean);
  const occupied = [];
  return rooms.flatMap((room) => {
    const sections = cutSurface(room, [...openings, ...occupied]);
    occupied.push(room);
    return sections.map((section) => ({ ...section, room }));
  });
}

const SIDE_DEFINITIONS = [
  { name: 'top', horizontal: true, end: false },
  { name: 'bottom', horizontal: true, end: true },
  { name: 'left', horizontal: false, end: false },
  { name: 'right', horizontal: false, end: true },
];

function getOpening(opening, center, start, end, wallHeight) {
  const door = opening.type === 'door';
  const width = limit(Number(opening.width) || (door ? 3 : 3.5), 0.35, 20);
  const sill = door ? 0 : limit(Number.isFinite(opening.sill) ? opening.sill : 3, 0.1, wallHeight - 0.25);
  const height = Number(opening.height) || (door ? 7 : 4.15);
  const offset = Number.isFinite(center) ? center : (start + end) / 2;
  const low = Math.max(start + 0.08, offset - width / 2);
  const high = Math.min(end - 0.08, offset + width / 2);
  const top = Math.min(wallHeight - 0.12, sill + Math.max(0.3, height));
  if (high - low < 0.22 || top - sill < 0.15) return null;
  return { ...opening, low, high, sill, top, type: door ? 'door' : 'window' };
}

function compareOpening(first, second) {
  if (first.type === second.type) return (second.high - second.low) - (first.high - first.low);
  return first.type === 'door' ? -1 : 1;
}

function deduplicateOpenings(openings) {
  const resolved = [];
  openings.filter(Boolean).sort(compareOpening).forEach((opening) => {
    // A shared partition may be represented by each adjacent room. One aperture serves both.
    const conflict = resolved.some((current) => opening.low < current.high - EPSILON
      && opening.high > current.low + EPSILON && opening.sill < current.top - EPSILON && opening.top > current.sill + EPSILON);
    if (!conflict) resolved.push(opening);
  });
  return resolved;
}

function partitionPanels(spans, openings, fullHeight, shownHeight) {
  const positions = new Set(spans.flatMap((span) => [span.start, span.end]));
  openings.forEach(({ low, high }) => { positions.add(low); positions.add(high); });
  const breaks = [...positions].sort((a, b) => a - b);
  const panels = [];
  breaks.slice(0, -1).forEach((start, index) => {
    const end = breaks[index + 1];
    const middle = (start + end) / 2;
    const owner = spans.find((span) => middle >= span.start && middle <= span.end && span.color)
      || spans.find((span) => middle >= span.start && middle <= span.end);
    if (!owner || end - start <= EPSILON) return;
    const gaps = openings.filter((opening) => middle > opening.low && middle < opening.high).sort((a, b) => a.sill - b.sill);
    let bottom = 0;
    for (const gap of gaps) {
      const top = Math.min(gap.sill, shownHeight);
      if (top - bottom > EPSILON) panels.push({ start, end, bottom, top, owner });
      bottom = Math.max(bottom, gap.top);
      if (bottom >= shownHeight) break;
    }
    if (shownHeight - bottom > EPSILON) panels.push({ start, end, bottom, top: Math.min(shownHeight, fullHeight), owner });
  });
  return panels;
}

export function getRoomPartitions(rooms, fullHeight, shownHeight = fullHeight) {
  const lines = new Map();
  for (const room of rooms) {
    if (room.type === 'balcony' || room.type === 'parking') continue;
    for (const { name, horizontal, end } of SIDE_DEFINITIONS) {
      const start = horizontal ? room.x : room.y;
      const length = horizontal ? room.width : room.height;
      const coordinate = horizontal ? room.y + (end ? room.height : 0) : room.x + (end ? room.width : 0);
      const at = Math.round(coordinate / EPSILON) * EPSILON;
      const key = `${horizontal}:${at}`;
      const line = lines.get(key) || { horizontal, coordinate: at, spans: [], openings: [] };
      line.spans.push({ start, end: start + length, id: room.id, color: room.wallColor });
      const apertures = [...(room.doors || []).map((opening) => ({ ...opening, type: 'door' })),
        ...(room.windows || []).map((opening) => ({ ...opening, type: 'window' }))];
      apertures.filter((opening) => opening.side === name).forEach((opening) => {
        const offset = horizontal ? opening.x : opening.y;
        const center = start + (Number.isFinite(offset) ? offset : length / 2);
        line.openings.push(getOpening(opening, center, start, start + length, fullHeight));
      });
      lines.set(key, line);
    }
  }
  return [...lines.values()].map((line) => {
    const openings = deduplicateOpenings(line.openings);
    return { ...line, openings, panels: partitionPanels(line.spans, openings, fullHeight, shownHeight) };
  });
}

export function getCustomPartition(wall, clearHeight, shownHeight) {
  if (![wall.x1, wall.x2, wall.y1, wall.y2].every(Number.isFinite)) return null;
  const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  if (length < 0.2) return null;
  const height = Number.isFinite(wall.height) ? limit(wall.height, 0.3, clearHeight) : clearHeight;
  const openings = deduplicateOpenings((wall.openings || []).map((opening) => getOpening(opening, opening.offset, 0, length, height)));
  const spans = [{ start: 0, end: length, id: wall.id, color: wall.color }];
  const thickness = Number.isFinite(wall.thickness) ? limit(wall.thickness, 0.05, 4) : 0.35;
  return { openings, panels: partitionPanels(spans, openings, height, Math.min(height, shownHeight)), thickness };
}
