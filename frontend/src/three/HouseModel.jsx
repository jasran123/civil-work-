import { useMemo } from 'react';
import {
  SofaSet3D, CoffeeTable3D, TVUnit3D, AreaRug3D, BedSet3D, CeilingFan3D,
  ModularKitchen3D, BathroomFixtures3D, DiningTableSet3D, CarPorch3D,
} from './Furniture3D';
import { BalconyRails, BuildingRoof, LowerDecks, Staircase } from './ArchitectureExterior';
import { Finish, SelectionBorder, SolidBox, TiledBox } from './ArchitectureMeshes';
import { DrawnWall, RoomWalls } from './ArchitectureWalls';
import { DEFAULT_FLOOR_HEIGHT, FLOOR_SLAB_THICKNESS, getBuildingLayouts, getFloorLevels, getFloorSurfaces, getLastOccupiedFloor, getRoomBounds } from './architecture';

const EMPTY = [];
const NO_DETAILS = {};
const FLOOR_COLORS = { wood: '#dbc2a7', tile: '#edf0ec', concrete: '#c5c9c8' };

function FurnitureShape({ type, width, depth, color }) {
  const base = color || (type === 'bed' ? '#e9dfd4' : '#947559');
  const isSeat = type === 'sofa' || type === 'chair';
  const isBed = type === 'bed';
  const upholstered = isBed || isSeat;
  const slab = upholstered ? 0.28 : 0.15;
  const height = isBed ? 1.6 : isSeat ? 1.55 : 2.45;
  const leg = Math.min(0.17, width * 0.15, depth * 0.15);

  if (type === 'plant') {
    const radius = Math.min(width, depth) / 2;
    return (
      <>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.8, radius * 0.52, 1.2, 14]} />
          <meshStandardMaterial color={color || '#b17e65'} roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.65, 0]} scale={[radius, 0.85, radius]} castShadow>
          <sphereGeometry args={[1, 9, 8]} />
          <meshStandardMaterial color="#4f865c" roughness={0.86} />
        </mesh>
      </>
    );
  }
  return (
    <>
      <SolidBox size={[width, slab, depth]} position={[0, height - slab / 2, 0]} color={base}>
        {!upholstered && <Finish style="wood" color={base} />}
      </SolidBox>
      {[-1, 1].flatMap((front) => [-1, 1].map((side) => (
        <SolidBox key={front + ':' + side} size={[leg, height - slab, leg]}
          position={[side * (width / 2 - leg), (height - slab) / 2, front * (depth / 2 - leg)]} color="#504239" />
      )))}
      {upholstered && <SolidBox size={[width, isBed ? 1.15 : 1.5, Math.min(0.38, depth * 0.25)]}
        position={[0, height + (isBed ? 0.35 : 0.64), -depth / 2 + Math.min(0.19, depth * 0.125)]} color={base} />}
      {isBed && [-1, 1].map((side) => <SolidBox key={side} size={[width * 0.36, 0.22, depth * 0.19]}
        position={[side * width * 0.22, height + 0.11, -depth * 0.29]} color="#f7f2ec" />)}
      {type === 'sofa' && [-1, 1].map((side) => <SolidBox key={side} size={[width * 0.12, 0.5, depth * 0.88]}
        position={[side * width * 0.43, height + 0.22, 0]} color={base} />)}
    </>
  );
}

function PlacedFurniture({ item, select, active }) {
  if (![item.x, item.y, item.width, item.depth].every(Number.isFinite) || !(item.width > 0 && item.depth > 0)) return null;
  return (
    <group position={[item.x, 0.016, item.y]} rotation={[0, -(item.rotation || 0) * Math.PI / 180, 0]}
      onPointerDown={select ? (event) => { event.stopPropagation(); select({ kind: 'furniture', id: item.id }); } : undefined}>
      <FurnitureShape type={item.type} width={item.width} depth={item.depth} color={item.color} />
      {active && <SelectionBorder width={item.width} depth={item.depth} origin={[-item.width / 2, -item.depth / 2]} />}
    </group>
  );
}

