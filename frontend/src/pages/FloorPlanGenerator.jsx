import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiDownload, HiRefresh, HiZoomIn, HiZoomOut } from 'react-icons/hi';
import FloorPlanInspector, { deletePlanObject, findPlanObject } from '../components/FloorPlanInspector';
import HousePlanDrawing from '../components/HousePlanDrawing';
import { useDesign } from '../context/DesignContext';
import { checkOverlap, calculatePlanStats, generateFloorPlans, ROOM_COLORS } from '../utils/floorPlanGenerator';
import {
  clamp, fitFurniture, fitRoom, fitWall, FURNITURE_PRESETS, nearestRoomSide, normalizeOpening, objectId,
  openingAxis, openingList, openingSideLength, openingsConflict, projectOntoWall, roomOpeningAt, ROOM_PRESETS,
  snapPlan, wallLength,
} from '../utils/housePlanEditing';
import { describeDesignPlot, getDesignPlotArea } from '../utils/plotProject';
import { floorLabel, getFloorDetails, getFloorLayouts } from '../utils/projectState';
import { exportFloorPlanPDF, exportFloorPlanPNG } from '../utils/floorPlanExport';
import './FloorPlanGenerator.css';

export { FloorPlanInspector };

const ORIGIN = { x: 0, y: 0 };
const EMPTY_DETAILS = { walls: [], furniture: [] };
const TOOLS = { select: 'Select', wall: 'Draw wall', room: 'Add room', door: 'Door', window: 'Window', staircase: 'Staircase', furniture: 'Furniture' };
const isPanGesture = (event) => event.button === 1 || event.button === 2 || (event.button === 0 && event.altKey);

