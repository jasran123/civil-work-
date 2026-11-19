import { useId } from 'react';
import { FURNITURE_PRESETS, openingAxis, wallLength } from '../utils/housePlanEditing';

const ROOM_OPENING_ROTATION = { top: 0, right: 90, bottom: 180, left: -90 };
const isSelected = (selected, kind, id, parent = {}) => selected?.kind === kind && selected.id === id
  && (!parent.roomId || parent.roomId === selected.roomId)
  && (!parent.wallId || parent.wallId === selected.wallId);

function SelectionTarget({ label, onPointerDown, onSelect, children, className, transform }) {
  return (
    <g className={className} transform={transform} onPointerDown={onPointerDown} tabIndex={0} role="button" aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}>
      {children}
    </g>
  );
}

function OpeningMark({ opening, width, thickness = 0.25, type, selected, position, rotation, onPointerDown, onSelect }) {
  return (
    <SelectionTarget className={`house-plan-opening house-plan-opening--${type}${selected ? ' is-selected' : ''}`} label={`${type === 'door' ? 'Door' : 'Window'} ${opening.label || ''}`.trim()}
      transform={`translate(${position.x} ${position.y}) rotate(${rotation})`} onPointerDown={onPointerDown} onSelect={onSelect}>
      <line className="house-plan-opening-line" style={{ '--opening-gap': `${thickness + 0.14}px` }} x1={-width / 2} x2={width / 2} y1="0" y2="0" />
      {type === 'door' ? (
        <>
          <path className="house-plan-door-swing" d={`M ${-width / 2} ${width} A ${width} ${width} 0 0 0 ${width / 2} 0`} />
          <path className="house-plan-door-leaf" d={`M ${-width / 2} 0 V ${width}`} />
        </>
      ) : <line className="house-plan-window-glazing" x1={-width / 2} x2={width / 2} y1="0" y2="0" />}
      <line x1={-width / 2} x2={width / 2} y1="0" y2="0" className="house-plan-hit-area" />
    </SelectionTarget>
  );
}

