import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, ColorManagement, Object3D, PMREMGenerator, SRGBColorSpace } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getLightingSetup } from './architecturalView';

export function configureArchitectureRenderer(gl) {
  ColorManagement.enabled = true;
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = ACESFilmicToneMapping;
}

function MaterialEnvironment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const studio = new RoomEnvironment();
    const lighting = generator.fromScene(studio, 0.12, 0.1, 100);
    const previous = scene.environment;
    scene.environment = lighting.texture;
    studio.dispose();
    generator.dispose();
    invalidate();
    return () => {
      scene.environment = previous;
      lighting.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}

export default function ArchitecturalLighting({ settings = {}, span = 40, height = 10, environment = true }) {
  const { gl, invalidate } = useThree();
  const lighting = getLightingSetup(settings, span, height);
  const target = useMemo(() => new Object3D(), []);
  const targetY = lighting.target[1];
  useEffect(() => {
    target.position.set(0, targetY, 0);
    target.updateMatrixWorld();
    invalidate();
  }, [target, targetY, invalidate]);
  useEffect(() => {
    gl.toneMappingExposure = lighting.toneMappingExposure;
    invalidate();
  }, [gl, lighting.toneMappingExposure, invalidate]);

  return (
    <>
      <color attach="background" args={[lighting.background]} />
      {environment && <MaterialEnvironment />}
      <ambientLight intensity={lighting.ambient} color="#ffffff" />
      <hemisphereLight args={[lighting.skyColor, lighting.groundColor, lighting.sky]} />
      <primitive object={target} />
      <directionalLight
        key={lighting.shadowSize}
        position={lighting.sunPosition}
        target={target}
        color={lighting.sunColor}
        intensity={lighting.keyIntensity}
        castShadow={lighting.castShadow}
        shadow-mapSize-width={lighting.shadowSize}
        shadow-mapSize-height={lighting.shadowSize}
        shadow-normalBias={0.045}
        shadow-bias={-0.00018}
        shadow-camera-near={0.1}
        shadow-camera-far={lighting.shadowDistance}
        shadow-camera-left={-lighting.shadowSpan}
        shadow-camera-right={lighting.shadowSpan}
        shadow-camera-top={lighting.shadowSpan}
        shadow-camera-bottom={-lighting.shadowSpan}
      />
    </>
  );
}
