export const DEFAULT_VIEW_SETTINGS = {
  mode: 'day',
  brightness: 1.1,
  sunIntensity: 2.7,
  sunAzimuth: 55,
  sunAltitude: 48,
  shadowQuality: 'soft',
  ambientOcclusion: true,
  roofMode: 'hidden',
  cutaway: false,
  showWalls: true,
  showAllFloors: true,
  furnitureTheme: 'modern',
};

export const CAMERA_PRESETS = {
  orbit: '360° orbit',
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  walkthrough: 'Interior walkthrough',
};

const LIGHT_MODES = {
  day: { ambient: 0.5, sky: 1.15, skyColor: '#f2f7ff', groundColor: '#d9cdb9', sunColor: '#fff4df', sun: 1, exposure: 1, background: '#e5ecf6' },
  sunset: { ambient: 0.45, sky: 0.95, skyColor: '#f2e5ff', groundColor: '#dbc7b1', sunColor: '#ffbd85', sun: 0.8, exposure: 1, background: '#ebd9df' },
  night: { ambient: 0.37, sky: 0.65, skyColor: '#bbd6ff', groundColor: '#c2b4ad', sunColor: '#b8d2ff', sun: 0.21, exposure: 0.86, background: '#273754' },
};

const radians = (degrees) => degrees * Math.PI / 180;
const cardinal = { North: 0, East: 90, South: 180, West: 270 };

function bearingVector(bearing) {
  const angle = radians(bearing);
  return [Math.sin(angle), 0, -Math.cos(angle)];
}

export function getLightingSetup(settings = {}, span = 40, height = 10) {
  const options = { ...DEFAULT_VIEW_SETTINGS, ...settings };
  const preset = LIGHT_MODES[options.mode] || LIGHT_MODES.day;
  const bearing = bearingVector(options.sunAzimuth);
  const altitude = radians(options.sunAltitude);
  const radius = Math.max(span, height, 12) * 1.85;
  const target = [0, height * 0.28, 0];
  return {
    ...preset,
    keyIntensity: options.sunIntensity * preset.sun,
    toneMappingExposure: options.brightness * preset.exposure,
    sunPosition: [radius * Math.cos(altitude) * bearing[0], target[1] + radius * Math.sin(altitude), radius * Math.cos(altitude) * bearing[2]],
    target,
    shadowSpan: Math.max(span * 0.9, height * 0.85, 10),
    shadowDistance: radius * 2.4,
    shadowSize: options.shadowQuality === 'high' ? 2048 : 1024,
    castShadow: options.shadowQuality !== 'off' && options.sunIntensity > 0,
  };
}

export function getCameraPose({ preset, width, depth, firstY, lastY, aspect, roadFacing, centerX = 0, centerZ = 0 }) {
  const middleY = (firstY + lastY) / 2;
  const height = Math.max(lastY - firstY, 1);
  const radius = Math.hypot(width, depth, height) / 2;
  const distance = Math.max(radius * 2.8 / Math.min(1, Math.max(0.45, aspect)), 12);
  const bearing = cardinal[roadFacing] ?? 0;
  const look = { front: bearing, back: bearing + 180, left: bearing - 90, right: bearing + 90, orbit: bearing + 37 };
  const vector = bearingVector(look[preset] ?? look.orbit);
  const target = [centerX, middleY, centerZ];
  if (preset === 'top') return { target, position: [centerX, middleY + distance, centerZ + 0.001] };
  const elevation = preset === 'orbit' ? radians(47) : radians(9);
  return {
    target,
    position: [
      centerX + distance * Math.cos(elevation) * vector[0],
      middleY + distance * Math.sin(elevation),
      centerZ + distance * Math.cos(elevation) * vector[2],
    ],
  };
}