function AddRoomDialog({ onCancel, onSubmit }) {
  const [type, setType] = useState('bedroom');
  const [name, setName] = useState(ROOM_PRESETS.bedroom[0]);
  return (
    <div className="house-plan-dialog-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onCancel()}>
      <form className="house-plan-panel house-plan-dialog" role="dialog" aria-modal="true" aria-label="Add room" onSubmit={(event) => {
        event.preventDefault();
        onSubmit(type, name.trim() || ROOM_PRESETS[type][0]);
      }} onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}>
        <h2>Add room</h2>
        <label className="house-plan-field">Category<select value={type} onChange={(event) => {
          setType(event.target.value);
          setName(ROOM_PRESETS[event.target.value][0]);
        }}>
          {Object.entries(ROOM_PRESETS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="house-plan-field">Room name<input type="text" autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="house-plan-tool-row">
          <button className="house-plan-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="house-plan-button is-primary" type="submit">Add room</button>
        </div>
      </form>
    </div>
  );
}

export default function FloorPlanGenerator({ embedded = false, tool: controlledTool, activeFloor, selectedObject, onSelectionChange, onToolUsed, apiRef, theme = 'light' }) {
  const {
    design, updateDesign, setFloorRooms, setFloorDetails, selectPlan, setActiveFloor,
    beginHistoryGroup, endHistoryGroup,
  } = useDesign();
  const floor = activeFloor ?? design.activeFloor ?? 0;
  const layouts = useMemo(() => getFloorLayouts(design), [design]);
  const rooms = layouts[floor] || [];
  const details = getFloorDetails(design)[floor] || EMPTY_DETAILS;
  const plans = design.plans || [];
  const width = design.landLength || 40;
  const depth = design.landWidth || 30;
  const plotArea = getDesignPlotArea(design);
  const plotDescription = describeDesignPlot(design, plotArea);
  const stats = calculatePlanStats(rooms, width, depth, plotArea);

  const [localTool, setLocalTool] = useState('select');
  const [localSelection, setLocalSelection] = useState(null);
  const [furnitureType, setFurnitureType] = useState('sofa');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(ORIGIN);
  const [wallDraft, setWallDraft] = useState(null);
  const [message, setMessage] = useState('');
  const drawingRef = useRef(null);
  const gestureRef = useRef(null);
  const tool = controlledTool ?? localTool;
  const currentSelection = selectedObject === undefined ? localSelection : selectedObject;
  const selection = currentSelection?.floor == null || currentSelection.floor === floor ? currentSelection : null;

  const overlaps = useMemo(() => {
    const found = new Set();
    rooms.forEach((room, index) => rooms.slice(index + 1).forEach((other) => {
      if (checkOverlap(room, other)) {
        found.add(room.id);
        found.add(other.id);
      }
    }));
    return found;
  }, [rooms]);

  useEffect(() => {
    if (embedded || plans.length || (design.plot && !design.rooms?.length)) return;
    if (!design.rooms?.length && (layouts.some((layout) => layout.length) || getFloorDetails(design).some((detail) => detail.walls.length || detail.furniture.length))) return;
    const generated = generateFloorPlans({ landLength: width, landWidth: depth, houseType: design.houseType, floors: design.floors, roadFacing: design.roadFacing });
    const initialRooms = design.rooms?.length ? design.rooms : generated[0]?.rooms || [];
    updateDesign({ plans: generated.map((plan, index) => index === 0 ? { ...plan, rooms: initialRooms } : plan), currentPlanIndex: 0, rooms: initialRooms }, { history: false });
  }, [depth, design, embedded, layouts, plans.length, updateDesign, width]);

  useEffect(() => {
    setShowAddRoom(tool === 'room');
    setWallDraft(null);
    setMessage('');
  }, [tool, floor]);

  useEffect(() => () => {
    if (gestureRef.current?.kind === 'item') endHistoryGroup?.();
  }, [endHistoryGroup]);

  function select(object) {
    const next = object ? { ...object, floor } : null;
    if (selectedObject === undefined) setLocalSelection(next);
    onSelectionChange?.(next);
  }

  function closeRoomDialog() {
    setShowAddRoom(false);
    setLocalTool('select');
    onToolUsed?.('room');
  }

  function addRoom(type, name, point) {
    const [, presetWidth, presetDepth] = ROOM_PRESETS[type];
    const id = objectId('room');
    const ordered = { id, type, name, x: Math.min(3, width), y: Math.min(3, depth), width: presetWidth, height: presetDepth, color: ROOM_COLORS[type] || '#f8fafc', doors: [], windows: [] };
    let room = fitRoom(ordered, width, depth);
    if (point) {
      room = fitRoom({ ...room, x: snapPlan(point.x - room.width / 2), y: snapPlan(point.y - room.height / 2) }, width, depth);
    } else {
      // Use a free spot when available, while retaining drag placement in a dense plan.
      const sampleX = Math.max(1, Math.ceil(width / 32));
      const sampleY = Math.max(1, Math.ceil(depth / 32));
      outer: for (let y = 0; y <= depth - room.height; y += sampleY) {
        for (let x = 0; x <= width - room.width; x += sampleX) {
          const candidate = { ...room, x, y };
          if (!rooms.some((other) => checkOverlap(other, candidate))) {
            room = candidate;
            break outer;
          }
        }
      }
    }
    if (type !== 'parking' && type !== 'balcony') {
      room.doors = [roomOpeningAt(room, { id: objectId('door'), label: 'Door', width: 3 }, 'bottom')];
    }
    if (type !== 'parking' && type !== 'balcony' && type !== 'staircase') {
      room.windows = [roomOpeningAt(room, { id: objectId('window'), width: 3.5 }, 'top')];
    }
    setFloorRooms(floor, (current) => [...current, room]);
    setMessage('');
    select({ kind: 'room', id });
  }

  function pointFor(event) {
    const drawing = drawingRef.current;
    const matrix = drawing?.getScreenCTM();
    if (!matrix) return null;
    const point = drawing.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function snapPoint(point) {
    return { x: clamp(snapPlan(point.x), 0, width), y: clamp(snapPlan(point.y), 0, depth) };
  }

  function addOpening(item, parent, point) {
    const id = objectId(tool);
    const widthFt = tool === 'door' ? 3 : 3.5;
    if (parent.kind === 'wall') {
      const opening = normalizeOpening({ id, type: tool, width: widthFt }, wallLength(item), snapPlan(projectOntoWall(point, item)));
      if (openingsConflict(item.openings || [], opening, (entry) => entry.offset)) {
        setMessage('Choose a spot clear of other openings.');
        return;
      }
      setFloorDetails(floor, ({ walls }) => ({ walls: walls.map((wall) => wall.id === item.id ? { ...wall, openings: [...(wall.openings || []), opening] } : wall) }));
      select({ kind: tool, id, wallId: item.id });
    } else if (parent.kind === 'room') {
      const { side, offset, distance } = nearestRoomSide(point, item);
      if (distance > 1.35) {
        setMessage('Click near the room wall to place the opening.');
        return;
      }
      const axis = openingAxis(side);
      const length = openingSideLength(item, side);
      const opening = roomOpeningAt(item, { id, width: widthFt }, side, snapPlan(offset));
      const allOpenings = [...(item.doors || []), ...(item.windows || [])].filter((entry) => entry.side === side);
      if (openingsConflict(allOpenings, opening, (entry) => entry[axis] ?? length / 2)) {
        setMessage('Choose a spot clear of other openings.');
        return;
      }
      const list = openingList(tool);
      setFloorRooms(floor, (current) => current.map((room) => room.id === item.id ? { ...room, [list]: [...(room[list] || []), opening] } : room));
      select({ kind: tool, id, roomId: item.id });
    } else {
      return;
    }
    setMessage('');
  }

  function onCanvasPointerDown(event) {
    if (event.button !== 0 && !isPanGesture(event)) return;
    const point = pointFor(event);
    if (!point) return;

    if (tool === 'select' || isPanGesture(event)) {
      const matrix = drawingRef.current.getScreenCTM();
      if (!isPanGesture(event)) select(null);
      gestureRef.current = { kind: 'pan', pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, origin: pan, factor: matrix.a };
      drawingRef.current.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (point.x < 0 || point.y < 0 || point.x > width || point.y > depth) return;
    const location = snapPoint(point);
    if (tool === 'wall') {
      if (!wallDraft) {
        setWallDraft({ start: location, end: location });
        setMessage('');
        return;
      }
      const wall = fitWall({ id: objectId('wall'), x1: wallDraft.start.x, y1: wallDraft.start.y, x2: location.x, y2: location.y, thickness: 0.35 }, width, depth);
      if (!wall) {
        setMessage('Choose an endpoint at least 0.5 ft from the start.');
        return;
      }
      setFloorDetails(floor, ({ walls }) => ({ walls: [...walls, wall] }));
      select({ kind: 'wall', id: wall.id });
      setMessage('');
      setWallDraft(null);
    } else if (tool === 'staircase') {
      addRoom('staircase', 'Staircase', location);
    } else if (tool === 'furniture') {
      const [, itemWidth, itemDepth, color] = FURNITURE_PRESETS[furnitureType];
      const furniture = fitFurniture({ id: objectId('furniture'), type: furnitureType, x: location.x, y: location.y, width: itemWidth, depth: itemDepth, rotation: 0, color }, width, depth);
      setFloorDetails(floor, ({ furniture: current }) => ({ furniture: [...current, furniture] }));
      select({ kind: 'furniture', id: furniture.id });
    } else if (tool === 'door' || tool === 'window') {
      setMessage('Select a room edge or drawn wall to place an opening.');
    }
  }

  function onItemPointerDown(event, item, ref, mode = 'move') {
    if (event.button !== 0 || isPanGesture(event)) return;
    const point = pointFor(event);
    if (!point) return;
    if ((tool === 'door' || tool === 'window') && ref.kind !== 'furniture') {
      event.stopPropagation();
      addOpening(item, ref, point);
    } else if (tool === 'select') {
      event.stopPropagation();
      select(ref);
      beginHistoryGroup?.();
      gestureRef.current = { kind: 'item', pointerId: event.pointerId, floor, item, ref, mode, start: point, lastX: 0, lastY: 0 };
      drawingRef.current.setPointerCapture(event.pointerId);
    }
  }

  function onOpeningPointerDown(event, parent, parentRef, ref) {
    if (event.button !== 0 || isPanGesture(event)) return;
    if (tool === 'select') {
      event.stopPropagation();
      select(ref);
    } else if (tool === 'door' || tool === 'window') {
      event.stopPropagation();
      const point = pointFor(event);
      if (point) addOpening(parent, parentRef, point);
    }
  }

  function onPointerMove(event) {
    const gesture = gestureRef.current;
    if (gesture && gesture.pointerId !== event.pointerId) return;
    if (gesture?.kind === 'pan') {
      setPan({ x: gesture.origin.x + (event.clientX - gesture.startClientX) / gesture.factor, y: gesture.origin.y + (event.clientY - gesture.startClientY) / gesture.factor });
      return;
    }
    const point = pointFor(event);
    if (!point) return;
    if (!gesture) {
      if (wallDraft) setWallDraft({ ...wallDraft, end: snapPoint(point) });
      return;
    }

    const dx = snapPlan(point.x - gesture.start.x);
    const dy = snapPlan(point.y - gesture.start.y);
    if (dx === gesture.lastX && dy === gesture.lastY) return;
    gesture.lastX = dx;
    gesture.lastY = dy;
    const { item, ref, mode } = gesture;
    if (ref.kind === 'room') {
      const changed = mode === 'resize'
        ? { width: clamp(item.width + dx, 4, width - item.x), height: clamp(item.height + dy, 4, depth - item.y) }
        : { x: item.x + dx, y: item.y + dy };
      const next = fitRoom({ ...item, ...changed }, width, depth);
      setFloorRooms(gesture.floor, (current) => current.map((room) => room.id === item.id ? next : room));
    } else if (ref.kind === 'wall') {
      let next;
      if (mode === 'end1' || mode === 'end2') {
        const index = mode.at(-1);
        next = fitWall({ ...item, [`x${index}`]: item[`x${index}`] + dx, [`y${index}`]: item[`y${index}`] + dy }, width, depth);
      } else {
        const x = clamp(dx, -Math.min(item.x1, item.x2), width - Math.max(item.x1, item.x2));
        const y = clamp(dy, -Math.min(item.y1, item.y2), depth - Math.max(item.y1, item.y2));
        next = { ...item, x1: item.x1 + x, y1: item.y1 + y, x2: item.x2 + x, y2: item.y2 + y };
      }
      if (next) setFloorDetails(gesture.floor, ({ walls }) => ({ walls: walls.map((wall) => wall.id === item.id ? next : wall) }));
    } else {
      const next = fitFurniture({ ...item, x: item.x + dx, y: item.y + dy }, width, depth);
      setFloorDetails(gesture.floor, ({ furniture }) => ({ furniture: furniture.map((piece) => piece.id === item.id ? next : piece) }));
    }
  }

  function onPointerEnd(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.kind === 'item') endHistoryGroup?.();
    if (drawingRef.current?.hasPointerCapture(event.pointerId)) drawingRef.current.releasePointerCapture(event.pointerId);
  }

  function deleteSelected() {
    if (!findPlanObject(rooms, details, selection)) return;
    deletePlanObject(selection, floor, setFloorRooms, setFloorDetails);
    select(null);
  }

  const zoomIn = () => setZoom((previous) => clamp(previous * 1.2, 0.45, 3.4));
  const zoomOut = () => setZoom((previous) => clamp(previous / 1.2, 0.45, 3.4));
  const resetView = () => {
    setZoom(1);
    setPan(ORIGIN);
  };

  async function exportPlan(exporter) {
    try {
      await exporter({ drawing: drawingRef.current, width, depth, design, floorName: floorLabel(floor), plotDescription, rooms, stats });
      return true;
    } catch (error) {
      setMessage(error.message || 'Could not export the plan.');
      return false;
    }
  }

  const exportPNG = () => exportPlan(exportFloorPlanPNG);
  const exportPDF = () => exportPlan(exportFloorPlanPDF);
  useImperativeHandle(apiRef, () => ({ zoomIn, zoomOut, resetView, exportPNG, exportPDF, deleteSelected }));

  const margin = 3;
  const viewWidth = (width + margin * 2) / zoom;
  const viewDepth = (depth + margin * 2) / zoom;
  const viewBox = `${(width - viewWidth) / 2 - pan.x} ${(depth - viewDepth) / 2 - pan.y} ${viewWidth} ${viewDepth}`;
  const hint = {
    wall: wallDraft ? 'Choose the wall endpoint. Press Esc to cancel.' : 'Choose the wall start point.',
    door: 'Click a room edge or wall to place a door.',
    window: 'Click a room edge or wall to place a window.',
    staircase: 'Click the plan to position a staircase.',
    furniture: 'Click the plan to place the selected furniture.',
  }[tool];

  const editor = <>
    <div className="house-plan-options">
      {floor === 0 && plans.length > 0 && <label>Layout<select aria-label="Floor plan variation" value={design.currentPlanIndex || 0} onChange={(event) => {
        selectPlan(Number(event.target.value));
        select(null);
      }}>{plans.map((plan, index) => <option key={plan.id ?? index} value={index}>{plan.label || `Layout ${index + 1}`}</option>)}</select></label>}
      {tool === 'furniture' && <label>Furniture<select value={furnitureType} onChange={(event) => setFurnitureType(event.target.value)}>{Object.entries(FURNITURE_PRESETS).map(([type, [name]]) => <option key={type} value={type}>{name}</option>)}</select></label>}
      {hint && <span className="house-plan-helper">{hint}</span>}
      {message && <span className="house-plan-notice" role="status">{message}</span>}
      {overlaps.size > 0 && <span className="house-plan-overlap">{overlaps.size} rooms overlap</span>}
    </div>
    <div className="house-plan-board" data-tool={tool} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        setWallDraft(null);
        setMessage('');
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        deleteSelected();
      }
    }}>
      <HousePlanDrawing drawingRef={drawingRef} viewBox={viewBox} width={width} depth={depth} rooms={rooms} details={details} selected={selection} overlaps={overlaps} tool={tool} draft={wallDraft} legacyFrontage={design.plot ? null : design.roadFacing}
        onCanvasPointerDown={onCanvasPointerDown} onItemPointerDown={onItemPointerDown} onOpeningPointerDown={onOpeningPointerDown} onPointerMove={onPointerMove} onPointerEnd={onPointerEnd} onSelect={select} />
      <span className="house-plan-scale">1 grid = 1 ft · {Math.round(zoom * 100)}%</span>
    </div>
  </>;

  return (
    <div className={`house-plan-editor ${embedded ? 'is-embedded' : 'is-standalone'}`} data-theme={theme}>
      {embedded ? editor : <div className="house-plan-legacy-shell">
        <header className="house-plan-legacy-heading">
          <div><h1>2D Floor Planner</h1><p className="house-plan-helper">{plotDescription} · {design.houseType}</p></div>
          <div className="house-plan-standalone-actions">
            <Link className="house-plan-button" to="/land-measurement">Land plot</Link>
            <Link className="house-plan-button" to="/cost-calculator">Cost estimate</Link>
            <Link className="house-plan-button is-primary" to="/3d-designer">3D workspace</Link>
          </div>
        </header>
        <div className="house-plan-tool-row" role="group" aria-label="Floor planning tools">
          {Object.entries(TOOLS).map(([key, label]) => <button key={key} type="button" className="house-plan-button" aria-pressed={tool === key} onClick={() => setLocalTool(key)}>{label}</button>)}
          <button type="button" className="house-plan-icon-button" aria-label="Zoom in" onClick={zoomIn}><HiZoomIn size={17} /></button>
          <button type="button" className="house-plan-icon-button" aria-label="Zoom out" onClick={zoomOut}><HiZoomOut size={17} /></button>
          <button type="button" className="house-plan-icon-button" aria-label="Reset view" onClick={resetView}><HiRefresh size={17} /></button>
          <button type="button" className="house-plan-button" onClick={exportPNG}><HiDownload size={16} /> PNG</button>
          <button type="button" className="house-plan-button" onClick={exportPDF}><HiDownload size={16} /> PDF</button>
          <label className="house-plan-field">Floor<select value={floor} onChange={(event) => { select(null); setActiveFloor(Number(event.target.value)); }}>{layouts.map((_, index) => <option key={index} value={index}>{floorLabel(index)}</option>)}</select></label>
        </div>
        <div className="house-plan-legacy-layout">
          <div className="house-plan-panel is-drawing-panel">{editor}</div>
          <div className="house-plan-stack">
            <FloorPlanInspector activeFloor={floor} selectedObject={selection} onSelectionChange={select} theme={theme} />
            <section className="house-plan-panel"><h2>Room schedule</h2><div className="house-plan-list">
              {rooms.map((room) => <button key={room.id} type="button" aria-pressed={selection?.id === room.id} onClick={() => select({ kind: 'room', id: room.id })}>{room.name}<span>{Number((room.width * room.height).toFixed(2))} sq ft</span></button>)}
              {rooms.length === 0 && <p className="house-plan-helper">Add a room to start this floor.</p>}
            </div></section>
            <section className="house-plan-panel"><h2>Floor summary</h2><dl className="house-plan-metrics">
              <div><dt>Built-up area</dt><dd>{stats.totalBuiltUpArea} sq ft</dd></div>
              <div><dt>Carpet area</dt><dd>{stats.carpetArea} sq ft</dd></div>
              <div><dt>{floor === 0 ? 'Ground coverage' : 'Plot coverage'}</dt><dd>{stats.coveragePercentage == null ? 'Unavailable' : `${stats.coveragePercentage}%`}</dd></div>
              <div><dt>FAR</dt><dd>{stats.far ?? 'Unavailable'}</dd></div>
            </dl></section>
          </div>
        </div>
      </div>}
      {showAddRoom && <AddRoomDialog onCancel={closeRoomDialog} onSubmit={(type, name) => {
        addRoom(type, name);
        closeRoomDialog();
      }} />}
    </div>
  );
}
