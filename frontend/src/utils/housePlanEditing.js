export const ROOM_PRESETS = {
  bedroom: ['Bedroom', 12, 10],
  hall: ['Living Hall', 14, 12],
  kitchen: ['Kitchen', 10, 9],
  dining: ['Dining Room', 10, 9],
  bathroom: ['Bathroom', 6, 7],
  balcony: ['Balcony', 10, 5],
  pooja: ['Pooja Room', 6, 6],
  study: ['Study', 9, 8],
  parking: ['Covered Car Porch', 11, 15],
  staircase: ['Staircase', 7, 11],
};

export const FURNITURE_PRESETS = {
  sofa: ['Sofa', 6, 3, '#a5b9c7'],
  chair: ['Chair', 2.2, 2.2, '#b48d66'],
  table: ['Table', 4, 2.5, '#b48d66'],
  bed: ['Bed', 5.3, 6.8, '#c7d0de'],
  desk: ['Desk', 4, 2, '#a7815d'],
  plant: ['Plant', 1.6, 1.6, '#638f64'],
};

export const SIDES = ['top', 'right', 'bottom', 'left'];
export const openingList = (type) => type === 'door' ? 'doors' : 'windows';
export const openingAxis = (side) => ['top', 'bottom'].includes(side) ? 'x' : 'y';
export const openingSideLength = (room, side) => openingAxis(side) === 'x' ? room.width : room.height;
export const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
export const snapPlan = (value) => Math.round(value * 4) / 4;
export const wallLength = (wall) => Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
export const objectId = (kind) => `${kind}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export function normalizeOpening(opening, length, requestedOffset = opening.offset) {
  const margin = Math.min(0.2, length / 10);
  const width = clamp(opening.width || 3, 0.25, length - 2 * margin);
  return { ...opening, width, offset: clamp(requestedOffset ?? length / 2, width / 2 + margin, length - width / 2 - margin) };
}

export function roomOpeningAt(room, opening, side = opening.side, requestedOffset) {
  const axis = openingAxis(side);
  const length = openingSideLength(room, side);
  const { offset, x, y, ...normalized } = normalizeOpening(opening, length, requestedOffset ?? opening[axis]);
  return { ...normalized, side, [axis]: offset };
}

export function fitRoom(room, widthFt, depthFt) {
  const width = clamp(room.width, Math.min(4, widthFt), widthFt);
  const height = clamp(room.height, Math.min(4, depthFt), depthFt);
  const fitted = { ...room, width, height, x: clamp(room.x, 0, widthFt - width), y: clamp(room.y, 0, depthFt - height) };
  for (const list of ['doors', 'windows']) {
    fitted[list] = (room[list] || []).map((opening) => roomOpeningAt(fitted, opening));
  }
  return fitted;
}

export function rotateRoom(room, widthFt, depthFt) {
  const rotated = {
    ...room,
    width: room.height, height: room.width,
    x: room.x + (room.width - room.height) / 2,
    y: room.y + (room.height - room.width) / 2,
  };
  for (const list of ['doors', 'windows']) {
    rotated[list] = (room[list] || []).map((opening) => {
      const side = SIDES[(SIDES.indexOf(opening.side) + 1) % SIDES.length];
      const length = openingSideLength(room, opening.side);
      const offset = opening[openingAxis(opening.side)] ?? length / 2;
      return roomOpeningAt(rotated, opening, side, openingAxis(opening.side) === 'y' ? length - offset : offset);
    });
  }
  return fitRoom(rotated, widthFt, depthFt);
}

export function fitFurniture(item, widthFt, depthFt) {
  const radians = (item.rotation || 0) * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  let width = clamp(item.width, 0.25, widthFt);
  let depth = clamp(item.depth, 0.25, depthFt);
  const factor = Math.min(1, widthFt / (width * cos + depth * sin), depthFt / (width * sin + depth * cos));
  width *= factor;
  depth *= factor;
  const xRadius = (width * cos + depth * sin) / 2;
  const yRadius = (width * sin + depth * cos) / 2;
  return { ...item, width, depth, x: clamp(item.x, xRadius, widthFt - xRadius), y: clamp(item.y, yRadius, depthFt - yRadius) };
}

export function fitWall(wall, widthFt, depthFt) {
  const fitted = {
    ...wall,
    x1: clamp(wall.x1, 0, widthFt), y1: clamp(wall.y1, 0, depthFt),
    x2: clamp(wall.x2, 0, widthFt), y2: clamp(wall.y2, 0, depthFt),
  };
  const length = wallLength(fitted);
  if (length < 0.5) return null;
  fitted.openings = (wall.openings || []).map((opening) => normalizeOpening(opening, length));
  return fitted;
}

export function projectOntoWall(point, wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = wallLength(wall);
  if (!length) return 0;
  const offset = ((point.x - wall.x1) * dx + (point.y - wall.y1) * dy) / length;
  return clamp(offset, 0, length);
}

export function nearestRoomSide(point, room) {
  const x = point.x - room.x;
  const y = point.y - room.y;
  const distances = [Math.abs(y), Math.abs(room.width - x), Math.abs(room.height - y), Math.abs(x)];
  const index = distances.indexOf(Math.min(...distances));
  const side = SIDES[index];
  return { side, offset: openingAxis(side) === 'x' ? x : y, distance: distances[index] };
}

export function openingsConflict(openings, candidate, getOffset) {
  return openings.some((opening) => opening.id !== candidate.id
    && Math.abs(getOffset(opening) - getOffset(candidate)) < (opening.width + candidate.width) / 2 + 0.125);
}
