import { Component, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { ContactShadows, OrbitControls, Html, Line } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { MathUtils, Shape } from 'three';
import { polygonBounds } from '../utils/plotGeometry';
import HouseModel from './HouseModel';
import ArchitecturalLighting, { configureArchitectureRenderer } from './ArchitecturalLighting';
import { DEFAULT_VIEW_SETTINGS } from './architecturalView';
import { getFloorLevels, getLastOccupiedFloor } from './architecture';

const DEG_TO_RAD = Math.PI / 180;
const SURFACE_DEPTH = 0.45;

function getSceneGeometry(points) {
  const { minX, minY, width, height } = polygonBounds(points);
  const center = { x: minX + width / 2, y: minY + height / 2 };
  const localPoints = points.map(({ x, y }) => ({ x: x - center.x, y: y - center.y }));
  const shape = new Shape();
  shape.moveTo(localPoints[0].x, -localPoints[0].y);
  localPoints.slice(1).forEach(({ x, y }) => shape.lineTo(x, -y));
  shape.closePath();

  const edges = localPoints.map((start, index) => {
    const end = localPoints[(index + 1) % localPoints.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return { start, end, dx, dy, length: Math.hypot(dx, dy), rotation: -Math.atan2(dy, dx) };
  });
  const signedArea = edges.reduce((sum, { start, end }) => sum + start.x * end.y - end.x * start.y, 0);

  return {
    center,
    localPoints,
    shape,
    edges,
    winding: Math.sign(signedArea) || 1,
    span: Math.max(width, height, 4),
    compassPosition: [minX - center.x, 0.06, minY - center.y],
  };
}

function coordinateAlongEdge(edge, distance) {
  return [edge.start.x + edge.dx * (distance / edge.length), edge.start.y + edge.dy * (distance / edge.length)];
}

function BoundaryWall({ edge, start, end, height, thickness }) {
  const length = end - start;
  if (length <= 0.001) return null;
  const [x, z] = coordinateAlongEdge(edge, (start + end) / 2);
  const capHeight = Math.min(0.16, height * 0.2);
  const bodyHeight = height - capHeight;

  return (
    <group position={[x, 0, z]} rotation={[0, edge.rotation, 0]}>
      <mesh position={[0, bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, bodyHeight, thickness]} />
        <meshStandardMaterial color="#ded9cd" roughness={0.88} />
      </mesh>
      <mesh position={[0, height - capHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, capHeight, thickness * 1.28]} />
        <meshStandardMaterial color="#a9a9a4" roughness={0.78} />
      </mesh>
    </group>
  );
}

function EntranceGate({ edge, opening, height }) {
  const gateWidth = opening.end - opening.start;
  const postWidth = Math.min(0.65, gateWidth * 0.14);
  const leafWidth = gateWidth - postWidth * 2;
  const leafHeight = height * 0.67;
  const barCount = Math.max(2, Math.min(36, Math.ceil(leafWidth / 0.8)));
  const [x, z] = coordinateAlongEdge(edge, (opening.start + opening.end) / 2);

  return (
    <group position={[x, 0, z]} rotation={[0, edge.rotation, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (gateWidth - postWidth) / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[postWidth, height, postWidth]} />
          <meshStandardMaterial color="#ded9cd" roughness={0.8} />
        </mesh>
      ))}
      {[0.17, 0.75].map((level) => (
        <mesh key={level} position={[0, height * level, 0]} castShadow>
          <boxGeometry args={[leafWidth, Math.min(0.15, height * 0.09), 0.14]} />
          <meshStandardMaterial color="#38454c" roughness={0.54} metalness={0.25} />
        </mesh>
      ))}
      {Array.from({ length: barCount }, (_, index) => (
        <mesh key={index} position={[leafWidth * ((index + 0.5) / barCount - 0.5), height * 0.46, 0]} castShadow>
          <boxGeometry args={[Math.min(0.11, leafWidth / barCount / 2), leafHeight, 0.1]} />
          <meshStandardMaterial color="#38454c" roughness={0.54} metalness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Frontage({ edge, winding, span }) {
  const roadWidth = MathUtils.clamp(span * 0.22, 4, 18);
  const outwardX = winding * edge.dy / edge.length;
  const outwardZ = -winding * edge.dx / edge.length;
  const [midX, midZ] = coordinateAlongEdge(edge, edge.length / 2);
  const midRoadX = midX + outwardX * roadWidth / 2;
  const midRoadZ = midZ + outwardZ * roadWidth / 2;
  const dashCount = Math.max(1, Math.min(35, Math.round(edge.length / 7)));
  const dashSpacing = edge.length / dashCount;

  return (
    <group position={[midRoadX, -0.06, midRoadZ]} rotation={[0, edge.rotation, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[edge.length, 0.06, roadWidth]} />
        <meshStandardMaterial color="#37424b" roughness={0.94} />
      </mesh>
      {Array.from({ length: dashCount }, (_, index) => (
        <mesh key={index} position={[(index + 0.5) * dashSpacing - edge.length / 2, 0.035, 0]}>
          <boxGeometry args={[dashSpacing * 0.52, 0.01, Math.min(0.24, roadWidth * 0.055)]} />
          <meshBasicMaterial color="#e8c678" />
        </mesh>
      ))}
      <Html center position={[0, 0.36, 0]} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-xs font-semibold text-amber-100">
          Road frontage
        </span>
      </Html>
    </group>
  );
}

function NorthMarker({ position, span, angle }) {
  const size = MathUtils.clamp(span * 0.09, 1.5, 14);
  const [x, y, z] = position;

  return (
    <group position={[x - size * 0.85, y, z - size * 0.85]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.62, 36]} />
        <meshBasicMaterial color="#263946" />
      </mesh>
      <group rotation={[0, -angle * DEG_TO_RAD, 0]}>
        <mesh position={[0, 0.05, size * 0.1]}>
          <boxGeometry args={[size * 0.1, 0.04, size * 0.55]} />
          <meshBasicMaterial color="#fcd68d" />
        </mesh>
        <mesh position={[0, 0.06, -size * 0.23]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[size * 0.18, size * 0.34, 3]} />
          <meshBasicMaterial color="#fcd68d" />
        </mesh>
        <Html center position={[0, 0.12, -size * 0.74]} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <span className="rounded-md bg-slate-950/90 px-2 py-1 text-xs font-bold text-amber-100" title="North">N</span>
        </Html>
      </group>
    </group>
  );
}

function SiteItem({ item, center, design, view, wallHeight }) {
  const { kind, position, width, depth, rotation = 0, rooms = [], floorLayouts, floorDetails } = item;
  if (!position || !(width > 0 && depth > 0)) return null;

  const shrubSize = Math.min(width, depth) * 0.12;

  return (
    <group position={[position.x - center.x, 0, position.y - center.y]} rotation={[0, -rotation * DEG_TO_RAD, 0]}>
      {kind === 'house' && (
        <HouseModel
          rooms={rooms}
          floorLayouts={floorLayouts}
          floorDetails={floorDetails}
          landLength={width}
          landWidth={depth}
          wallColor={design.wallColor}
          floorColor={design.floorColor}
          ceilingColor={design.ceilingColor}
          wallMaterial={design.wallMaterial}
          floorMaterial={design.floorMaterial}
          ceilingMaterial={design.ceilingMaterial}
          roofStyle={design.roofStyle}
          roofColor={design.roofColor}
          roofMode={view.roofMode ?? design.roofMode ?? 'solid'}
          cutaway={view.cutaway}
          showWalls={view.showWalls !== false}
          visibleFloor={view.showAllFloors === false ? view.visibleFloor ?? design.activeFloor ?? 0 : null}
          showFurniture={design.showFurniture !== false}
          furnitureTheme={view.furnitureTheme ?? design.furnitureTheme}
          floors={design.floors || 1}
          selectedObject={view.selectedObject}
          onSelectObject={view.onSelectObject}
          includeSite={false}
        />
      )}
      {kind === 'parking' && (
        <>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[width, 0.1, depth]} />
            <meshStandardMaterial color="#667482" roughness={0.9} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * width * 0.33, 0.104, 0]}>
              <boxGeometry args={[Math.min(0.14, width * 0.05), 0.008, depth * 0.8]} />
              <meshBasicMaterial color="#f4e9c8" />
            </mesh>
          ))}
        </>
      )}
      {kind === 'garden' && (
        <>
          <mesh position={[0, 0.1, 0]} receiveShadow>
            <boxGeometry args={[width, 0.2, depth]} />
            <meshStandardMaterial color="#538050" roughness={0.95} />
          </mesh>
          {[-1, 0, 1].map((side) => (
            <mesh key={side} position={[side * width * 0.28, shrubSize * 0.55, -depth * 0.18]} castShadow>
              <sphereGeometry args={[shrubSize, 10, 8]} />
              <meshStandardMaterial color={side === 0 ? '#729d54' : '#396039'} roughness={0.93} />
            </mesh>
          ))}
        </>
      )}
      {kind === 'wall' && (
        <mesh position={[0, (item.height || wallHeight) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, item.height || wallHeight, depth]} />
          <meshStandardMaterial color="#b8aaa0" roughness={0.83} />
        </mesh>
      )}
    </group>
  );
}

