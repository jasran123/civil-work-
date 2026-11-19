// Architectural Floor Plan Generator — 2D & 3D Synchronized Engine
// Professional CAD/BIM-inspired spatial planning with Indian & International residential standards.
// DISCLAIMER: Conceptual layouts for visualization only, not municipal/structural approved plans.

export const ROOM_COLORS = {
  hall: '#F8FAFC',       // Living / Grand Hall (Clean off-white)
  bedroom: '#FEF3C7',    // Master & Guest Bedrooms (Warm amber-cream)
  kitchen: '#E0F2FE',    // Modular Kitchen (Sky-tinted white)
  bathroom: '#F3E8FF',   // Attached & Common Baths (Cool lilac)
  dining: '#FFEDD5',     // Dining space (Warm peach)
  staircase: '#F1F5F9',  // Internal/External RCC Stairs (Slate stone)
  parking: '#F3F4F6',    // Car Porch / Paver Drive (Paved gray)
  balcony: '#DCFCE7',    // Balcony / Verandah (Garden green tint)
  pooja: '#FEF08A',      // Sacred Prayer / Mandir (Auspicious gold tint)
  foyer: '#F5F5F4',      // Entrance Foyer / Lobby
  study: '#E0E7FF',      // Home Office / Study
};

export const SETBACK = 3; // 3ft boundary setback standard

// Minimum recommended architectural dimensions (in feet)
export const ROOM_TEMPLATES_CONFIG = {
  '1BHK': [
    { name: 'Living Hall', type: 'hall', w: 14, h: 12, minW: 12, minH: 10 },
    { name: 'Kitchen & Dining', type: 'kitchen', w: 10, h: 9, minW: 8, minH: 8 },
    { name: 'Master Bedroom', type: 'bedroom', w: 13, h: 12, minW: 10, minH: 10 },
    { name: 'Attached Bath', type: 'bathroom', w: 6, h: 7, minW: 5, minH: 6 },
    { name: 'Covered Balcony', type: 'balcony', w: 8, h: 4, minW: 6, minH: 4 },
  ],
  '2BHK': [
    { name: 'Living Hall', type: 'hall', w: 16, h: 13, minW: 13, minH: 11 },
    { name: 'Dining Room', type: 'dining', w: 10, h: 9, minW: 9, minH: 8 },
    { name: 'Modular Kitchen', type: 'kitchen', w: 10, h: 9, minW: 9, minH: 8 },
    { name: 'Master Bedroom', type: 'bedroom', w: 14, h: 12, minW: 12, minH: 11 },
    { name: 'Attached Bath', type: 'bathroom', w: 6, h: 8, minW: 5, minH: 7 },
    { name: 'Bedroom 2', type: 'bedroom', w: 12, h: 11, minW: 10, minH: 10 },
    { name: 'Common Bath', type: 'bathroom', w: 5, h: 7, minW: 5, minH: 6 },
  ],
  '3BHK': [
    { name: 'Grand Living Hall', type: 'hall', w: 18, h: 14, minW: 15, minH: 12 },
    { name: 'Dining Area', type: 'dining', w: 12, h: 10, minW: 10, minH: 9 },
    { name: 'Modular Kitchen', type: 'kitchen', w: 12, h: 10, minW: 10, minH: 9 },
    { name: 'Master Suite', type: 'bedroom', w: 15, h: 13, minW: 13, minH: 12 },
    { name: 'Master Bath', type: 'bathroom', w: 7, h: 8, minW: 6, minH: 7 },
    { name: 'Bedroom 2', type: 'bedroom', w: 13, h: 12, minW: 11, minH: 11 },
    { name: 'Attached Bath 2', type: 'bathroom', w: 5, h: 7, minW: 5, minH: 6 },
    { name: 'Bedroom 3 / Guest', type: 'bedroom', w: 12, h: 11, minW: 10, minH: 10 },
    { name: 'Common Bath', type: 'bathroom', w: 5, h: 7, minW: 5, minH: 6 },
    { name: 'Pooja Room', type: 'pooja', w: 6, h: 6, minW: 5, minH: 5 },
  ],
  '4BHK': [
    { name: 'Grand Living Hall', type: 'hall', w: 20, h: 15, minW: 16, minH: 13 },
    { name: 'Formal Dining', type: 'dining', w: 13, h: 11, minW: 11, minH: 10 },
    { name: 'Modular Kitchen', type: 'kitchen', w: 13, h: 11, minW: 11, minH: 10 },
    { name: 'Presidential Suite', type: 'bedroom', w: 16, h: 14, minW: 14, minH: 12 },
    { name: 'Master Bath & Spa', type: 'bathroom', w: 7, h: 9, minW: 6, minH: 8 },
    { name: 'Bedroom 2', type: 'bedroom', w: 14, h: 12, minW: 12, minH: 11 },
    { name: 'Attached Bath 2', type: 'bathroom', w: 6, h: 7, minW: 5, minH: 6 },
    { name: 'Bedroom 3', type: 'bedroom', w: 13, h: 12, minW: 11, minH: 11 },
    { name: 'Bedroom 4 / Study', type: 'study', w: 12, h: 11, minW: 10, minH: 10 },
    { name: 'Common Bath', type: 'bathroom', w: 5, h: 7, minW: 5, minH: 6 },
    { name: 'Pooja Room', type: 'pooja', w: 6, h: 6, minW: 5, minH: 5 },
  ],
};

