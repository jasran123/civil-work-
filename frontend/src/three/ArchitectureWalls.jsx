import { useMemo } from 'react';
import { BoxInstances, Finish, SolidBox, TiledBox } from './ArchitectureMeshes';
import { getCustomPartition, getRoomPartitions, WALL_THICKNESS } from './architecture';

const FRAME_COLOR = '#344650';

function Window({ width, height, thickness }) {
  const frame = Math.min(0.11, width * 0.14, height * 0.15);
  const depth = thickness + 0.06;
  const glassWidth = width - 2 * frame;
  const glassHeight = height - 2 * frame;

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          <SolidBox size={[width, frame, depth]} position={[0, side * (height - frame) / 2, 0]} color={FRAME_COLOR} />
          <SolidBox size={[frame, glassHeight, depth]} position={[side * (width - frame) / 2, 0, 0]} color={FRAME_COLOR} />
        </group>
      ))}
      {width > 2.2 && <SolidBox size={[frame * 0.72, glassHeight, 0.12]} position={[0, 0, 0]} color={FRAME_COLOR} />}
      <mesh>
        <boxGeometry args={[glassWidth, glassHeight, 0.035]} />
        <meshPhysicalMaterial color="#bddfeb" roughness={0.13} reflectivity={0.6} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <SolidBox size={[width, 0.1, thickness + 0.14]} position={[0, -height / 2 + 0.05, 0]} color="#d5d9da" />
    </>
  );
}

function Door({ width, height, thickness }) {
  const trim = Math.min(0.12, width * 0.12);
  const leaf = width - trim * 2;
  const frameDepth = thickness + 0.07;

  return (
    <>
      <SolidBox size={[width, trim, frameDepth]} position={[0, height - trim / 2, 0]} color="#765943" />
      {[-1, 1].map((side) => <SolidBox key={side} size={[trim, height, frameDepth]} position={[side * (width - trim) / 2, height / 2, 0]} color="#765943" />)}
      <TiledBox width={leaf} height={height - trim - 0.045} depth={0.12} x={0} y={(height - trim + 0.045) / 2} z={0}
        style="wood" color="#b69070" />
      {[0.25, 0.6].map((level) => (
        <SolidBox key={level} size={[leaf * 0.7, height * 0.21, 0.018]} position={[0, height * level, 0.065]}
          color="#a78062" castShadow={false} />
      ))}
      {[0.11, -0.11].map((side) => (
        <SolidBox key={side} size={[Math.min(0.32, width * 0.14), 0.07, 0.11]} position={[leaf * 0.32, height * 0.45, side]} castShadow={false}>
          <meshStandardMaterial color="#a3a6a9" metalness={0.7} roughness={0.32} />
        </SolidBox>
      ))}
    </>
  );
}

function Apertures({ line, shownHeight, thickness = WALL_THICKNESS, select }) {
  return line.openings.map((opening, index) => {
    const height = Math.min(opening.top, shownHeight) - opening.sill;
    if (height < 0.3) return null;
    const along = (opening.low + opening.high) / 2;
    const door = opening.type === 'door';
    const level = door ? opening.sill : opening.sill + height / 2;
    const position = line.horizontal ? [along, level, line.coordinate] : [line.coordinate, level, along];
    const width = opening.high - opening.low;
    const owner = line.spans?.find((span) => along >= span.start && along <= span.end);

    return (
      <group key={opening.id || index} position={position} rotation={[0, line.horizontal ? 0 : -Math.PI / 2, 0]}
        onPointerDown={select && owner ? (event) => { event.stopPropagation(); select(owner.id); } : undefined}>
        {door ? <Door width={width} height={height} thickness={thickness} /> : <Window width={width} height={height} thickness={thickness} />}
      </group>
    );
  });
}

function wallEntries(partitions, kind = 'room', thickness = WALL_THICKNESS) {
  return partitions.flatMap((line) => line.panels.map(({ start, end, bottom, top, owner }) => {
    const along = (start + end) / 2;
    return {
      position: line.horizontal ? [along, (top + bottom) / 2, line.coordinate] : [line.coordinate, (top + bottom) / 2, along],
      size: line.horizontal ? [end - start, top - bottom, thickness] : [thickness, top - bottom, end - start],
      color: owner.color,
      owner: { kind, id: owner.id },
    };
  }));
}

export function RoomWalls({ rooms, clearHeight, shownHeight, select, defaultColor, defaultStyle }) {
  const partitions = useMemo(() => getRoomPartitions(rooms, clearHeight, shownHeight), [rooms, clearHeight, shownHeight]);
  const panels = useMemo(() => wallEntries(partitions), [partitions]);
  return (
    <>
      <BoxInstances entries={panels} style={defaultStyle} defaultColor={defaultColor} onPick={select} />
      {partitions.map((line) => <Apertures key={line.horizontal + ':' + line.coordinate} line={line} shownHeight={shownHeight}
        select={select ? (id) => select({ kind: 'room', id }) : undefined} />)}
    </>
  );
}

export function DrawnWall({ wall, clearHeight, shownHeight, select, defaultColor, defaultStyle, active }) {
  const partition = useMemo(() => getCustomPartition(wall, clearHeight, shownHeight), [wall, clearHeight, shownHeight]);
  if (!partition) return null;
  const { thickness } = partition;
  const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  const line = { ...partition, horizontal: true, coordinate: 0, spans: [{ start: 0, end: length, id: wall.id }] };
  const entries = wallEntries([line], 'wall', thickness);

  return (
    <group position={[wall.x1, 0, wall.y1]} rotation={[0, -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1), 0]}>
      <BoxInstances entries={active ? entries.map((entry) => ({ ...entry, color: '#88beec' })) : entries}
        style={wall.material === 'paint' ? 'plaster' : wall.material || defaultStyle}
        defaultColor={defaultColor} onPick={select} />
      <Apertures line={line} shownHeight={shownHeight} thickness={thickness}
        select={select ? (id) => select({ kind: 'wall', id }) : undefined} />
    </group>
  );
}
