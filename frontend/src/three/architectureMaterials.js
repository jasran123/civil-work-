import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';

const SIZE = 128;
const finishes = new Map();
const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

function grain(x, y) {
  const sample = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return sample - Math.floor(sample);
}

const styles = {
  plaster: { roughness: 0.76, bumpScale: 0.025, tileSize: 4 },
  concrete: { roughness: 0.88, bumpScale: 0.045, tileSize: 5 },
  wood: { roughness: 0.47, bumpScale: 0.025, tileSize: 6 },
  tile: { roughness: 0.34, bumpScale: 0.018, tileSize: 5.5 },
};

function sampleFinish(style, x, y) {
  const u = x / SIZE;
  const v = y / SIZE;
  const fleck = (grain(x, y) - 0.5) * 8;

  if (style === 'wood') {
    const plank = Math.floor(v * 6);
    const row = (y * 6) % SIZE;
    const join = ((u + (plank % 3) * 0.27) % 1) * SIZE;
    const seam = row < 2 || join < 1.2;
    const wave = Math.sin(u * Math.PI * 4 + plank * 1.2) * 0.085 + Math.sin(u * Math.PI * 8) * 0.03;
    const variation = Math.sin((v + wave) * Math.PI * 56) * 10 + Math.sin((v + wave) * Math.PI * 114) * 4;
    const value = seam ? 193 : 244 + variation + (grain(1, plank) - 0.5) * 13 + fleck;
    return [value * 1.018, value * 0.994, value * 0.956, seam ? 94 : 172 + variation];
  }

  if (style === 'tile') {
    const joint = x % 64 <= 1 || y % 64 <= 1;
    const cell = grain(Math.floor(x / 64), Math.floor(y / 64));
    const vein = Math.exp(-Math.abs(Math.sin((u * 0.9 + v + Math.sin(u * Math.PI * 4) * 0.09) * Math.PI * 4)) * 12);
    const value = joint ? 193 : 248 - vein * 18 - cell * 7 + fleck * 0.4;
    return [value, value, value * 0.989, joint ? 72 : 194];
  }

  const variation = Math.sin(u * Math.PI * 6 + Math.cos(v * Math.PI * 4)) * Math.cos(v * Math.PI * 8 - u * Math.PI * 2);
  if (style === 'concrete') {
    const value = 242 + variation * 11 + fleck * 2.2;
    return [value, value * 0.99, value * 0.974, 158 + variation * 23 + fleck * 2];
  }
  const value = 252 + variation * 1.6 + fleck * 0.6;
  return [value, value, value, 205 + variation * 2 + fleck * 1.7];
}

function makeTexture(data, color) {
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat);
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function getArchitectureFinish(requested) {
  const style = Object.hasOwn(styles, requested) ? requested : 'plaster';
  if (!finishes.has(style)) {
    const colors = new Uint8Array(SIZE * SIZE * 4);
    const surface = new Uint8Array(colors.length);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const index = (y * SIZE + x) * 4;
        const [r, g, b, height] = sampleFinish(style, x, y);
        colors.set([clampByte(r), clampByte(g), clampByte(b), 255], index);
        const bump = clampByte(height);
        surface.set([bump, bump, bump, 255], index);
      }
    }
    finishes.set(style, { ...styles[style], map: makeTexture(colors, true), bumpMap: makeTexture(surface, false) });
  }
  return finishes.get(style);
}
