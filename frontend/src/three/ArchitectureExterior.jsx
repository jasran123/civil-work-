import { useMemo } from 'react';
import { Shape } from 'three';
import { BoxInstances, Finish, SolidBox, TiledBox } from './ArchitectureMeshes';
import { cutSurface, FLOOR_SLAB_THICKNESS, getFloorSurfaces, getStairOpening } from './architecture';

const RAIL_COLOR = '#344957';
const TERRACE_COLOR = '#e3e7e7';

export function BalconyRails({ room }) {
  const { x, y, width, height } = room;
  const entrySide = room.doors?.[0]?.side || 'top';
  const edges = [
    { side: 'top', length: width, x: x + width / 2, z: y + 0.04, rotation: 0 },
    { side: 'bottom', length: width, x: x + width / 2, z: y + height - 0.04, rotation: 0 },
    { side: 'left', length: height, x: x + 0.04, z: y + height / 2, rotation: Math.PI / 2 },
    { side: 'right', length: height, x: x + width - 0.04, z: y + height / 2, rotation: Math.PI / 2 },
  ];

  return edges.filter((edge) => edge.side !== entrySide).map((edge) => {
    const posts = Math.max(2, Math.ceil(edge.length / 3.5) + 1);
    return (
      <group key={edge.side} position={[edge.x, 0, edge.z]} rotation={[0, edge.rotation, 0]}>
        <SolidBox size={[edge.length, 0.11, 0.15]} position={[0, 3.25, 0]} color={RAIL_COLOR} />
        <mesh position={[0, 1.78, 0]}>
          <boxGeometry args={[edge.length, 2.82, 0.04]} />
          <meshPhysicalMaterial color="#c8e1ea" roughness={0.19} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        {Array.from({ length: posts }, (_, index) => (
          <SolidBox key={index} size={[0.1, 3.24, 0.12]} position={[(index / (posts - 1) - 0.5) * (edge.length - 0.1), 1.62, 0]} color={RAIL_COLOR} />
        ))}
      </group>
    );
  });
}

export function Staircase({ room, height }) {
  const steps = Math.max(6, Math.ceil(height / 1.25));
  const rise = height / (steps * 2);
  const stepDepth = room.height * 0.70 / steps;
  const width = room.width * 0.43;
  const firstZ = -room.height * 0.40;
  const flightX = room.width * 0.235;
  const climb = (flight, index) => {
    const reverse = flight === 1;
    return {
      size: [width, 0.24, stepDepth + 0.035],
      position: [reverse ? flightX : -flightX, (flight * steps + index + 1) * rise - 0.12, firstZ + (reverse ? steps - 1 - index : index) * stepDepth],
    };
  };
  const entries = [0, 1].flatMap((flight) => Array.from({ length: steps }, (_, index) => climb(flight, index)));
  const landingDepth = room.height * 0.17;
  const railRun = (steps - 1) * stepDepth;
  const railRise = (steps - 1) * rise;
  const railLength = Math.hypot(railRun, railRise);
  const slope = Math.atan2(railRise, railRun);

  return (
    <group position={[room.x + room.width / 2, 0, room.y + room.height / 2]}>
      <BoxInstances entries={entries} style="wood" defaultColor="#b89c80" />
      <SolidBox size={[room.width * 0.9, 0.32, landingDepth]} position={[0, height / 2 - 0.16, firstZ + steps * stepDepth + landingDepth / 2]}>
        <Finish style="wood" color="#b89c80" />
      </SolidBox>
      {[0, 1].map((flight) => (
        <group key={flight} position={[flight === 0 ? -room.width * 0.43 : room.width * 0.43, 0, 0]}>
          <SolidBox size={[0.12, 0.12, railLength + 0.2]}
            position={[0, 2.8 + (flight * steps + (steps + 1) / 2) * rise, firstZ + railRun / 2]}
            rotation={[flight === 0 ? -slope : slope, 0, 0]} color={RAIL_COLOR} />
          {[0, Math.floor((steps - 1) / 2), steps - 1].map((index) => (
            <SolidBox key={index} size={[0.08, 2.8, 0.08]} color={RAIL_COLOR}
              position={[0, 1.4 + (flight * steps + index + 1) * rise, climb(flight, index).position[2]]} />
          ))}
        </group>
      ))}
    </group>
  );
}

function RoofGlazing() {
  return <meshPhysicalMaterial color="#c1e2f5" transparent opacity={0.24} roughness={0.16} depthWrite={false} />;
}

