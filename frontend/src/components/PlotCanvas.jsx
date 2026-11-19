import { useEffect, useId, useRef, useState } from 'react';
import { HiHand, HiLocationMarker, HiMinus, HiPlus, HiViewGrid } from 'react-icons/hi';
import { polygonBounds, polygonMetrics } from '../utils/plotGeometry';
import { cornerName, fromFeet } from '../utils/plotProject';
import './PlotCanvas.css';

const formatLength = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatAngle = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function fitView(points, width, height) {
  if (!points.length) return { x: 0, y: 0, scale: 5 };

  const { minX, minY, width: spanX, height: spanY } = polygonBounds(points);
  const padding = Math.min(144, width * 0.32, height * 0.32);
  return {
    x: minX + spanX / 2,
    y: minY + spanY / 2,
    scale: Math.min((width - padding) / (spanX || 1), (height - padding) / (spanY || 1)),
  };
}

function gridInterval(pixelsPerUnit) {
  const target = 16 / pixelsPerUnit;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].find((step) => step * magnitude >= target) * magnitude;
}

function alongEdge(start, end, fraction) {
  return { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction };
}

function edgeFraction(start, end, position) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return 0;
  const along = ((position.x - start.x) * dx + (position.y - start.y) * dy) / lengthSquared;
  return Math.max(0, Math.min(1, along));
}

function closestEdge(points, position) {
  let nearest = null;
  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length];
    const fraction = edgeFraction(start, end, position);
    const point = alongEdge(start, end, fraction);
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (!nearest || distance < nearest.distance) nearest = { index, point, distance, fraction };
  });
  return nearest;
}

const asPolygon = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');