function RoomFurniture({ room, wallHeight, cutaway, theme }) {
  const { width, height } = room;
  return (
    <group position={[room.x + width / 2, 0.015, room.y + height / 2]}>
      {room.type === 'hall' && (
        <group scale={[Math.min(1, width / 10), 1, Math.min(1, height / 9)]}>
          <SofaSet3D theme={theme} /><CoffeeTable3D />
          <AreaRug3D width={Math.min(7, width * 0.7)} length={Math.min(5, height * 0.6)} />
          <group position={[0, 0, Math.min(2.8, height / 2 - 1)]}><TVUnit3D roomWidth={width} /></group>
        </group>
      )}
      {room.type === 'bedroom' && <><BedSet3D roomWidth={width} roomHeight={height} />{!cutaway && <CeilingFan3D wallHeight={wallHeight} />}</>}
      {room.type === 'kitchen' && <ModularKitchen3D roomWidth={width} roomHeight={height} />}
      {room.type === 'bathroom' && <BathroomFixtures3D roomWidth={width} roomHeight={height} />}
      {room.type === 'dining' && <group scale={[Math.min(1, width / 8), 1, Math.min(1, height / 7)]}><DiningTableSet3D /></group>}
      {room.type === 'parking' && <CarPorch3D roomWidth={width} roomHeight={height} />}
      {room.type === 'study' && <FurnitureShape type="desk" width={Math.min(3.2, width * 0.7)} depth={Math.min(1.8, height * 0.65)} />}
    </group>
  );
}

function RoomSlab({ surface, floorColor, floorMaterial, ceilingMaterial, ceilingColor, onSelect }) {
  const { room } = surface;
  const style = room.floorMaterial || (room.type === 'bathroom' || room.type === 'balcony' ? 'tile' : floorMaterial);
  const color = room.floorColor || (style === floorMaterial ? floorColor : FLOOR_COLORS[style]) || FLOOR_COLORS[style];
  return (
    <TiledBox width={surface.width} height={FLOOR_SLAB_THICKNESS} depth={surface.height}
      x={surface.x + surface.width / 2} y={-FLOOR_SLAB_THICKNESS / 2} z={surface.y + surface.height / 2}
      style={style} layered onPointerDown={onSelect ? (event) => { event.stopPropagation(); onSelect({ kind: 'room', id: room.id }); } : undefined}>
      <Finish attach="material-0" color="#d5dbdf" style="concrete" />
      <Finish attach="material-1" color={color} style={style} />
      <Finish attach="material-2" color={ceilingColor} style={ceilingMaterial} />
    </TiledBox>
  );
}

function PorchColumns({ room, height, wallColor }) {
  const size = Math.min(0.45, room.width / 4, room.height / 4);
  const inset = size * 0.65;
  return [-1, 1].flatMap((column) => [-1, 1].map((row) => (
    <SolidBox key={column + ':' + row} size={[size, height, size]} color={wallColor}
      position={[room.x + room.width / 2 + column * (room.width / 2 - inset), height / 2, room.y + room.height / 2 + row * (room.height / 2 - inset)]} />
  )));
}

function BuildingFloor({ rooms, previousRooms, level, floor, detail, showStairs, settings, selectedObject, onSelectObject }) {
  const { cutaway, showWalls, showFurniture, furnitureTheme, wallColor, floorColor, wallMaterial, floorMaterial, ceilingMaterial, ceilingColor } = settings;
  const shownHeight = cutaway ? Math.min(3.4, level.clearHeight) : level.clearHeight;
  const surfaces = useMemo(() => getFloorSurfaces(rooms, previousRooms), [rooms, previousRooms]);
  const select = onSelectObject ? (item) => onSelectObject({ ...item, floor }) : undefined;
  const active = selectedObject?.floor === floor ? selectedObject : null;
  const activeRoom = active?.kind === 'room' && rooms.find(({ id }) => id === active.id);

  return (
    <group position={[0, level.elevation, 0]}>
      {surfaces.map((surface, index) => <RoomSlab key={index} surface={surface} floorColor={floorColor} floorMaterial={floorMaterial}
        ceilingMaterial={ceilingMaterial} ceilingColor={ceilingColor} onSelect={select} />)}
      {showWalls && <RoomWalls rooms={rooms} clearHeight={level.clearHeight} shownHeight={shownHeight} select={select}
        defaultColor={wallColor} defaultStyle={wallMaterial} />}
      {showWalls && detail.walls?.map((wall) => <DrawnWall key={wall.id} wall={wall} clearHeight={level.clearHeight}
        shownHeight={shownHeight} select={select} defaultColor={wallColor} defaultStyle={wallMaterial}
        active={active?.kind === 'wall' && active.id === wall.id} />)}
      {rooms.filter((room) => room.type === 'balcony').map((room) => <BalconyRails key={room.id} room={room} />)}
      {rooms.filter((room) => room.type === 'parking').map((room) => <PorchColumns key={room.id} room={room} height={shownHeight} wallColor={wallColor} />)}
      {showStairs && rooms.filter((room) => room.type === 'staircase').map((room) => <Staircase key={room.id} room={room} height={level.height} />)}
      {showFurniture && rooms.map((room) => <RoomFurniture key={room.id} room={room} wallHeight={level.clearHeight} cutaway={cutaway} theme={furnitureTheme} />)}
      {showFurniture && detail.furniture?.map((item) => <PlacedFurniture key={item.id} item={item} select={select}
        active={active?.kind === 'furniture' && active.id === item.id} />)}
      {activeRoom && <SelectionBorder width={activeRoom.width} depth={activeRoom.height} origin={[activeRoom.x, activeRoom.y]} />}
    </group>
  );
}

