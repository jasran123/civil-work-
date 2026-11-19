import { Component, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { HiArrowDown, HiArrowLeft, HiArrowRight, HiArrowUp } from 'react-icons/hi';
import { useDesign } from '../context/DesignContext';
import { getFloorDetails, getFloorLayouts } from '../utils/projectState';
import { getPlotSceneData } from '../utils/plotProject';
import { plotRectangle } from '../utils/plotGeometry';
import ArchitecturalLighting, { configureArchitectureRenderer } from '../three/ArchitecturalLighting';
import { getFloorLevels, getLastOccupiedFloor, WALK_EYE_HEIGHT } from '../three/architecture';
import { CAMERA_PRESETS, getCameraPose } from '../three/architecturalView';
import HouseModel from '../three/HouseModel';
import PlotScene from '../three/PlotScene';
import WalkthroughCamera from '../three/WalkthroughCamera';

const EMPTY_ROOMS = [];
const DIRECTIONS = [[HiArrowUp, 'ArrowUp', 'Walk forward'], [HiArrowLeft, 'ArrowLeft', 'Walk left'], [HiArrowDown, 'ArrowDown', 'Walk backward'], [HiArrowRight, 'ArrowRight', 'Walk right']];

function boundsOf(layouts, detailing, width, depth) {
  const furniture = detailing.flatMap((detail) => detail.furniture || []);
  const walls = detailing.flatMap((detail) => detail.walls || []);
  const coordinates = [
    ...layouts.flat().flatMap(({ x, y, width: w, height: d }) => [[x, y], [x + w, y + d]]),
    ...furniture.flatMap((item) => plotRectangle(item).map(({ x, y }) => [x, y])),
    ...walls.flatMap(({ x1, y1, x2, y2 }) => [[x1, y1], [x2, y2]]),
  ].filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  return coordinates.length ? {
    minX: Math.min(...coordinates.map(([x]) => x)) - width / 2,
    maxX: Math.max(...coordinates.map(([x]) => x)) - width / 2,
    minZ: Math.min(...coordinates.map(([, y]) => y)) - depth / 2,
    maxZ: Math.max(...coordinates.map(([, y]) => y)) - depth / 2,
  } : { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 };
}

function saveViewport(gl, scene, camera) {
  return new Promise((resolve) => {
    gl.render(scene, camera);
    gl.domElement.toBlob((blob) => {
      if (!blob) { resolve(false); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Dream-Home-3D.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      resolve(true);
    }, 'image/png');
  });
}

function ViewController({ apiRef, cameraView, size, roadFacing, rotate, walking }) {
  const controls = useRef(null);
  const animation = useRef(null);
  const { camera, gl, scene, invalidate, size: viewport } = useThree();
  const mounted = useRef(false);
  const { width, depth, firstY, lastY, centerX, centerZ } = size;
  const { preset, revision } = cameraView;
  const span = Math.max(width, depth, lastY - firstY, 8);

  useEffect(() => {
    if (walking) { animation.current = null; return; }
    const pose = getCameraPose({ preset, width, depth, firstY, lastY, centerX, centerZ, aspect: viewport.width / Math.max(viewport.height, 1), roadFacing });
    if (!mounted.current && controls.current) {
      camera.position.set(...pose.position);
      controls.current.target.set(...pose.target);
      controls.current.update();
      mounted.current = true;
    } else {
      animation.current = { position: new Vector3(...pose.position), target: new Vector3(...pose.target) };
    }
    invalidate();
  }, [camera, centerX, centerZ, depth, firstY, invalidate, lastY, preset, revision, roadFacing, viewport.height, viewport.width, walking, width]);

  useEffect(() => {
    const zoom = (factor) => {
      const orbit = controls.current;
      if (!orbit) return;
      animation.current = null;
      const offset = camera.position.clone().sub(orbit.target);
      const distance = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, offset.length() * factor));
      camera.position.copy(orbit.target).add(offset.setLength(distance));
      orbit.update();
      invalidate();
    };
    const actions = { zoomIn: () => zoom(0.8), zoomOut: () => zoom(1.25), exportPNG: () => saveViewport(gl, scene, camera) };
    apiRef.current = actions;
    return () => { if (apiRef.current === actions) apiRef.current = null; };
  }, [apiRef, camera, gl, invalidate, scene]);

  useFrame((_, delta) => {
    const frame = animation.current;
    if (!frame || !controls.current) return;
    const ease = 1 - Math.exp(-10 * delta);
    camera.position.lerp(frame.position, ease);
    controls.current.target.lerp(frame.target, ease);
    if (camera.position.distanceToSquared(frame.position) < 0.0025 && controls.current.target.distanceToSquared(frame.target) < 0.0025) animation.current = null;
    controls.current.update();
    if (animation.current) invalidate();
  });

  if (walking) return null;
  return (
    <OrbitControls ref={controls} enableDamping dampingFactor={0.09} autoRotate={rotate} autoRotateSpeed={1.3}
      minDistance={Math.max(2, span * 0.06)} maxDistance={span * 13} maxPolarAngle={Math.PI * 0.498}
      zoomSpeed={0.85} onStart={() => { animation.current = null; }} />
  );
}

