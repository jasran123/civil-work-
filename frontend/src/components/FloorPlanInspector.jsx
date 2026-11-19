import { useState } from 'react';
import { HiTrash } from 'react-icons/hi';
import { useDesign } from '../context/DesignContext';
import { getFloorDetails, getFloorLayouts } from '../utils/projectState';
import {
  clamp, fitFurniture, fitRoom, fitWall, FURNITURE_PRESETS, normalizeOpening, objectId, openingAxis, openingList,
  openingSideLength, openingsConflict, roomOpeningAt, rotateRoom, SIDES, wallLength,
} from '../utils/housePlanEditing';

export function findPlanObject(rooms, details, selection) {
  if (!selection) return null;
  if (selection.kind === 'room') return rooms.find(({ id }) => id === selection.id);
  if (selection.kind === 'furniture') return details.furniture.find(({ id }) => id === selection.id);
  if (selection.kind === 'wall') return details.walls.find(({ id }) => id === selection.id);
  if (selection.wallId) return details.walls.find(({ id }) => id === selection.wallId)?.openings?.find(({ id }) => id === selection.id);
  return rooms.find(({ id }) => id === selection.roomId)?.[openingList(selection.kind)]?.find(({ id }) => id === selection.id);
}

export function deletePlanObject(selection, floor, setFloorRooms, setFloorDetails) {
  if (!selection) return;
  const { kind, id, roomId, wallId } = selection;
  if (kind === 'room') return setFloorRooms(floor, (rooms) => rooms.filter((room) => room.id !== id));
  if (kind === 'wall') return setFloorDetails(floor, (details) => ({ walls: details.walls.filter((wall) => wall.id !== id) }));
  if (kind === 'furniture') return setFloorDetails(floor, (details) => ({ furniture: details.furniture.filter((item) => item.id !== id) }));
  if (wallId) return setFloorDetails(floor, (details) => ({ walls: details.walls.map((wall) => wall.id === wallId ? { ...wall, openings: wall.openings.filter((item) => item.id !== id) } : wall) }));
  const list = openingList(kind);
  return setFloorRooms(floor, (rooms) => rooms.map((room) => room.id === roomId ? { ...room, [list]: (room[list] || []).filter((item) => item.id !== id) } : room));
}

function InspectorField({ label, value, onCommit, type = 'number', min, max, step = 'any' }) {
  const [draft, setDraft] = useState(null);
  const formatted = type === 'number' && Number.isFinite(value) ? Number(value.toFixed(2)) : value ?? '';
  return (
    <label className="house-plan-field">
      {label}
      <input type={type} min={min} max={max} step={step} value={draft ?? formatted}
        onChange={(event) => type === 'color' ? onCommit(event.target.value) : setDraft(event.target.value)}
        onBlur={() => {
          if (draft != null) {
            const next = type === 'number' ? Number(draft) : draft.trim();
            if (draft.trim() && (type !== 'number' || Number.isFinite(next)) && next !== formatted) onCommit(next);
          }
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }} />
    </label>
  );
}

function MaterialField({ value, label = 'Material', onChange, room = false }) {
  return (
    <label className="house-plan-field">
      {label}
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{room ? 'Match project' : 'Painted plaster'}</option>
        <option value="wood">Wood</option>
        <option value="concrete">Concrete</option>
        <option value="tile">Tile</option>
      </select>
    </label>
  );
}