function HouseSite({ landLength, landWidth, roadFacing }) {
  const eastWest = roadFacing === 'East' || roadFacing === 'West';
  const front = roadFacing === 'South' || roadFacing === 'East';
  const run = (eastWest ? landWidth : landLength) + 30;
  const laneMarkers = Math.max(3, Math.ceil(run / 8));
  const street = eastWest
    ? [front ? landLength + 6.5 : -6.5, -0.035, landWidth / 2]
    : [landLength / 2, -0.035, front ? landWidth + 6.5 : -6.5];

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[landLength / 2, -0.085, landWidth / 2]} receiveShadow>
        <planeGeometry args={[landLength + 42, landWidth + 42]} />
        <meshStandardMaterial color="#92aa84" roughness={0.98} />
      </mesh>
      <TiledBox x={landLength / 2} y={-0.075} z={landWidth / 2} width={landLength + 1.25} height={0.06}
        depth={landWidth + 1.25} style="concrete" color="#c5c9c2" castShadow={false} />
      <group position={street} rotation={[0, eastWest ? Math.PI / 2 : 0, 0]}>
        <SolidBox size={[run, 0.05, 10]} color="#616970" castShadow={false} />
        {Array.from({ length: laneMarkers }, (_, index) => <SolidBox key={index} size={[3, 0.009, 0.10]} color="#eee7ca"
          position={[((index + 0.5) / laneMarkers - 0.5) * run, 0.028, 0]} castShadow={false} />)}
      </group>
    </>
  );
}

export default function HouseModel({
  rooms = EMPTY, floorLayouts, floorDetails = EMPTY, landLength = 40, landWidth = 30,
  floorHeight = DEFAULT_FLOOR_HEIGHT, floorHeights, floors = 1, visibleFloor = null,
  wallColor = '#f5f2ed', floorColor = '#dcc3a8', ceilingColor = '#f5f2ed', roofColor = '#9eaab1',
  wallMaterial = 'plaster', floorMaterial = 'wood', ceilingMaterial = 'plaster',
  roofStyle = 'flat', roofMode = 'transparent', cutaway = false, showWalls = true,
  showFurniture = true, furnitureTheme = 'modern', roadFacing = 'North', includeSite = true,
  selectedObject, onSelectObject,
}) {
  const layouts = useMemo(() => getBuildingLayouts(floorLayouts, rooms, floors), [floorLayouts, rooms, floors]);
  const levels = useMemo(() => getFloorLevels(layouts.length, floorHeight, floorHeights || floorDetails.map((detail) => detail?.height)),
    [layouts.length, floorHeight, floorHeights, floorDetails]);
  const topIndex = getLastOccupiedFloor(layouts);
  const topRooms = layouts[topIndex] || EMPTY;
  const roofBounds = useMemo(() => getRoomBounds(topRooms.filter((room) => room.type !== 'balcony')), [topRooms]);
  const roofsEnabled = !cutaway && roofMode !== 'hidden';
  const showTopRoof = roofsEnabled && topIndex >= 0 && (visibleFloor == null || visibleFloor === topIndex);
  const settings = { cutaway, showWalls, showFurniture, furnitureTheme, wallColor, floorColor, wallMaterial, floorMaterial, ceilingMaterial, ceilingColor };

  return (
    <group position={[-landLength / 2, 0, -landWidth / 2]}>
      {includeSite && <HouseSite landLength={landLength} landWidth={landWidth} roadFacing={roadFacing} />}
      {layouts.map((layout, index) => {
        if (visibleFloor != null && visibleFloor !== index) return null;
        const allowsStairs = index < topIndex || (index === topIndex && roofStyle === 'flat');
        return (
          <group key={index}>
            <BuildingFloor rooms={layout} previousRooms={layouts[index - 1] || EMPTY}
              level={levels[index]} floor={index} detail={floorDetails[index] || NO_DETAILS} showStairs={allowsStairs}
              settings={settings} selectedObject={selectedObject} onSelectObject={onSelectObject} />
            {roofsEnabled && visibleFloor == null && index < topIndex && <LowerDecks rooms={layout} upperRooms={layouts[index + 1]}
              level={levels[index]} ceilingMaterial={ceilingMaterial} ceilingColor={ceilingColor} roofMode={roofMode} />}
          </group>
        );
      })}
      {showTopRoof && <BuildingRoof bounds={roofBounds} rooms={topRooms} level={levels[topIndex]} roofStyle={roofStyle}
        roofColor={roofColor} roofMode={roofMode} includeSite={includeSite} ceilingMaterial={ceilingMaterial} ceilingColor={ceilingColor} />}
    </group>
  );
}
