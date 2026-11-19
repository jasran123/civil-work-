import React from 'react';
import * as THREE from 'three';

// Procedural, high-fidelity 3D Furniture Assets

export function SofaSet3D({ theme = 'modern' }) {
  const fabricColor = theme === 'scandi' ? '#E2E8F0' : theme === 'luxury' ? '#1E293B' : '#334155';
  const cushionColor = theme === 'scandi' ? '#F8FAFC' : '#475569';
  const woodColor = '#78350F';

  return (
    <group position={[0, 0, 0]}>
      {/* Main Sofa Base */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.35, 1.8]} />
        <meshStandardMaterial color={fabricColor} roughness={0.7} />
      </mesh>

      {/* Sofa Backrest */}
      <mesh position={[0, 0.75, -0.75]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.8, 0.3]} />
        <meshStandardMaterial color={fabricColor} roughness={0.7} />
      </mesh>

      {/* Left Armrest */}
      <mesh position={[-2.0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.55, 1.8]} />
        <meshStandardMaterial color={fabricColor} roughness={0.7} />
      </mesh>

      {/* Right Armrest */}
      <mesh position={[2.0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.55, 1.8]} />
        <meshStandardMaterial color={fabricColor} roughness={0.7} />
      </mesh>

      {/* Seat Cushions */}
      <mesh position={[-0.95, 0.42, 0.05]} castShadow>
        <boxGeometry args={[1.7, 0.15, 1.5]} />
        <meshStandardMaterial color={cushionColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.95, 0.42, 0.05]} castShadow>
        <boxGeometry args={[1.7, 0.15, 1.5]} />
        <meshStandardMaterial color={cushionColor} roughness={0.6} />
      </mesh>

      {/* Wooden Tapered Legs */}
      {[[-1.9, 0.1, -0.75], [1.9, 0.1, -0.75], [-1.9, 0.1, 0.75], [1.9, 0.1, 0.75]].map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.2, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.4} />
        </mesh>
      ))}

      {/* Accent Throw Pillows */}
      <mesh position={[-1.6, 0.55, -0.55]} rotation={[0.2, 0.3, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.15]} />
        <meshStandardMaterial color="#D4AF37" roughness={0.5} />
      </mesh>
      <mesh position={[1.6, 0.55, -0.55]} rotation={[0.2, -0.3, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.15]} />
        <meshStandardMaterial color="#D4AF37" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function CoffeeTable3D() {
  return (
    <group position={[0, 0, 1.4]}>
      {/* Wooden / Marble Table Top */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 1.2]} />
        <meshStandardMaterial color="#854D0E" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Black Metal Hairpin Legs */}
      {[[-1.0, 0.18, -0.45], [1.0, 0.18, -0.45], [-1.0, 0.18, 0.45], [1.0, 0.18, 0.45]].map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Table Book / Decor */}
      <mesh position={[0.2, 0.44, 0]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.3]} />
        <meshStandardMaterial color="#F8FAFC" />
      </mesh>
    </group>
  );
}

export function TVUnit3D({ roomWidth = 14 }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Low Media Console Table */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(5.5, roomWidth * 0.7), 0.55, 0.8]} />
        <meshStandardMaterial color="#1E293B" roughness={0.4} />
      </mesh>

      {/* Open Storage / Soundbar Shelf */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[2.5, 0.1, 0.25]} />
        <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Wall-Mounted Large OLED Smart TV */}
      <mesh position={[0, 1.6, 0.35]} castShadow>
        <boxGeometry args={[3.8, 2.1, 0.06]} />
        <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* TV Screen Display Glow */}
      <mesh position={[0, 1.6, 0.39]}>
        <planeGeometry args={[3.6, 1.9]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>
    </group>
  );
}

export function AreaRug3D({ width = 5, length = 4 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0.6]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
    </mesh>
  );
}