export default function FloorPlanInspector({ activeFloor, selectedObject, onSelectionChange, theme = 'light' }) {
  const { design, setFloorRooms, setFloorDetails } = useDesign();
  const floor = activeFloor ?? design.activeFloor ?? 0;
  const selected = selectedObject?.floor == null || selectedObject.floor === floor ? selectedObject : null;
  const rooms = getFloorLayouts(design)[floor] || [];
  const details = getFloorDetails(design)[floor] || { walls: [], furniture: [] };
  const object = findPlanObject(rooms, details, selected);
  const selectedRoom = selected?.kind === 'room' ? object : rooms.find((room) => room.id === selected?.roomId);
  const selectedWall = selected?.kind === 'wall' ? object : details.walls.find((wall) => wall.id === selected?.wallId);
  const [message, setMessage] = useState('');
  const widthFt = design.landLength || 40;
  const depthFt = design.landWidth || 30;

  function updateRoom(updates) {
    setMessage('');
    setFloorRooms(floor, (current) => current.map((room) => room.id === selectedRoom.id ? fitRoom({ ...room, ...updates }, widthFt, depthFt) : room));
  }

  function updateWall(updates) {
    const proposed = fitWall({ ...selectedWall, ...updates }, widthFt, depthFt);
    if (!proposed) {
      setMessage('A wall must be at least 0.5 ft long.');
      return;
    }
    setMessage('');
    setFloorDetails(floor, ({ walls }) => ({ walls: walls.map((wall) => wall.id === selectedWall.id ? proposed : wall) }));
  }

  function updateFurniture(updates) {
    setMessage('');
    setFloorDetails(floor, ({ furniture }) => ({ furniture: furniture.map((item) => item.id === object.id ? fitFurniture({ ...item, ...updates }, widthFt, depthFt) : item) }));
  }

  function updateOpening(changes) {
    const side = changes.side || object.side;
    if (selectedWall) {
      const next = normalizeOpening({ ...object, ...changes }, wallLength(selectedWall));
      if (openingsConflict(selectedWall.openings || [], next, (opening) => opening.offset)) {
        setMessage('This position would overlap another opening.');
        return;
      }
      updateWall({ openings: selectedWall.openings.map((opening) => opening.id === object.id ? next : opening) });
      return;
    }
    const axis = openingAxis(side);
    const next = roomOpeningAt(selectedRoom, { ...object, ...changes }, side, changes.offset);
    const allOpenings = [...(selectedRoom.doors || []), ...(selectedRoom.windows || [])].filter((opening) => opening.side === side);
    if (openingsConflict(allOpenings, next, (opening) => opening[axis] ?? openingSideLength(selectedRoom, side) / 2)) {
      setMessage('This position would overlap another opening.');
      return;
    }
    const list = openingList(selected.kind);
    updateRoom({ [list]: selectedRoom[list].map((opening) => opening.id === object.id ? next : opening) });
  }

  function toggleRoomOpening(type, side) {
    const list = openingList(type);
    const existing = selectedRoom[list] || [];
    const aperture = existing.find((opening) => opening.side === side);
    if (aperture) {
      onSelectionChange?.({ kind: type, id: aperture.id, roomId: selectedRoom.id });
      return;
    }
    const axis = openingAxis(side);
    const length = openingSideLength(selectedRoom, side);
    const related = [...(selectedRoom.doors || []), ...(selectedRoom.windows || [])].filter((opening) => opening.side === side);
    const opening = [0.5, 0.25, 0.75].map((ratio) => roomOpeningAt(selectedRoom, { id: objectId(type), width: type === 'door' ? 3 : 3.5 }, side, length * ratio))
      .find((candidate) => !openingsConflict(related, candidate, (item) => item[axis] ?? length / 2));
    if (!opening) {
      setMessage('This edge has no space for that opening.');
      return;
    }
    updateRoom({ [list]: [...existing, opening] });
    onSelectionChange?.({ kind: type, id: opening.id, roomId: selectedRoom.id });
  }

  const field = (label, key, onCommit, options) => <InspectorField key={key} label={label} value={object[key]} onCommit={(value) => onCommit({ [key]: value })} {...options} />;
  const floorHeight = details.height || 10;
  const openingHeight = object?.height ?? (selected?.kind === 'door' ? 7 : 3.5);
  const sill = selected?.kind === 'window' ? object?.sill ?? 3 : 0;
  const usableHeight = selectedWall?.height || floorHeight;
  let heading = 'Object properties';
  if (object && selected.kind === 'room') heading = object.type === 'staircase' ? 'Staircase' : 'Room';
  if (object && selected.kind === 'wall') heading = 'Wall';
  if (object && selected.kind === 'furniture') heading = FURNITURE_PRESETS[object.type]?.[0] || 'Furniture';
  if (object && ['door', 'window'].includes(selected.kind)) heading = selected.kind === 'door' ? 'Door' : 'Window';

  return (
    <section className="house-plan-inspector house-plan-editor" data-theme={theme} aria-label="Object properties">
      <div className="house-plan-panel-header">
        <h3>{heading}</h3>
        {object && <button type="button" className="house-plan-icon-button is-danger" aria-label={`Delete ${heading.toLowerCase()}`} onClick={() => {
          deletePlanObject(selected, floor, setFloorRooms, setFloorDetails);
          setMessage('');
          onSelectionChange?.(null);
        }}><HiTrash size={16} /></button>}
      </div>
      {!object && <p className="house-plan-helper">Select a room, wall, opening or furniture piece in the plan.</p>}
      {object && <div className="house-plan-stack" key={`${floor}-${selected.kind}-${selected.id}`}>
        {selected.kind === 'room' && <>
          {field('Room name', 'name', updateRoom, { type: 'text' })}
          <div className="house-plan-fields">
            {field('Width (ft)', 'width', updateRoom, { min: 4 })}
            {field('Depth (ft)', 'height', updateRoom, { min: 4 })}
            {field('X (ft)', 'x', updateRoom, { min: 0 })}
            {field('Y (ft)', 'y', updateRoom, { min: 0 })}
            <MaterialField label="Floor finish" room value={object.floorMaterial} onChange={(floorMaterial) => updateRoom({ floorMaterial })} />
            <InspectorField label="Wall color" type="color" value={object.wallColor || design.wallColor || '#ffffff'} onCommit={(wallColor) => updateRoom({ wallColor })} />
          </div>
          <button type="button" className="house-plan-button" onClick={() => updateRoom(rotateRoom(object, widthFt, depthFt))}>Rotate room 90°</button>
          <div>
            <p className="house-plan-helper">Doors and windows</p>
            <div className="house-plan-edges">{SIDES.map((side) => <div key={side}><span>{side[0].toUpperCase() + side.slice(1)}</span>{['door', 'window'].map((type) => <button key={type} type="button" className="house-plan-button" aria-label={`${type === 'door' ? 'Door' : 'Window'} on ${side} wall`} aria-pressed={(object[openingList(type)] || []).some((opening) => opening.side === side)} onClick={() => toggleRoomOpening(type, side)}>{type === 'door' ? 'Door' : 'Window'}</button>)}</div>)}</div>
          </div>
        </>}
        {selected.kind === 'wall' && <>
          <p className="house-plan-helper">{wallLength(object).toFixed(2)} ft long · {Math.round(Math.atan2(object.y2 - object.y1, object.x2 - object.x1) * 180 / Math.PI)}°</p>
          <div className="house-plan-fields">
            {field('Start X (ft)', 'x1', updateWall, { min: 0 })}{field('Start Y (ft)', 'y1', updateWall, { min: 0 })}
            {field('End X (ft)', 'x2', updateWall, { min: 0 })}{field('End Y (ft)', 'y2', updateWall, { min: 0 })}
            <InspectorField label="Thickness (ft)" value={object.thickness || 0.35} min={0.15} max={2} onCommit={(thickness) => updateWall({ thickness: clamp(thickness, 0.15, 2) })} />
            <InspectorField label="Height (ft)" value={object.height || floorHeight} min={0.5} max={floorHeight} onCommit={(height) => updateWall({ height: clamp(height, 0.5, floorHeight) })} />
            <MaterialField value={object.material} onChange={(material) => updateWall({ material })} />
            <InspectorField label="Color" type="color" value={object.color || design.wallColor || '#ffffff'} onCommit={(color) => updateWall({ color })} />
          </div>
        </>}
        {selected.kind === 'furniture' && <div className="house-plan-fields">
          {field('Width (ft)', 'width', updateFurniture, { min: 0.25 })}{field('Depth (ft)', 'depth', updateFurniture, { min: 0.25 })}
          {field('Center X (ft)', 'x', updateFurniture, { min: 0 })}{field('Center Y (ft)', 'y', updateFurniture, { min: 0 })}
          {field('Rotation (°)', 'rotation', ({ rotation }) => updateFurniture({ rotation: ((rotation % 360) + 360) % 360 }))}
          {field('Color', 'color', updateFurniture, { type: 'color' })}
        </div>}
        {['door', 'window'].includes(selected.kind) && <>
          {selectedRoom && <label className="house-plan-field">Wall edge<select value={object.side} onChange={(event) => updateOpening({ side: event.target.value })}>{SIDES.map((side) => <option key={side} value={side}>{side}</option>)}</select></label>}
          <div className="house-plan-fields">
            {field('Width (ft)', 'width', updateOpening, { min: 0.25 })}
            <InspectorField label="Center offset (ft)" value={selected.roomId ? object[openingAxis(object.side)] ?? openingSideLength(selectedRoom, object.side) / 2 : object.offset} min={0} onCommit={(offset) => updateOpening({ offset })} />
            <InspectorField label="Height (ft)" value={openingHeight} min={0.25} onCommit={(height) => updateOpening({ height: clamp(height, 0.25, usableHeight - sill) })} />
            {selected.kind === 'window' && <InspectorField label="Sill height (ft)" value={sill} min={0} onCommit={(newSill) => updateOpening({ sill: clamp(newSill, 0, usableHeight - openingHeight) })} />}
          </div>
          <button type="button" className="house-plan-button" onClick={() => onSelectionChange?.(selected.roomId ? { kind: 'room', id: selected.roomId } : { kind: 'wall', id: selected.wallId })}>Inspect parent {selected.roomId ? 'room' : 'wall'}</button>
        </>}
      </div>}
      {message && <p className="house-plan-helper house-plan-notice" role="status">{message}</p>}
    </section>
  );
}