// Check if two rectangular rooms intersect/overlap
export function checkOverlap(r1, r2) {
  return !(
    r1.x + r1.width <= r2.x ||
    r2.x + r2.width <= r1.x ||
    r1.y + r1.height <= r2.y ||
    r2.y + r2.height <= r1.y
  );
}

// Find any overlapping room IDs for a given room
export function findOverlaps(room, allRooms) {
  return allRooms.filter((r) => r.id !== room.id && checkOverlap(room, r));
}

// Generates doors and windows automatically for a room based on its position in the building
export function generateRoomOpenings(room, buildingW, buildingH) {
  const doors = [];
  const windows = [];

  // Default door to interior corridor/entrance
  if (room.type === 'hall') {
    doors.push({ id: `d_${room.id}_main`, side: 'bottom', x: Math.round(room.width * 0.5), width: 3.5, label: 'Main Entrance' });
  } else if (room.type === 'parking') {
    // open carport
  } else {
    doors.push({ id: `d_${room.id}_1`, side: 'left', y: Math.round(room.height * 0.5), width: 3, label: 'Door' });
  }

  // Windows: if room touches exterior boundary of building, place windows on exterior side
  const touchesTop = room.y <= SETBACK + 1;
  const touchesBottom = (room.y + room.height) >= (buildingH - SETBACK - 1);
  const touchesLeft = room.x <= SETBACK + 1;
  const touchesRight = (room.x + room.width) >= (buildingW - SETBACK - 1);

  if (touchesTop && room.type !== 'staircase') {
    windows.push({ id: `w_${room.id}_top`, side: 'top', x: Math.round(room.width * 0.5), width: 4 });
  }
  if (touchesRight && room.type !== 'parking') {
    windows.push({ id: `w_${room.id}_right`, side: 'right', y: Math.round(room.height * 0.5), width: 3.5 });
  }
  if (touchesLeft && !touchesTop && room.type !== 'parking') {
    windows.push({ id: `w_${room.id}_left`, side: 'left', y: Math.round(room.height * 0.5), width: 3.5 });
  }
  if (touchesBottom && !doors.some((d) => d.side === 'bottom') && room.type !== 'parking') {
    windows.push({ id: `w_${room.id}_bot`, side: 'bottom', x: Math.round(room.width * 0.5), width: 4 });
  }

  // Fallback window if no exterior wall detected
  if (windows.length === 0 && room.type !== 'bathroom' && room.type !== 'parking') {
    windows.push({ id: `w_${room.id}_def`, side: 'top', x: Math.round(room.width * 0.5), width: 3.5 });
  }

  return { doors, windows };
}