export function BedSet3D({ roomWidth = 14, roomHeight = 12 }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Wooden Bed Platform */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.45, 5.8]} />
        <meshStandardMaterial color="#78350F" roughness={0.4} />
      </mesh>

      {/* Tufted Headboard */}
      <mesh position={[0, 1.35, -2.8]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 1.8, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Plush Mattress */}
      <mesh position={[0, 0.65, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 0.45, 5.4]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>

      {/* Folded Duvet / Blanket */}
      <mesh position={[0, 0.72, 0.8]} castShadow>
        <boxGeometry args={[4.52, 0.35, 3.8]} />
        <meshStandardMaterial color="#1E3A8A" roughness={0.6} />
      </mesh>

      {/* Sleeping Pillows */}
      <mesh position={[-1.2, 0.95, -1.9]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[1.5, 0.25, 1.0]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh position={[1.2, 0.95, -1.9]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[1.5, 0.25, 1.0]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>

      {/* Matching Bedside Nightstands & Table Lamps */}
      {[-2.9, 2.9].map((sideX, idx) => (
        <group key={idx} position={[sideX, 0, -2.2]}>
          {/* Nightstand Table */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.7, 0.8]} />
            <meshStandardMaterial color="#78350F" roughness={0.4} />
          </mesh>
          {/* Lamp Base */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.7} />
          </mesh>
          {/* Lamp Stem */}
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.8} />
          </mesh>
          {/* Lamp Shade */}
          <mesh position={[0, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.28, 0.3, 16]} />
            <meshStandardMaterial color="#FAF5EE" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 3-Door Tall Modern Wardrobe Closet */}
      <group position={[Math.min(3.6, roomWidth * 0.35), 0, 1.5]}>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 3.6, 3.6]} />
          <meshStandardMaterial color="#475569" roughness={0.3} />
        </mesh>
        {/* Handles */}
        <mesh position={[-0.78, 1.8, 0]} castShadow>
          <boxGeometry args={[0.04, 1.2, 0.04]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function CeilingFan3D({ wallHeight = 3.2 }) {
  return (
    <group position={[0, wallHeight - 0.35, 0]}>
      {/* Downrod */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      {/* Motor Hub */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} />
      </mesh>
      {/* 3 Aerodynamic Blades */}
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]}>
          <mesh position={[0.75, 0.01, 0]} rotation={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[1.3, 0.015, 0.2]} />
            <meshStandardMaterial color="#78350F" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ModularKitchen3D({ roomWidth = 10, roomHeight = 9 }) {
  const cw = Math.min(6.5, roomWidth * 0.75);
  const ch = Math.min(5.5, roomHeight * 0.7);

  return (
    <group position={[0, 0, 0]}>
      {/* Main Countertop Base Cabinets */}
      <mesh position={[0, 0.45, -ch / 2 + 0.5]} castShadow receiveShadow>
        <boxGeometry args={[cw, 0.88, 1.1]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.3} />
      </mesh>

      {/* Polished Black Granite Slab Top */}
      <mesh position={[0, 0.92, -ch / 2 + 0.5]} castShadow receiveShadow>
        <boxGeometry args={[cw + 0.1, 0.08, 1.2]} />
        <meshStandardMaterial color="#0F172A" roughness={0.15} metalness={0.2} />
      </mesh>

      {/* Undermount Stainless Steel Sink */}
      <mesh position={[-cw * 0.25, 0.93, -ch / 2 + 0.5]}>
        <boxGeometry args={[1.4, 0.02, 0.8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Gooseneck Chrome Faucet */}
      <group position={[-cw * 0.25, 1.05, -ch / 2 + 0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.25, 8]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* 4-Burner Glass-Top Gas Cooktop */}
      <group position={[cw * 0.22, 0.97, -ch / 2 + 0.5]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.04, 0.9]} />
          <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* Burner Rings */}
        {[[-0.4, 0.03, -0.2], [0.4, 0.03, -0.2], [-0.4, 0.03, 0.2], [0.4, 0.03, 0.2]].map((bpos, i) => (
          <mesh key={i} position={bpos}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
            <meshStandardMaterial color="#64748B" metalness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Overhead Wall Cabinets */}
      <mesh position={[0, 2.3, -ch / 2 + 0.4]} castShadow receiveShadow>
        <boxGeometry args={[cw, 0.9, 0.7]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
      </mesh>

      {/* Stainless Steel Range Hood Chimney */}
      <mesh position={[cw * 0.22, 2.05, -ch / 2 + 0.5]} castShadow>
        <boxGeometry args={[1.6, 0.45, 0.8]} />
        <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* French Double-Door Refrigerator */}
      <group position={[cw / 2 + 0.8, 0, -ch / 2 + 0.6]}>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 2.7, 1.2]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.65} roughness={0.2} />
        </mesh>
        {/* Handles */}
        <mesh position={[-0.66, 1.4, 0.2]} castShadow>
          <boxGeometry args={[0.04, 1.1, 0.04]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function BathroomFixtures3D({ roomWidth = 6, roomHeight = 7 }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Ceramic White Flush Commode */}
      <group position={[-1.0, 0, -0.5]}>
        {/* Base Bowl */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.48, 0.9]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.15} />
        </mesh>
        {/* Water Tank */}
        <mesh position={[0, 0.72, -0.32]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.55, 0.35]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.15} />
        </mesh>
        {/* Chrome Flush Button */}
        <mesh position={[0, 1.01, -0.32]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} />
        </mesh>
      </group>

      {/* Glass-Enclosed Walk-in Shower Enclosure */}
      <group position={[1.1, 0, -0.4]}>
        {/* Raised Shower Pan */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[1.4, 0.08, 1.4]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
        </mesh>
        {/* Frameless Glass Enclosure Panels */}
        <mesh position={[-0.68, 1.2, 0]}>
          <boxGeometry args={[0.03, 2.3, 1.4]} />
          <meshPhysicalMaterial color="#BAE6FD" transmission={0.9} opacity={0.6} transparent roughness={0.05} />
        </mesh>
        {/* Chrome Showerhead Column */}
        <mesh position={[0, 2.2, -0.6]} rotation={[Math.PI / 4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 12]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Floating Vanity Sink & Mirror */}
      <group position={[-0.8, 0, 1.2]}>
        {/* Vanity Cabinet */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.4, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
        {/* Ceramic Basin */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.85, 0.15, 0.55]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
        </mesh>
        {/* Chrome Faucet */}
        <mesh position={[0, 0.95, -0.2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} />
        </mesh>
        {/* Wall Mirror */}
        <mesh position={[0, 1.6, -0.32]}>
          <boxGeometry args={[0.9, 1.0, 0.03]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.05} />
        </mesh>
      </group>
    </group>
  );
}

export function DiningTableSet3D() {
  return (
    <group position={[0, 0, 0]}>
      {/* Polished Hardwood Dining Table */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.08, 2.2]} />
        <meshStandardMaterial color="#78350F" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* 4 Wooden Table Legs */}
      {[[-1.5, 0.27, -0.9], [1.5, 0.27, -0.9], [-1.5, 0.27, 0.9], [1.5, 0.27, 0.9]].map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.54, 8]} />
          <meshStandardMaterial color="#451A03" roughness={0.5} />
        </mesh>
      ))}

      {/* 4 Ergonomic Dining Chairs with Cushions */}
      {[
        [-0.9, 0, -1.5, 0],
        [0.9, 0, -1.5, 0],
        [-0.9, 0, 1.5, Math.PI],
        [0.9, 0, 1.5, Math.PI],
      ].map(([cx, cy, cz, rotY], i) => (
        <group key={i} position={[cx, cy, cz]} rotation={[0, rotY, 0]}>
          {/* Chair Seat */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.65, 0.06, 0.65]} />
            <meshStandardMaterial color="#FEF3C7" roughness={0.7} />
          </mesh>
          {/* Chair Backrest */}
          <mesh position={[0, 0.72, -0.28]} castShadow>
            <boxGeometry args={[0.65, 0.68, 0.05]} />
            <meshStandardMaterial color="#78350F" roughness={0.4} />
          </mesh>
          {/* Chair Legs */}
          {[[-0.28, 0.17, -0.28], [0.28, 0.17, -0.28], [-0.28, 0.17, 0.28], [0.28, 0.17, 0.28]].map((lpos, li) => (
            <mesh key={li} position={lpos} castShadow>
              <cylinderGeometry args={[0.02, 0.015, 0.34, 6]} />
              <meshStandardMaterial color="#451A03" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Overhead Hanging Chandelier / Pendant Light */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function CarPorch3D({ roomWidth = 10, roomHeight = 14 }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Modern Paver Stones Pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[roomWidth - 0.4, roomHeight - 0.4]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Sleek SUV / Sedan Model Silhouette */}
      <group position={[0, 0.35, 0]}>
        {/* Car Lower Chassis */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.6, 5.2]} />
          <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Cabin Greenhouse & Windshield */}
        <mesh position={[0, 0.85, -0.2]} castShadow>
          <boxGeometry args={[2.2, 0.55, 3.2]} />
          <meshPhysicalMaterial color="#0284C7" transmission={0.7} transparent opacity={0.7} roughness={0.1} />
        </mesh>
        {/* 4 Wheels */}
        {[[-1.25, 0.08, -1.7], [1.25, 0.08, -1.7], [-1.25, 0.08, 1.7], [1.25, 0.08, 1.7]].map((wpos, wi) => (
          <mesh key={wi} position={wpos} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 16]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function StaircaseSteps3D({ roomWidth = 7, roomHeight = 11, wallHeight = 3.2 }) {
  const stepsCount = 12;
  const stepHeight = wallHeight / stepsCount;
  const stepDepth = (roomHeight * 0.8) / (stepsCount / 2);
  const stepWidth = (roomWidth - 1) / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* Flight 1: Ascending */}
      {Array.from({ length: stepsCount / 2 }).map((_, i) => (
        <mesh
          key={`flight1-${i}`}
          position={[-stepWidth / 2 - 0.1, (i + 0.5) * stepHeight, -roomHeight / 2 + 1 + i * stepDepth]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[stepWidth, stepHeight, stepDepth]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} />
        </mesh>
      ))}

      {/* Mid-Landing Slab */}
      <mesh
        position={[0, (stepsCount / 2) * stepHeight, roomHeight / 2 - 1.2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[roomWidth - 0.6, stepHeight, 2.0]} />
        <meshStandardMaterial color="#64748B" roughness={0.6} />
      </mesh>

      {/* Flight 2: Returning / Ascending */}
      {Array.from({ length: stepsCount / 2 }).map((_, i) => (
        <mesh
          key={`flight2-${i}`}
          position={[stepWidth / 2 + 0.1, (stepsCount / 2 + i + 0.5) * stepHeight, roomHeight / 2 - 2.2 - i * stepDepth]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[stepWidth, stepHeight, stepDepth]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} />
        </mesh>
      ))}

      {/* Stainless Steel Handrail / Balustrade */}
      <mesh position={[0.02, wallHeight * 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, roomHeight * 0.75, 8]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