function GabledRoof({ width, depth, color, transparent }) {
  const rise = Math.min(width * 0.27, 6);
  const run = width / 2;
  const length = Math.hypot(run, rise);
  const pitch = Math.atan2(rise, run);
  const end = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-run, 0);
    shape.lineTo(run, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    return shape;
  }, [run, rise]);

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          <SolidBox size={[length, 0.23, depth]} position={[side * run / 2, rise / 2, 0]}
            rotation={[0, 0, -side * pitch]} castShadow={!transparent}>
            {transparent ? <RoofGlazing /> : <Finish style="tile" color={color} />}
          </SolidBox>
          <mesh position={[0, 0, side * (depth / 2 - 0.16) - 0.12]} castShadow={!transparent} receiveShadow>
            <extrudeGeometry args={[end, { depth: 0.24, bevelEnabled: false }]} />
            {transparent ? <RoofGlazing /> : <Finish style="plaster" color="#f0efec" />}
          </mesh>
        </group>
      ))}
      {!transparent && <SolidBox size={[0.19, 0.15, depth]} position={[0, rise + 0.06, 0]} color={color} />}
    </>
  );
}

function DeckSlab({ area, elevation, color, ceilingMaterial, ceilingColor, transparent }) {
  const x = area.x + area.width / 2;
  const z = area.y + area.height / 2;
  if (transparent) {
    return (
      <SolidBox size={[area.width, 0.15, area.height]} position={[x, elevation + 0.13, z]} castShadow={false}>
        <RoofGlazing />
      </SolidBox>
    );
  }
  return (
    <TiledBox width={area.width} height={FLOOR_SLAB_THICKNESS} depth={area.height} x={x}
      y={elevation + FLOOR_SLAB_THICKNESS / 2} z={z} style="tile" layered>
      <Finish attach="material-0" color="#dce0e1" style="concrete" />
      <Finish attach="material-1" color={color || '#afbec2'} style="tile" />
      <Finish attach="material-2" color={ceilingColor} style={ceilingMaterial} />
    </TiledBox>
  );
}

export function LowerDecks({ rooms, upperRooms, level, ceilingMaterial, ceilingColor, roofMode }) {
  const occupied = getFloorSurfaces(rooms.filter((room) => room.type !== 'balcony'));
  const openings = rooms.map(getStairOpening).filter(Boolean);
  const exposed = occupied.flatMap((section) => cutSurface(section, [...upperRooms, ...openings]));
  return exposed.map((section, index) => (
    <DeckSlab key={index} area={section} elevation={level.elevation + level.clearHeight} ceilingMaterial={ceilingMaterial} ceilingColor={ceilingColor}
      transparent={roofMode === 'transparent'} />
  ));
}

export function BuildingRoof({ bounds, rooms, level, roofStyle, roofColor, roofMode, ceilingMaterial, ceilingColor, includeSite }) {
  if (!bounds || roofMode === 'hidden') return null;
  const transparent = roofMode === 'transparent';
  const amount = includeSite ? 0.5 : 0;
  const deck = { x: bounds.x - amount, y: bounds.y - amount, width: bounds.width + amount * 2, height: bounds.height + amount * 2 };
  const center = [deck.x + deck.width / 2, level.elevation + level.clearHeight, deck.y + deck.height / 2];
  const opening = roofStyle === 'flat' ? rooms.map(getStairOpening).filter(Boolean) : [];
  const covers = cutSurface(deck, opening);
  const border = Math.min(0.26, deck.width * 0.24, deck.height * 0.24);

  return (
    <>
      {covers.map((section, index) => (
        <DeckSlab key={index} area={section} elevation={center[1]} color={roofColor} ceilingMaterial={ceilingMaterial}
          ceilingColor={ceilingColor} transparent={transparent} />
      ))}
      {roofStyle === 'gabled' && <group position={[center[0], center[1] + FLOOR_SLAB_THICKNESS, center[2]]}>
        <GabledRoof width={deck.width} depth={deck.height} color={roofColor} transparent={transparent} />
      </group>}
      {roofStyle === 'flat' && !transparent && <group position={[center[0], center[1] + 1.73, center[2]]}>
        {[-1, 1].map((side) => (
          <group key={side}>
            <SolidBox size={[deck.width, 2.74, border]} position={[0, 0, side * (deck.height - border) / 2]} color={TERRACE_COLOR} />
            <SolidBox size={[border, 2.74, deck.height - 2 * border]} position={[side * (deck.width - border) / 2, 0, 0]} color={TERRACE_COLOR} />
          </group>
        ))}
      </group>}
    </>
  );
}