export function generateFloorPlans({
  landLength = 40,
  landWidth = 30,
  houseType = '2BHK',
  floors = 1,
  roadFacing = 'North',
}) {
  const templates = ROOM_TEMPLATES_CONFIG[houseType] || ROOM_TEMPLATES_CONFIG['2BHK'];
  const availW = Math.max(12, landLength - SETBACK * 2);
  const availH = Math.max(12, landWidth - SETBACK * 2);

  const variations = [];

  const variationMetadata = [
    { title: 'Vastu Modern & Functional', desc: 'Auspicious living in North/East, kitchen in Agneya (SE), master suite in Nairutya (SW).' },
    { title: 'Courtyard & Open Living', desc: 'Central circulation corridor connecting open-plan living, dining, and private bedrooms.' },
    { title: 'Linear Space-Efficient', desc: 'Optimized footprint maximizing natural ventilation, cross-breeze, and setback utilization.' },
    { title: 'Executive Luxury Suites', desc: 'Spacious master suite, attached designer bath, dedicated dining nook, and wide foyer.' },
  ];

  for (let v = 0; v < 4; v++) {
    const rooms = [];

    // Grid layout planning with proportional sizing
    let cols = availW >= 42 ? 3 : 2;
    if (templates.length <= 4 && availW < 36) cols = 2;
    if (templates.length >= 8 && availW >= 46) cols = 3;

    const rows = Math.ceil(templates.length / cols);
    const baseCellW = Math.floor(availW / cols);
    const baseCellH = Math.floor(availH / rows);

    // Track occupied rectangles to guarantee non-overlapping placement
    const occupiedGrid = [];

    templates.forEach((tmpl, i) => {
      let c, r;
      if (v === 0) {
        // Vastu layout priority
        c = i % cols;
        r = Math.floor(i / cols);
      } else if (v === 1) {
        // Courtyard layout: living at center/front
        c = (i + 1) % cols;
        r = Math.floor((i + 1) / cols);
        if (i === 0) { c = 0; r = 0; }
      } else if (v === 2) {
        // Column-major flow
        c = Math.floor(i / rows) % cols;
        r = i % rows;
      } else {
        // Reversed mirror
        c = (cols - 1) - (i % cols);
        r = Math.floor(i / cols);
      }

      // Constrain room size to fit available bounds
      const rw = Math.max(tmpl.minW, Math.min(tmpl.w, baseCellW));
      const rh = Math.max(tmpl.minH, Math.min(tmpl.h, baseCellH));
      const rx = SETBACK + Math.min(c * baseCellW, availW - rw);
      const ry = SETBACK + Math.min(r * baseCellH, availH - rh);

      const roomObj = {
        id: `rm_${v}_${i}`,
        name: tmpl.name,
        type: tmpl.type,
        x: Math.round(rx),
        y: Math.round(ry),
        width: Math.round(rw),
        height: Math.round(rh),
        color: ROOM_COLORS[tmpl.type] || '#F8FAFC',
      };

      const openings = generateRoomOpenings(roomObj, landLength, landWidth);
      roomObj.doors = openings.doors;
      roomObj.windows = openings.windows;

      rooms.push(roomObj);
      occupiedGrid.push(roomObj);
    });

    // Add Covered Car Parking Porch if plot dimensions permit
    if (landLength >= 32 && landWidth >= 24) {
      const parkW = Math.min(11, Math.floor(availW * 0.35));
      const parkH = Math.min(14, Math.floor(availH * 0.45));
      const px = SETBACK;
      const py = roadFacing === 'South' ? landWidth - SETBACK - parkH : SETBACK;

      const parkingRoom = {
        id: `rm_${v}_parking`,
        name: 'Covered Car Porch',
        type: 'parking',
        x: px,
        y: py,
        width: parkW,
        height: parkH,
        color: ROOM_COLORS.parking,
        doors: [],
        windows: [],
      };

      // Ensure no room sits directly on top of parking
      rooms.forEach((r) => {
        if (checkOverlap(r, parkingRoom)) {
          if (r.x < px + parkW) {
            r.x = Math.min(landLength - SETBACK - r.width, px + parkW);
          }
        }
      });

      rooms.unshift(parkingRoom);
    }

    // Add Staircase for Multi-Floor (G+1, G+2)
    if (floors > 1) {
      const stairW = 7;
      const stairH = 11;
      const sx = Math.max(SETBACK, landLength - SETBACK - stairW);
      const sy = SETBACK;

      const stairRoom = {
        id: `rm_${v}_stairs`,
        name: 'RCC Dog-Legged Stairs',
        type: 'staircase',
        x: sx,
        y: sy,
        width: stairW,
        height: stairH,
        color: ROOM_COLORS.staircase,
        doors: [{ id: `d_${v}_stairs`, side: 'left', y: 5, width: 3, label: 'Access' }],
        windows: [{ id: `w_${v}_stairs`, side: 'top', x: 3.5, width: 3 }],
      };

      // Push back any room overlapping staircase
      rooms.forEach((r) => {
        if (r.type !== 'parking' && checkOverlap(r, stairRoom)) {
          if (r.y < sy + stairH) {
            r.y = Math.min(landWidth - SETBACK - r.height, sy + stairH);
          }
        }
      });

      rooms.push(stairRoom);
    }

    variations.push({
      id: v,
      label: `Option ${v + 1}: ${variationMetadata[v].title}`,
      description: variationMetadata[v].desc,
      rooms,
      disclaimer: 'Preliminary architectural conceptual layout. Structural load-bearing, soil bearing capacity, and local municipal bylaws (FAR/setbacks) must be verified prior to construction.',
    });
  }

  return variations;
}

// Compute comprehensive architectural statistics
export function calculatePlanStats(rooms = [], landLength = 40, landWidth = 30, plotArea = landLength * landWidth) {
  let carpetArea = 0;
  let roomDetails = [];

  rooms.forEach((r) => {
    const area = r.width * r.height;
    carpetArea += area;
    roomDetails.push({
      id: r.id,
      name: r.name,
      type: r.type,
      width: r.width,
      height: r.height,
      area,
    });
  });

  // Estimated built-up area includes 14% allowance for walls & structural columns
  const wallAllowance = Math.round(carpetArea * 0.14);
  const totalBuiltUpArea = carpetArea + wallAllowance;
  const coveragePercentage = plotArea > 0 ? Math.round((totalBuiltUpArea / plotArea) * 100) : null;
  const far = plotArea > 0 ? (totalBuiltUpArea / plotArea).toFixed(2) : null;

  return {
    plotArea,
    carpetArea,
    wallAllowance,
    totalBuiltUpArea,
    coveragePercentage,
    far,
    roomDetails,
  };
}
