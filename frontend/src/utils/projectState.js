export const GUEST_PROJECT_KEY = 'dream-home-3d-project';

const EMPTY_ROOMS = [];
const HISTORY_LIMIT = 80;
const DEFAULT_DESIGN = {
  projectName: 'Untitled House Plan',
  landLength: 40,
  landWidth: 30,
  landArea: 1200,
  plot: null,
  roadFacing: 'North',
  floors: 1,
  activeFloor: 0,
  houseType: '2BHK',
  budget: 2500000,
  rooms: EMPTY_ROOMS,
  currentPlanIndex: 0,
  plans: [],
  wallColor: '#FFFFFF',
  floorColor: '#D2B48C',
  roofStyle: 'flat',
  roofColor: '#8B4513',
  showFurniture: true,
  dayMode: true,
};

function countFloors(design) {
  const floors = Number(design.floors);
  return Number.isFinite(floors) && floors > 0 ? Math.max(1, Math.floor(floors)) : design.floorLayouts?.length || 1;
}

function copyRooms(rooms) {
  return rooms.map((room) => ({
    ...room,
    doors: (room.doors || []).map((door) => ({ ...door })),
    windows: (room.windows || []).map((window) => ({ ...window })),
  }));
}

export function getFloorLayouts(design) {
  const count = countFloors(design);
  if (Array.isArray(design.floorLayouts)) {
    if (design.floorLayouts.length === count && design.floorLayouts.every(Array.isArray)) return design.floorLayouts;
    return Array.from({ length: count }, (_, index) => Array.isArray(design.floorLayouts[index]) ? design.floorLayouts[index] : EMPTY_ROOMS);
  }
  const rooms = design.rooms?.length ? design.rooms : design.plans?.[design.currentPlanIndex || 0]?.rooms || EMPTY_ROOMS;
  return Array.from({ length: count }, (_, index) => index === 0 ? rooms : copyRooms(rooms));
}

export function getFloorDetails(design) {
  const count = countFloors(design);
  const { floorDetails } = design;
  if (Array.isArray(floorDetails) && floorDetails.length === count && floorDetails.every((floor) => Array.isArray(floor?.walls) && Array.isArray(floor?.furniture))) {
    return floorDetails;
  }
  return Array.from({ length: count }, (_, index) => {
    const floor = floorDetails?.[index];
    return {
      ...floor,
      walls: Array.isArray(floor?.walls) ? floor.walls : [],
      furniture: Array.isArray(floor?.furniture) ? floor.furniture : [],
    };
  });
}

export function floorLabel(floor) {
  return ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'][floor] || `Floor ${floor}`;
}

function normalizeProject(design) {
  const floorLayouts = getFloorLayouts(design);
  const active = Math.floor(design.activeFloor) || 0;
  return {
    ...design,
    floors: floorLayouts.length,
    activeFloor: Math.min(Math.max(active, 0), floorLayouts.length - 1),
    rooms: floorLayouts[0],
    floorLayouts,
    floorDetails: getFloorDetails(design),
  };
}

export function openProjectData(project = {}) {
  if (!project || typeof project !== 'object') project = {};
  const design = { ...DEFAULT_DESIGN };
  for (const key of [
    ...Object.keys(DEFAULT_DESIGN), 'floorLayouts', 'floorDetails', 'houseView', 'lighting', 'furnitureTheme',
    'wallMaterial', 'floorMaterial', 'ceilingMaterial', 'ceilingColor', 'costEstimate',
  ]) {
    if (project[key] !== undefined) design[key] = project[key];
  }
  const explicitName = project.projectName ?? project.name;
  if (typeof explicitName === 'string' && explicitName.trim()) design.projectName = explicitName;
  else design.projectName = DEFAULT_DESIGN.projectName;
  if (!Array.isArray(design.plans)) design.plans = [];
  if (project.landArea === undefined) design.landArea = design.plot ? null : design.landLength * design.landWidth;
  if (project.floors == null && project.floorLayouts?.length) design.floors = project.floorLayouts.length;
  return normalizeProject(design);
}