export default function PlotCanvas({
  points = [], unit = 'ft', frontEdge = 0, edgeLabels = [], items = [], activeItemId = null,
  onMovePoint, onAddPoint, onRemovePoint, onMoveItem, onSelectItem, northAngle = 0,
  gate, wallEnabled = false, fitKey, allowDraft = false,
  emptyMessage = 'Additional measurements required',
}) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState({ width: 700, height: 440 });
  const [camera, setCamera] = useState(null);
  const [mode, setMode] = useState('edit');
  const [selectedCorner, setSelectedCorner] = useState(null);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [angles, setAngles] = useState(false);
  const [dragging, setDragging] = useState(false);
  const patternId = useId();
  const { width, height } = size;
  const fitted = fitView(points, width, height);
  const view = camera?.fitKey === fitKey ? camera?.view || fitted : fitted;
  const project = ({ x, y }) => ({
    x: (x - view.x) * view.scale + width / 2,
    y: (y - view.y) * view.scale + height / 2,
  });
  const unproject = ({ x, y }, from = view) => ({
    x: from.x + (x - width / 2) / from.scale,
    y: from.y + (y - height / 2) / from.scale,
  });
  const unitFactor = fromFeet(1, unit);
  const pixelsPerUnit = view.scale / unitFactor;
  const gridUnits = gridInterval(pixelsPerUnit);
  const snapStep = gridUnits / unitFactor;
  const gridPixels = gridUnits * pixelsPerUnit;
  const scaleUnits = gridInterval(pixelsPerUnit / 4);
  const scalePixels = scaleUnits * pixelsPerUnit;
  const origin = project({ x: 0, y: 0 });
  const outline = points.map(project);
  const measures = points.length >= 3 ? polygonMetrics(points) : null;
  const winding = outline.reduce((sum, point, i) => {
    const next = outline[(i + 1) % outline.length];
    return sum + point.x * next.y - point.y * next.x;
  }, 0) >= 0 ? 1 : -1;
  const canAdd = Boolean(onAddPoint && (points.length >= 3 || allowDraft));
  const canRemove = Boolean(onRemovePoint && (points.length > 3 || (allowDraft && points.length > 0)));
  const currentCorner = selectedCorner != null && selectedCorner < points.length ? selectedCorner : null;

  useEffect(() => {
    const svg = svgRef.current;
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      if (nextWidth > 0 && nextHeight > 0) setSize({ width: nextWidth, height: nextHeight });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const navigation = useRef(null);
  navigation.current = { width, height, fitKey, fitted };

  useEffect(() => {
    const svg = svgRef.current;
    function onWheel(event) {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const current = navigation.current;
      const x = (event.clientX - rect.left) * current.width / rect.width;
      const y = (event.clientY - rect.top) * current.height / rect.height;
      const movement = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      setCamera((previous) => zoomCamera(previous, current, Math.exp(-movement * 0.002), x, y));
    }

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  function screenPoint(event) {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height,
    };
  }

  function snapPoint(point) {
    if (!snap) return point;
    return {
      x: Math.round(point.x / snapStep) * snapStep,
      y: Math.round(point.y / snapStep) * snapStep,
    };
  }

  function startDrag(event, kind, target) {
    if (drag.current) return;
    const start = screenPoint(event);
    const world = unproject(start);
    drag.current = { kind, target, start, world, view, pointerId: event.pointerId };
    svgRef.current.setPointerCapture(event.pointerId);
  }

  function onCanvasDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 0 && mode === 'insert' && canAdd) {
      const position = unproject(screenPoint(event));
      if (points.length < 3) {
        onAddPoint(-1, snapPoint(position));
        setSelectedCorner(points.length);
      } else {
        const candidate = closestEdge(points, position);
        if (!candidate || candidate.distance * view.scale > 18) return;
        const start = points[candidate.index];
        const end = points[(candidate.index + 1) % points.length];
        const snapped = edgeFraction(start, end, snapPoint(candidate.point));
        const fraction = snapped > 0 && snapped < 1 ? snapped : candidate.fraction;
        if (fraction <= 0 || fraction >= 1) return;
        insertCorner(candidate.index, alongEdge(start, end, fraction));
      }
      setCamera({ fitKey, view });
      return;
    }
    setSelectedCorner(null);
    startDrag(event, 'pan');
  }

  function onCornerDown(event, index) {
    if (event.button !== 0 || mode !== 'edit') return;
    event.stopPropagation();
    setSelectedCorner(index);
    if (onMovePoint) startDrag(event, 'corner', { index, position: points[index] });
  }

  function onItemDown(event, item) {
    if (event.button !== 0 || mode !== 'edit') return;
    event.stopPropagation();
    setSelectedCorner(null);
    onSelectItem?.(item.id);
    if (onMoveItem && item.position) startDrag(event, 'item', item);
  }

  function onCanvasMove(event) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const current = screenPoint(event);
    const dx = current.x - active.start.x;
    const dy = current.y - active.start.y;
    if (!active.moved && Math.hypot(dx, dy) < 3) return;

    if (!active.moved) {
      active.moved = true;
      setDragging(true);
      setCamera({ fitKey, view: active.view });
    }

    if (active.kind === 'pan') {
      setCamera({
        fitKey,
        view: { ...active.view, x: active.view.x - dx / active.view.scale, y: active.view.y - dy / active.view.scale },
      });
      return;
    }

    const world = unproject(current, active.view);
    const position = snapPoint({
      x: active.target.position.x + world.x - active.world.x,
      y: active.target.position.y + world.y - active.world.y,
    });
    if (active.kind === 'corner') onMovePoint(active.target.index, position);
    else onMoveItem(active.target.id, position);
  }

  function endDrag(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  function removeCorner(index) {
    if (!canRemove || index == null) return;
    onRemovePoint(index, allowDraft);
    setSelectedCorner(null);
  }

  function insertCorner(index, point) {
    onAddPoint(index, point);
    setSelectedCorner(index + 1);
    setMode('edit');
  }

  function onCornerKey(event, index) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeCorner(index);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (mode === 'insert' && canAdd && points.length >= 3) {
        insertCorner(index, alongEdge(points[index], points[(index + 1) % points.length], 0.5));
        setCamera({ fitKey, view });
        return;
      }
      setSelectedCorner(index);
      return;
    }

    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!onMovePoint || !direction) return;
    event.preventDefault();
    const step = (snap ? snapStep : 1 / unitFactor) * (event.shiftKey ? 5 : 1);
    const point = points[index];
    setCamera({ fitKey, view });
    onMovePoint(index, snapPoint({ x: point.x + direction[0] * step, y: point.y + direction[1] * step }));
  }

  return (
    <div className="plot-canvas">
      <div className="plot-canvas__tools" role="toolbar" aria-label="Plot drawing tools">
        <div className="plot-canvas__toolgroup">
          {onMovePoint && <Tool label="Edit corners" pressed={mode === 'edit'} onClick={() => setMode('edit')} />}
          <Tool label="Pan" icon={HiHand} pressed={mode === 'pan'} onClick={() => setMode(mode === 'pan' ? 'edit' : 'pan')} />
          {onAddPoint && <Tool label="Add corner" icon={HiPlus} disabled={!canAdd} pressed={mode === 'insert'} onClick={() => setMode(mode === 'insert' ? 'edit' : 'insert')} />}
          {onRemovePoint && <Tool label="Remove corner" icon={HiMinus} disabled={!canRemove || currentCorner == null} onClick={() => removeCorner(currentCorner)} />}
        </div>
        <div className="plot-canvas__toolgroup">
          <Tool label="Grid" icon={HiViewGrid} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool label="Snap" icon={HiLocationMarker} title={`Snap to ${formatLength.format(gridUnits)} ${unit}`} pressed={snap} onClick={() => setSnap(!snap)} />
          <Tool label="Angles" pressed={angles} onClick={() => setAngles(!angles)} />
        </div>
        <div className="plot-canvas__toolgroup plot-canvas__zoom">
          <Tool label="Zoom out" icon={HiMinus} iconOnly onClick={() => setCamera((previous) => zoomCamera(previous, navigation.current, 0.8))} />
          <Tool label="Zoom in" icon={HiPlus} iconOnly onClick={() => setCamera((previous) => zoomCamera(previous, navigation.current, 1.25))} />
          <Tool label="Fit" title="Fit plot to drawing" onClick={() => setCamera(null)} />
        </div>
      </div>

      <div className="plot-canvas__drawing">
        <svg
          ref={svgRef}
          aria-label="Interactive two-dimensional plot drawing"
          className={`plot-canvas__svg plot-canvas__svg--${mode}${dragging ? ' is-dragging' : ''}`}
          viewBox={`0 0 ${width} ${height}`}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          {grid && (
            <>
              <defs>
                {[1, 5].map((multiple) => {
                  const space = gridPixels * multiple;
                  return (
                    <pattern key={multiple} id={`${patternId}-${multiple}`} x={origin.x % space} y={origin.y % space} width={space} height={space} patternUnits="userSpaceOnUse">
                      <path d={`M ${space} 0 H 0 V ${space}`} className={`plot-canvas__grid plot-canvas__grid--${multiple}`} />
                    </pattern>
                  );
                })}
              </defs>
              <rect width={width} height={height} fill={`url(#${patternId}-1)`} />
              <rect width={width} height={height} fill={`url(#${patternId}-5)`} />
            </>
          )}

          {outline.length >= 3 && <polygon points={asPolygon(outline)} className="plot-canvas__parcel" />}
          {outline.length === 2 && <polyline points={asPolygon(outline)} className="plot-canvas__edge" />}

          {items.map((item) => {
            const footprint = item.points.map(project);
            const center = project(item.position || item.points[0]);
            const active = activeItemId === item.id;
            return (
              <g key={item.id} className={`plot-canvas__item plot-canvas__item--${item.kind}${active ? ' is-active' : ''}`}>
                <polygon
                  points={asPolygon(footprint)}
                  className="plot-canvas__footprint"
                  role={onSelectItem ? 'button' : undefined}
                  tabIndex={onSelectItem ? 0 : undefined}
                  aria-label={item.label}
                  aria-pressed={onSelectItem ? active : undefined}
                  onPointerDown={(event) => onItemDown(event, item)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelectItem?.(item.id);
                  }}
                />
                <text x={center.x} y={center.y} className="plot-canvas__item-label">{item.label}</text>
              </g>
            );
          })}

          {measures && outline.map((start, index) => {
            const end = outline[(index + 1) % outline.length];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const edgePixels = Math.hypot(dx, dy) || 1;
            const offset = 17 * winding;
            const labelX = (start.x + end.x) / 2 + dy / edgePixels * offset;
            const labelY = (start.y + end.y) / 2 - dx / edgePixels * offset;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const rotation = angle > 90 ? angle - 180 : angle < -90 ? angle + 180 : angle;
            const front = index === frontEdge;
            const label = edgeLabels[index] || (front ? 'Road' : '');
            const gateWidth = gate?.enabled && front ? Number(gate.width) : 0;
            const gateHalf = gateWidth / measures.sides[index] / 2;
            const gateCenter = Math.min(1 - gateHalf, Math.max(gateHalf, Number(gate?.offset ?? 0.5)));
            const gateFrom = alongEdge(start, end, gateCenter - gateHalf);
            const gateTo = alongEdge(start, end, gateCenter + gateHalf);
            return (
              <g key={index} className={front ? 'plot-canvas__front' : undefined}>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`plot-canvas__edge${wallEnabled ? ' plot-canvas__edge--wall' : ''}`} />
                {gateHalf > 0 && gateHalf <= 0.5 && Number.isFinite(gateCenter) && (
                  <g>
                    <title>Entrance gate</title>
                    <line x1={gateFrom.x} y1={gateFrom.y} x2={gateTo.x} y2={gateTo.y} className="plot-canvas__gate-gap" />
                    <line x1={gateFrom.x} y1={gateFrom.y} x2={gateTo.x} y2={gateTo.y} className="plot-canvas__gate" />
                  </g>
                )}
                <text x={labelX} y={labelY} transform={`rotate(${rotation} ${labelX} ${labelY})`} className="plot-canvas__dimension">
                  {label && `${label} · `}{formatLength.format(measures.sides[index] * unitFactor)} {unit}
                </text>
              </g>
            );
          })}

          {outline.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={12}
                className="plot-canvas__corner-hit"
                role={onMovePoint || onRemovePoint ? 'button' : undefined}
                tabIndex={onMovePoint || onRemovePoint ? 0 : undefined}
                aria-label={`Corner ${cornerName(index)}${measures ? `, ${formatAngle.format(measures.angles[index])} degrees` : ''}`}
                aria-pressed={onMovePoint || onRemovePoint ? currentCorner === index : undefined}
                onFocus={() => setSelectedCorner(index)}
                onPointerDown={(event) => onCornerDown(event, index)}
                onKeyDown={(event) => onCornerKey(event, index)}
              />
              <circle cx={point.x} cy={point.y} r={currentCorner === index ? 6 : 4.5} className={`plot-canvas__corner${currentCorner === index ? ' is-active' : ''}`} />
              <text x={point.x} y={point.y - 12} className="plot-canvas__corner-label">
                {cornerName(index)}{angles && measures && ` · ${formatAngle.format(measures.angles[index])}°`}
              </text>
            </g>
          ))}

          {outline.length >= 3 && (
            <g className="plot-canvas__reference" aria-hidden="true">
              <g transform={`translate(${width - 32} 36) rotate(${northAngle})`}>
                <path d="M 0 -13 L 6 9 L 0 5 L -6 9 Z" />
                <text x="0" y="-21" transform={`rotate(${-northAngle} 0 -21)`}>N</text>
              </g>
              <g transform={`translate(15 ${height - 15})`}>
                <path d={`M 0 -7 V 0 H ${scalePixels} V -7`} className="plot-canvas__scale" />
                <text x={scalePixels / 2} y="-9">{formatLength.format(scaleUnits)} {unit}</text>
              </g>
            </g>
          )}
        </svg>
        {points.length === 0 && <p className="plot-canvas__empty">{mode === 'insert' && allowDraft ? 'Click to place the first corner.' : emptyMessage}</p>}
      </div>

      {mode === 'insert' && (
        <p className="plot-canvas__hint">
          {points.length < 3 ? 'Click to place a corner.' : 'Click along a boundary to add a corner, then drag it into position.'}
        </p>
      )}
    </div>
  );
}

function zoomCamera(previous, { width, height, fitKey, fitted }, factor, x = width / 2, y = height / 2) {
  const view = previous?.fitKey === fitKey ? previous?.view || fitted : fitted;
  const scale = Math.max(fitted.scale * 0.1, Math.min(fitted.scale * 30, view.scale * factor));
  return {
    fitKey,
    view: {
      x: view.x + (x - width / 2) * (1 / view.scale - 1 / scale),
      y: view.y + (y - height / 2) * (1 / view.scale - 1 / scale),
      scale,
    },
  };
}

function Tool({ label, icon: Icon, iconOnly, title = label, pressed, ...options }) {
  return (
    <button type="button" className="plot-canvas__tool" aria-label={label} aria-pressed={pressed} title={title} {...options}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {!iconOnly && label}
    </button>
  );
}