function PlotContact({ enabled, span }) {
  const supported = useThree((state) => state.gl.capabilities?.isWebGL2);
  return enabled && supported ? <ContactShadows position={[0, 0.019, 0]} frames={1} resolution={256}
    scale={span * 1.4} far={Math.max(8, span * 0.45)} blur={2} opacity={0.22} color="#43556a" /> : null;
}

function PlotContents({ geometry, frontEdge, gate, northAngle, wallEnabled, wallHeight, items, design, view, buildingHeight }) {
  const { shape, localPoints, center, span, winding, edges, compassPosition } = geometry;
  const frontIndex = edges[frontEdge] ? frontEdge : 0;
  const front = edges[frontIndex];
  const gateWidth = MathUtils.clamp(gate?.width ?? 10, 0, front.length);
  const gateCenter = MathUtils.clamp(front.length * (gate?.offset ?? 0.5), gateWidth / 2, front.length - gateWidth / 2);
  const opening = gate?.enabled && gateWidth > 0 ? { start: gateCenter - gateWidth / 2, end: gateCenter + gateWidth / 2 } : null;
  const thickness = Math.min(0.7, span * 0.06);
  const contactKey = [localPoints.length, span, frontIndex, wallEnabled, opening?.start, view.roofMode,
    view.showWalls, view.showAllFloors, view.visibleFloor, ...items.map(({ x, y, rotation, width, depth }) => [x, y, rotation, width, depth].join(','))].join(':');

  return (
    <>
      <ArchitecturalLighting settings={{ ...view, sunAzimuth: (view.sunAzimuth ?? DEFAULT_VIEW_SETTINGS.sunAzimuth) + northAngle }}
        span={span} height={buildingHeight} />
      <mesh position={[0, -SURFACE_DEPTH, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <extrudeGeometry args={[shape, { depth: SURFACE_DEPTH, bevelEnabled: false }]} />
        <meshStandardMaterial attach="material-0" color="#8ca47b" roughness={0.93} />
        <meshStandardMaterial attach="material-1" color="#5d6f53" roughness={0.93} />
      </mesh>
      <Line points={[...localPoints, localPoints[0]].map(({ x, y }) => [x, 0.025, y])} color="#e7e9d4" lineWidth={1.5} />
      <Line points={[[front.start.x, 0.04, front.start.y], [front.end.x, 0.04, front.end.y]]} color="#ecc778" lineWidth={3} />
      <Frontage edge={front} winding={winding} span={span} />
      {wallEnabled && edges.map((edge, index) => {
        const segments = opening && index === frontIndex ? [[0, opening.start], [opening.end, edge.length]] : [[0, edge.length]];
        return segments.map(([start, end], segment) => (
          <BoundaryWall key={`${index}-${segment}`} edge={edge} start={start} end={end} height={wallHeight} thickness={thickness} />
        ));
      })}
      {opening && <EntranceGate edge={front} opening={opening} height={wallHeight} />}
      <NorthMarker position={compassPosition} span={span} angle={northAngle} />
      {items.map((item) => <SiteItem key={item.id} item={item} center={center} design={design} view={view} wallHeight={wallHeight} />)}
      <PlotContact key={contactKey} enabled={view.ambientOcclusion ?? DEFAULT_VIEW_SETTINGS.ambientOcclusion} span={span} />
    </>
  );
}

function setCameraView(controls, span, view, front, winding, centerY) {
  const { object: camera, target } = controls;
  const distance = span * Math.max(1, 0.9 / camera.aspect);

  if (view === 'zoom-in' || view === 'zoom-out') {
    const offset = camera.position.clone().sub(target);
    const scale = view === 'zoom-in' ? 0.78 : 1.28;
    offset.setLength(MathUtils.clamp(offset.length() * scale, controls.minDistance, controls.maxDistance));
    camera.position.copy(target).add(offset);
  } else {
    target.set(0, centerY, 0);
    const aheadX = front ? winding * front.dy / front.length : 0;
    const aheadZ = front ? -winding * front.dx / front.length : 1;
    const horizontal = { front: [aheadX, aheadZ], back: [-aheadX, -aheadZ], left: [aheadZ, -aheadX], right: [-aheadZ, aheadX] };
    if (view === 'top') camera.position.set(0, centerY + distance * 1.95, distance * 0.001);
    else if (horizontal[view]) {
      const [x, z] = horizontal[view];
      camera.position.set(x * distance * 1.95, centerY + distance * 0.12, z * distance * 1.95);
    } else camera.position.set(distance * 1.13, centerY + distance * 1.13, distance * 1.28);
  }

  controls.update();
}

function SiteControls({ controlsRef, span, front, winding, centerY, apiRef, rotate }) {
  const { camera, size, scene, gl, invalidate } = useThree();

  useEffect(() => {
    camera.near = Math.max(0.001, span / 2500);
    camera.far = Math.max(180, span * 45);
    camera.updateProjectionMatrix();
    if (controlsRef.current) setCameraView(controlsRef.current, span, 'fit', front, winding, centerY);
  }, [camera, controlsRef, size.width, size.height, span, front, winding, centerY]);

  useImperativeHandle(apiRef, () => {
    const switchView = (view) => {
      if (!controlsRef.current) return;
      setCameraView(controlsRef.current, span, view, front, winding, centerY);
      invalidate();
    };
    return {
      setCameraView: switchView,
      zoomIn: () => switchView('zoom-in'),
      zoomOut: () => switchView('zoom-out'),
      exportPNG: () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png');
      },
    };
  }, [camera, controlsRef, gl, invalidate, scene, span, front, winding, centerY]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      autoRotate={rotate}
      autoRotateSpeed={1.3}
      dampingFactor={0.09}
      maxPolarAngle={Math.PI / 2.04}
      minDistance={Math.max(0.15, span * 0.05)}
      maxDistance={span * 14}
    />
  );
}

function UnavailableScene() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-200" role="status">
      The 3D preview requires WebGL. The 2D plot editor is available through the land designer.
    </div>
  );
}

class SceneErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <UnavailableScene /> : this.props.children;
  }
}

const viewActions = [
  { label: 'Fit plot', view: 'fit' },
  { label: 'Top view', view: 'top' },
  { label: '+', title: 'Zoom in', view: 'zoom-in' },
  { label: '−', title: 'Zoom out', view: 'zoom-out' },
];

export default function PlotScene({
  points,
  frontEdge = 0,
  gate,
  northAngle = 0,
  wallEnabled = true,
  wallHeight = 4,
  items = [],
  design = {},
  houseView = {},
  className = '',
  apiRef,
  showHud = !apiRef,
  rotate = false,
}) {
  const controlsRef = useRef(null);
  const geometry = useMemo(() => points?.length >= 3 ? getSceneGeometry(points) : null, [points]);
  const view = { ...design.houseView, ...houseView };
  const house = items.find((item) => item.kind === 'house');
  const levels = house ? getFloorLevels(house.floorLayouts?.length || design.floors, undefined, house.floorDetails?.map((detail) => detail.height)) : [];
  const topIndex = house?.floorLayouts ? getLastOccupiedFloor(house.floorLayouts, house.floorDetails) : levels.length - 1;
  const lastLevel = levels[topIndex];
  const buildingHeight = lastLevel ? lastLevel.elevation + lastLevel.height : wallHeight;
  const selectedLevel = view.showAllFloors === false && levels[view.visibleFloor ?? design.activeFloor ?? 0];
  const centerY = selectedLevel ? selectedLevel.elevation + selectedLevel.clearHeight / 2 : buildingHeight * 0.28;

  if (!geometry) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl bg-slate-950 p-6 text-center text-sm text-slate-200" role="status">
        Complete the plot measurements to see the 3D site.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="3D plot preview"
      className={`relative h-[clamp(25rem,60vh,43rem)] overflow-hidden rounded-2xl bg-[#14242d] ${className}`}
    >
      <SceneErrorBoundary>
        <Canvas shadows={view.shadowQuality !== 'off'} frameloop={rotate ? 'always' : 'demand'} dpr={[1, view.shadowQuality === 'high' ? 1.75 : 1.4]}
          camera={{ position: [20, 20, 20], fov: 43 }}
          onCreated={({ gl }) => configureArchitectureRenderer(gl)} fallback={<UnavailableScene />}>
          <PlotContents
            geometry={geometry}
            frontEdge={frontEdge}
            gate={gate}
            northAngle={northAngle}
            wallEnabled={wallEnabled}
            wallHeight={wallHeight}
            items={items}
            design={design}
            view={view}
            buildingHeight={buildingHeight}
          />
          <SiteControls controlsRef={controlsRef} span={Math.max(geometry.span, buildingHeight)}
            front={geometry.edges[frontEdge]} winding={geometry.winding} centerY={centerY} apiRef={apiRef} rotate={rotate} />
        </Canvas>
        {showHud && <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-1 rounded-xl border border-white/15 bg-slate-950/80 p-1.5">
          {viewActions.map(({ label, title, view }) => (
            <button
              key={view}
              type="button"
              title={title || label}
              aria-label={title || label}
              onClick={() => controlsRef.current && setCameraView(controlsRef.current, Math.max(geometry.span, buildingHeight), view,
                geometry.edges[frontEdge], geometry.winding, centerY)}
              className="min-w-8 rounded-md px-2 py-1 text-sm font-semibold text-slate-100 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              {label}
            </button>
          ))}
        </div>}
        {showHud && <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md bg-slate-950/85 px-2.5 py-1.5 text-xs text-slate-100">
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </div>}
      </SceneErrorBoundary>
    </div>
  );
}