export default function HousePlanDrawing({ drawingRef, viewBox, width, depth, rooms, details, selected, overlaps, tool, draft, legacyFrontage, onCanvasPointerDown, onItemPointerDown, onOpeningPointerDown, onPointerMove, onPointerEnd, onSelect }) {
  const gridId = useId().replace(/:/g, '');
  const frontageTransform = {
    North: `translate(${width / 2} -0.7)`,
    South: `translate(${width / 2} ${depth + 1.05})`,
    East: `translate(${width + 1.05} ${depth / 2}) rotate(90)`,
    West: `translate(-0.7 ${depth / 2}) rotate(-90)`,
  }[legacyFrontage];

  return (
    <svg ref={drawingRef} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="house-plan-svg" aria-label="Editable architectural floor plan"
      onPointerDown={onCanvasPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd}>
      <defs>
        <pattern id={`${gridId}-fine`} width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 H 0 V 1" className="house-plan-minor-grid" />
        </pattern>
        <pattern id={`${gridId}-major`} width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={`url(#${gridId}-fine)`} />
          <path d="M 5 0 H 0 V 5" className="house-plan-major-grid" />
        </pattern>
      </defs>
      <rect className="house-plan-sheet" width={width} height={depth} />
      <rect width={width} height={depth} fill={`url(#${gridId}-major)`} pointerEvents="none" />
      {legacyFrontage && <g className="house-plan-legacy-guides" pointerEvents="none">
        {frontageTransform && <text className="house-plan-annotation" textAnchor="middle" transform={frontageTransform}>{legacyFrontage} road frontage</text>}
        {width > 6 && depth > 6 && <>
          <rect className="house-plan-setback" x="3" y="3" width={width - 6} height={depth - 6} />
          <text className="house-plan-annotation" x="3.2" y="2.72">3 ft setback</text>
        </>}
        <g transform={`translate(${width - 0.85} 0.4)`} className="house-plan-north">
          <path d="M 0 1.43 V .52 L -.22 .9 M 0 .52 L .22 .9" />
          <text textAnchor="middle" y=".38">N</text>
        </g>
      </g>}

      {rooms.map((room) => {
        const ref = { kind: 'room', id: room.id };
        const active = isSelected(selected, 'room', room.id) || selected?.roomId === room.id;
        return (
          <SelectionTarget key={room.id} className={`house-plan-room${active ? ' is-selected' : ''}${overlaps.has(room.id) ? ' is-overlapping' : ''}`}
            transform={`translate(${room.x} ${room.y})`} label={`${room.name}, ${room.width} by ${room.height} feet`}
            onPointerDown={(event) => onItemPointerDown(event, room, ref)} onSelect={() => onSelect(ref)}>
            <rect className="house-plan-room-outline" width={room.width} height={room.height} style={{ '--room-fill': room.color || '#f8fafc' }} />
            {room.type === 'staircase' && (
              <g className="house-plan-stair-treads" pointerEvents="none">
                {Array.from({ length: 10 }, (_, index) => <path key={index} d={`M 0.38 ${(index + 1) * room.height / 11} H ${room.width - 0.38}`} />)}
                <path d={`M ${room.width / 2} ${room.height * 0.82} V ${room.height * 0.18} l -0.4 0.6 m 0.4 -0.6 l 0.4 0.6`} />
              </g>
            )}
            <g className="house-plan-room-caption" pointerEvents="none" textAnchor="middle" transform={`translate(${room.width / 2} ${room.height / 2})`}>
              <text y="-0.2" className="house-plan-room-name" textLength={room.name?.length * 0.37 > room.width - 0.65 ? Math.max(1, room.width - 0.65) : undefined} lengthAdjust="spacingAndGlyphs">{room.name}</text>
              <text y="0.62" className="house-plan-room-dimension">{Number(room.width.toFixed(2))}′ × {Number(room.height.toFixed(2))}′</text>
            </g>
            {tool === 'select' && active && selected?.kind === 'room' && (
              <rect width="0.62" height="0.62" x={room.width - 0.31} y={room.height - 0.31} className="house-plan-resize-handle" onPointerDown={(event) => onItemPointerDown(event, room, ref, 'resize')} />
            )}
          </SelectionTarget>
        );
      })}

      {rooms.flatMap((room) => ['door', 'window'].flatMap((type) => (room[type === 'door' ? 'doors' : 'windows'] || []).map((opening) => {
        const horizontal = openingAxis(opening.side) === 'x';
        const widthFt = opening.width || 3;
        const position = {
          x: room.x + (horizontal ? opening.x ?? room.width / 2 : opening.side === 'right' ? room.width : 0),
          y: room.y + (horizontal ? opening.side === 'bottom' ? room.height : 0 : opening.y ?? room.height / 2),
        };
        const ref = { kind: type, id: opening.id, roomId: room.id };
        return <OpeningMark key={`${room.id}-${opening.id}`} opening={opening} type={type} width={widthFt} position={position}
          rotation={ROOM_OPENING_ROTATION[opening.side] || 0} selected={isSelected(selected, type, opening.id, ref)}
          onPointerDown={(event) => onOpeningPointerDown(event, room, { kind: 'room', id: room.id }, ref)} onSelect={() => onSelect(ref)} />;
      })))}

      {details.walls.map((wall) => {
        const active = isSelected(selected, 'wall', wall.id) || selected?.wallId === wall.id;
        const ref = { kind: 'wall', id: wall.id };
        const length = wallLength(wall);
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        return (
          <g key={wall.id}>
            <SelectionTarget className={`house-plan-wall${active ? ' is-selected' : ''}`} label={`Wall, ${length.toFixed(1)} feet`}
              onPointerDown={(event) => onItemPointerDown(event, wall, ref)} onSelect={() => onSelect(ref)}>
              <line x1={wall.x1} x2={wall.x2} y1={wall.y1} y2={wall.y2} strokeWidth={wall.thickness || 0.35} className="house-plan-wall-line" />
              <line x1={wall.x1} x2={wall.x2} y1={wall.y1} y2={wall.y2} className="house-plan-hit-area" />
              {tool === 'select' && selected?.kind === 'wall' && active && [1, 2].map((end) => (
                <circle key={end} className="house-plan-resize-handle" cx={wall[`x${end}`]} cy={wall[`y${end}`]} r="0.29" onPointerDown={(event) => onItemPointerDown(event, wall, ref, `end${end}`)} />
              ))}
            </SelectionTarget>
            {(wall.openings || []).map((opening) => {
              const position = { x: wall.x1 + Math.cos(angle) * opening.offset, y: wall.y1 + Math.sin(angle) * opening.offset };
              const apertureRef = { kind: opening.type, id: opening.id, wallId: wall.id };
              return <OpeningMark key={opening.id} opening={opening} type={opening.type} width={opening.width} thickness={wall.thickness || 0.35} position={position}
                rotation={angle * 180 / Math.PI} selected={isSelected(selected, opening.type, opening.id, apertureRef)}
                onPointerDown={(event) => onOpeningPointerDown(event, wall, ref, apertureRef)} onSelect={() => onSelect(apertureRef)} />;
            })}
          </g>
        );
      })}

      {details.furniture.map((item) => {
        const label = FURNITURE_PRESETS[item.type]?.[0] || 'Furniture';
        const active = isSelected(selected, 'furniture', item.id);
        const ref = { kind: 'furniture', id: item.id };
        return (
          <SelectionTarget key={item.id} className={`house-plan-furniture${active ? ' is-selected' : ''}`} label={label}
            transform={`translate(${item.x} ${item.y}) rotate(${item.rotation || 0})`}
            onPointerDown={(event) => onItemPointerDown(event, item, ref)} onSelect={() => onSelect(ref)}>
            <rect x={-item.width / 2} y={-item.depth / 2} width={item.width} height={item.depth} rx="0.15" style={{ '--furniture-fill': item.color || '#a5b9c7' }} />
            <text textAnchor="middle" dominantBaseline="central" pointerEvents="none">{label}</text>
          </SelectionTarget>
        );
      })}

      {draft && (
        <g className="house-plan-wall-draft" pointerEvents="none">
          <line x1={draft.start.x} y1={draft.start.y} x2={draft.end.x} y2={draft.end.y} />
          <circle cx={draft.start.x} cy={draft.start.y} r="0.22" />
        </g>
      )}
    </svg>
  );
}
