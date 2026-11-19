import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Object3D } from 'three';
import { getArchitectureFinish } from './architectureMaterials';

export function Finish({ style, color, attach }) {
  const { tileSize, ...material } = getArchitectureFinish(style);
  return <meshStandardMaterial attach={attach} color={color} {...material} />;
}

export function SolidBox({ size, position, color, rotation, castShadow = true, children }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      {children || <meshStandardMaterial color={color} roughness={0.68} />}
    </mesh>
  );
}

export function TiledBox({ width, height, depth, x, y, z, style, color, children, onPointerDown, castShadow = true, layered = false }) {
  const tileSize = getArchitectureFinish(style).tileSize;
  const geometry = useMemo(() => {
    const surface = new BoxGeometry(width, height, depth);
    const positions = surface.getAttribute('position');
    const normals = surface.getAttribute('normal');
    const uvs = surface.getAttribute('uv');
    for (let index = 0; index < positions.count; index += 1) {
      const localX = positions.getX(index) + x;
      const localY = positions.getY(index) + y;
      const localZ = positions.getZ(index) + z;
      if (Math.abs(normals.getY(index)) > 0.5) uvs.setXY(index, localX / tileSize, localZ / tileSize);
      else if (Math.abs(normals.getX(index)) > 0.5) uvs.setXY(index, localZ / tileSize, localY / tileSize);
      else uvs.setXY(index, localX / tileSize, localY / tileSize);
    }
    if (layered) {
      const index = Array.from(surface.index.array);
      surface.setIndex([0, 1, 4, 5, 2, 3].flatMap((face) => index.slice(face * 6, (face + 1) * 6)));
      surface.clearGroups();
      surface.addGroup(0, 24, 0);
      surface.addGroup(24, 6, 1);
      surface.addGroup(30, 6, 2);
    }
    return surface;
  }, [width, height, depth, x, y, z, tileSize, layered]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[x, y, z]} castShadow={castShadow} receiveShadow onPointerDown={onPointerDown}>
      {children || <Finish style={style} color={color} />}
    </mesh>
  );
}

export function BoxInstances({ entries, style, defaultColor = '#ffffff', onPick, castShadow = true }) {
  const ref = useRef();
  useLayoutEffect(() => {
    if (!ref.current) return;
    const mesh = ref.current;
    const transform = new Object3D();
    const color = new Color();
    entries.forEach((entry, index) => {
      transform.position.fromArray(entry.position);
      transform.scale.fromArray(entry.size);
      transform.rotation.set(0, entry.rotation || 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(entry.color || defaultColor));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [entries, defaultColor]);

  if (!entries.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, entries.length]} castShadow={castShadow} receiveShadow
      onPointerDown={onPick ? (event) => {
        const entry = entries[event.instanceId];
        if (!entry?.owner) return;
        event.stopPropagation();
        onPick(entry.owner);
      } : undefined}>
      <boxGeometry />
      <Finish style={style} color="#ffffff" />
    </instancedMesh>
  );
}

export function SelectionBorder({ width, depth, origin: [x, z] }) {
  return (
    <group position={[x + width / 2, 0.024, z + depth / 2]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <SolidBox size={[width, 0.025, 0.065]} position={[0, 0, side * depth / 2]} castShadow={false}>
            <meshBasicMaterial color="#2590ff" />
          </SolidBox>
          <SolidBox size={[0.065, 0.025, depth]} position={[side * width / 2, 0, 0]} castShadow={false}>
            <meshBasicMaterial color="#2590ff" />
          </SolidBox>
        </group>
      ))}
    </group>
  );
}