export function patchProject(design, updates) {
  if (!updates || !Object.keys(updates).some((key) => !Object.is(design[key], updates[key]))) return design;
  const next = { ...design, ...updates };
  if ('rooms' in updates && !('floorLayouts' in updates)) {
    const rooms = updates.rooms || EMPTY_ROOMS;
    const oldLayouts = getFloorLayouts(design);
    if (rooms.length && (updates.plans?.length || 0) > 0 && !oldLayouts.some((floor) => floor.length)) {
      const count = countFloors(next);
      next.floorLayouts = Array.from({ length: count }, (_, index) => {
        if (index === 0) return rooms;
        const variant = next.plans[(next.currentPlanIndex + index) % next.plans.length]?.rooms || rooms;
        return copyRooms(variant.filter((room) => room.type !== 'parking'));
      });
    } else {
      next.floorLayouts = [rooms, ...oldLayouts.slice(1)];
    }
  }
  return normalizeProject(next);
}

function updateFloorRooms(design, index, updater, updateVariant = true) {
  const current = design.floorLayouts[index];
  if (!current) return design;
  const rooms = typeof updater === 'function' ? updater(current) : updater;
  if (Object.is(rooms, current) || !Array.isArray(rooms)) return design;
  const floorLayouts = design.floorLayouts.map((floor, floorIndex) => floorIndex === index ? rooms : floor);
  const plans = index === 0 && updateVariant
    ? design.plans.map((plan, planIndex) => planIndex === design.currentPlanIndex ? { ...plan, rooms } : plan)
    : design.plans;
  return patchProject(design, { floorLayouts, plans });
}

function updateFloorDetails(design, index, updater) {
  const current = design.floorDetails[index];
  if (!current) return design;
  const updates = typeof updater === 'function' ? updater(current) : updater;
  if (!updates || !Object.keys(updates).some((key) => !Object.is(current[key], updates[key]))) return design;
  const floorDetails = design.floorDetails.map((floor, floorIndex) => floorIndex === index ? { ...floor, ...updates } : floor);
  return patchProject(design, { floorDetails });
}

export function startProjectHistory(project) {
  return { design: openProjectData(project), past: [], future: [], group: null };
}

function record(state, design, history = true) {
  if (state.design === design) return state;
  if (!history) return { ...state, design };
  if (state.group) return { ...state, design, group: { ...state.group, changed: true } };
  return { ...state, design, past: [...state.past, state.design].slice(-HISTORY_LIMIT), future: [] };
}

function finishGroup(state) {
  if (!state.group) return state;
  const { before, changed } = state.group;
  return {
    ...state,
    group: null,
    past: changed ? [...state.past, before].slice(-HISTORY_LIMIT) : state.past,
    future: changed ? [] : state.future,
  };
}

export function projectReducer(state, action) {
  const { design } = state;
  switch (action.type) {
    case 'open':
      return startProjectHistory(action.project);
    case 'patch':
      return record(state, patchProject(design, typeof action.updates === 'function' ? action.updates(design) : action.updates), action.history);
    case 'floorRooms':
      return record(state, updateFloorRooms(design, action.index, action.rooms), action.history);
    case 'floorDetails':
      return record(state, updateFloorDetails(design, action.index, action.updates), action.history);
    case 'activeFloor':
      return record(state, patchProject(design, { activeFloor: action.index }), false);
    case 'addFloor':
      return record(state, patchProject(design, { floors: design.floors + 1, activeFloor: design.floors }));
    case 'selectPlan': {
      const rooms = design.plans[action.index]?.rooms;
      if (!rooms || action.index === design.currentPlanIndex) return state;
      const selected = updateFloorRooms(design, 0, rooms, false);
      return record(state, patchProject(selected, { currentPlanIndex: action.index }));
    }
    case 'beginGroup':
      return state.group ? state : { ...state, group: { before: design, changed: false } };
    case 'endGroup':
      return finishGroup(state);
    case 'undo': {
      const ended = finishGroup(state);
      if (!ended.past.length) return ended;
      return { ...ended, design: ended.past.at(-1), past: ended.past.slice(0, -1), future: [ended.design, ...ended.future] };
    }
    case 'redo': {
      const ended = finishGroup(state);
      if (!ended.future.length) return ended;
      return { ...ended, design: ended.future[0], future: ended.future.slice(1), past: [...ended.past, ended.design].slice(-HISTORY_LIMIT) };
    }
    default:
      return state;
  }
}

export function makeProjectDocument(design, costEstimate = design.costEstimate) {
  const { projectName, ...document } = openProjectData(design);
  const name = projectName.trim() || DEFAULT_DESIGN.projectName;
  return { ...document, name, ...(costEstimate ? { costEstimate } : {}) };
}

export function downloadProject(design) {
  const project = makeProjectDocument(design);
  const file = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'House-Plan'}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