function AmbientContact({ enabled, span, y, layout }) {
  const renderer = useThree((state) => state.gl);
  if (!enabled || !renderer.capabilities.isWebGL2) return null;
  return <ContactShadows key={layout} position={[0, y, 0]} frames={1} resolution={256} scale={span * 2.2} far={Math.max(8, span * 0.45)} blur={1.9} opacity={0.27} color="#4a5c72" />;
}

class ViewportErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Unavailable /> : this.props.children; }
}

function Unavailable() {
  return <div className="workspace-scene-empty" role="status">3D rendering is unavailable on this device. The 2D planner is available.</div>;
}

export default function Designer3D({ settings, cameraView, activeFloor, siteView, rotate, apiRef, selectedObject, onSelectionChange, keyboardActive }) {
  const { design } = useDesign();
  const layouts = useMemo(() => getFloorLayouts(design), [design.floorLayouts, design.floors, design.rooms, design.plans, design.currentPlanIndex]);
  const details = useMemo(() => getFloorDetails(design), [design.floorDetails, design.floorLayouts, design.floors]);
  const site = useMemo(() => siteView ? getPlotSceneData(design) : null, [siteView, design]);
  const touchInput = useRef(new Set());
  const width = design.landLength || 40;
  const depth = design.landWidth || 30;
  const levels = getFloorLevels(layouts.length, 10, details.map((level) => level.height));
  const floor = Math.max(0, Math.min(activeFloor, levels.length - 1));
  const level = levels[floor] || { elevation: 0, height: 10, clearHeight: 9.64 };
  const activeRooms = layouts[floor] || EMPTY_ROOMS;
  const hasFloorModel = layouts.some((rooms, index) => rooms.length || details[index]?.walls?.length || details[index]?.furniture?.length);
  const walking = cameraView.preset === 'walkthrough' && !site;
  const showAll = settings.showAllFloors && !walking;
  const modelBounds = boundsOf(showAll ? layouts : [activeRooms], showAll ? details : [details[floor] || {}], width, depth);
  const highest = getLastOccupiedFloor(layouts, details);
  const top = levels[Math.max(0, highest)];
  const maxElevation = top ? top.elevation + top.height : 10;
  const size = {
    firstY: showAll ? 0 : level.elevation,
    lastY: showAll ? maxElevation : level.elevation + level.height,
    width: Math.max(modelBounds.maxX - modelBounds.minX, 4),
    depth: Math.max(modelBounds.maxZ - modelBounds.minZ, 4),
    centerX: (modelBounds.minX + modelBounds.maxX) / 2,
    centerZ: (modelBounds.minZ + modelBounds.maxZ) / 2,
  };
  const occupied = activeRooms.filter(({ type }) => type !== 'parking' && type !== 'balcony' && type !== 'staircase');
  const walkStart = occupied.find(({ type }) => type === 'hall') || occupied.reduce((biggest, room) => !biggest || room.width * room.height > biggest.width * biggest.height ? room : biggest, null);
  const eyeHeight = level.elevation + Math.min(WALK_EYE_HEIGHT, level.clearHeight - 0.5);
  const walkPosition = walkStart ? [walkStart.x + walkStart.width / 2 - width / 2, eyeHeight, walkStart.y + walkStart.height / 2 - depth / 2] : [size.centerX, eyeHeight, size.centerZ];
  const modelHeight = Math.max(maxElevation, 10);
  const span = Math.max(size.width, size.depth, modelHeight, 8);
  const selectedFloor = showAll ? null : floor;

  useEffect(() => {
    if (!walking) touchInput.current.clear();
  }, [walking]);

  if (site) return <div className="workspace-site-view"><PlotScene {...site} apiRef={apiRef} houseView={{ ...settings, visibleFloor: selectedFloor, selectedObject, onSelectObject: onSelectionChange }} /></div>;
  if (!hasFloorModel) return <div className="workspace-scene-empty">Add a room or draw a wall in 2D to begin the 3D model.</div>;

  return (
    <div className="workspace-renderer" aria-label="3D architectural model">
      <ViewportErrorBoundary>
        <Canvas
          dpr={[1, settings.shadowQuality === 'high' ? 1.75 : 1.4]}
          shadows={settings.shadowQuality !== 'off'}
          frameloop={walking || rotate ? 'always' : 'demand'}
          camera={{ position: [45, 38, -48], fov: 43, near: 0.08, far: span * 20 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          onCreated={({ gl }) => configureArchitectureRenderer(gl)}
          fallback={<Unavailable />}
        >
          <ArchitecturalLighting settings={settings} span={span} height={modelHeight} />
          {settings.mode === 'night' && levels.filter((_, index) => showAll ? index <= highest : floor === index).slice(0, 5).map(({ elevation, clearHeight }) => (
            <pointLight key={elevation} position={[size.centerX, elevation + clearHeight - 0.65, size.centerZ]} color="#ffe4bf" intensity={38} distance={span * 0.9} />
          ))}
          <HouseModel
            rooms={layouts[0] || EMPTY_ROOMS} floorLayouts={layouts} floorDetails={details} floorHeights={details.map((item) => item.height)}
            floors={layouts.length} visibleFloor={selectedFloor} landLength={width} landWidth={depth}
            roadFacing={design.roadFacing} roofMode={settings.roofMode} cutaway={settings.cutaway && !walking} showWalls={settings.showWalls}
            wallColor={design.wallColor} floorColor={design.floorColor} ceilingColor={design.ceilingColor} roofColor={design.roofColor} roofStyle={design.roofStyle}
            wallMaterial={design.wallMaterial} floorMaterial={design.floorMaterial} ceilingMaterial={design.ceilingMaterial}
            showFurniture={design.showFurniture !== false} furnitureTheme={settings.furnitureTheme}
            selectedObject={selectedObject} onSelectObject={walking ? undefined : onSelectionChange}
          />
          <AmbientContact enabled={settings.ambientOcclusion && !walking} span={span} y={(showAll ? 0 : level.elevation) + 0.012} layout={`${layouts.map((rooms) => rooms.map(({ x, y, width: w, height: d }) => `${x}/${y}/${w}/${d}`).join(';')).join('|')}-${selectedFloor}-${settings.cutaway}-${settings.roofMode}`} />
          <ViewController apiRef={apiRef} cameraView={cameraView} size={size} roadFacing={design.roadFacing} rotate={rotate} walking={walking} />
          {walking && <WalkthroughCamera initialPosition={walkPosition} bounds={modelBounds} touchInput={touchInput} keyboardActive={keyboardActive} bearing={({ North: 180, South: 0, East: 270, West: 90 })[design.roadFacing]} />}
        </Canvas>
      </ViewportErrorBoundary>
      <div className="workspace-viewport-guide">{walking ? 'WASD or arrows to walk · Drag to look' : 'Drag to orbit · Scroll to zoom · Right-drag to pan'}</div>
      {walking && <div className="workspace-walk-pad" role="group" aria-label="Walkthrough movement">
        {DIRECTIONS.map(([Icon, key, label]) => <button key={key} aria-label={label} type="button"
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); touchInput.current.add(key); }}
          onLostPointerCapture={() => touchInput.current.delete(key)} onPointerUp={() => touchInput.current.delete(key)}
          onPointerCancel={() => touchInput.current.delete(key)}><Icon size={17} /></button>)}
      </div>}
      <span className="sr-only">Camera view {CAMERA_PRESETS[cameraView.preset]}</span>
    </div>
  );
}
