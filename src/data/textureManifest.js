/**
 * NASA 3D Solar System — Official Three.js & 2K/4K PBR Texture Manifest
 * Loads official Three.js Earth & Moon textures (`earth_atmos_2048.jpg`, `earth_normal_2048.jpg`,
 * `earth_specular_2048.jpg`, `earth_clouds_1024.png`, `moon_1024.jpg`) and 2K Solar System Scope maps
 * with CORS `crossOrigin = 'anonymous'` and maximum anisotropic filtering.
 */
import * as THREE from 'three';

const THREE_MASTER_PLANETS = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets';
const JSDELIVR_PLANETS = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets';
const WIKI_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

export const TEXTURE_MANIFEST = {
  sun: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_sun.jpg?width=2048`
    ]
  },
  mercury: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_mercury.jpg?width=2048`,
      `${THREE_MASTER_PLANETS}/moon_1024.jpg`
    ],
    bump: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_mercury.jpg?width=2048`,
      `${THREE_MASTER_PLANETS}/moon_1024.jpg`
    ]
  },
  venus: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_venus_surface.jpg?width=2048`,
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_venus_atmosphere.jpg?width=2048`
    ],
    bump: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_venus_surface.jpg?width=2048`
    ]
  },
  earth: {
    albedo: [
      `${THREE_MASTER_PLANETS}/earth_atmos_2048.jpg`,
      `${JSDELIVR_PLANETS}/earth_atmos_2048.jpg`
    ],
    normal: [
      `${THREE_MASTER_PLANETS}/earth_normal_2048.jpg`,
      `${JSDELIVR_PLANETS}/earth_normal_2048.jpg`
    ],
    bump: [
      `${THREE_MASTER_PLANETS}/earth_normal_2048.jpg`,
      `${JSDELIVR_PLANETS}/earth_normal_2048.jpg`
    ],
    specular: [
      `${THREE_MASTER_PLANETS}/earth_specular_2048.jpg`,
      `${JSDELIVR_PLANETS}/earth_specular_2048.jpg`
    ],
    clouds: [
      `${THREE_MASTER_PLANETS}/earth_clouds_1024.png`,
      `${JSDELIVR_PLANETS}/earth_clouds_1024.png`
    ],
    night: [
      `${THREE_MASTER_PLANETS}/earth_lights_2048.png`,
      `${JSDELIVR_PLANETS}/earth_lights_2048.png`
    ]
  },
  moon: {
    albedo: [
      `${THREE_MASTER_PLANETS}/moon_1024.jpg`,
      `${JSDELIVR_PLANETS}/moon_1024.jpg`
    ],
    bump: [
      `${THREE_MASTER_PLANETS}/moon_1024.jpg`,
      `${JSDELIVR_PLANETS}/moon_1024.jpg`
    ]
  },
  mars: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_mars.jpg?width=2048`
    ],
    bump: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_mars.jpg?width=2048`
    ]
  },
  jupiter: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_jupiter.jpg?width=2048`
    ],
    bump: null
  },
  saturn: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_saturn.jpg?width=2048`
    ],
    bump: null,
    ring: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_saturn_ring_alpha.png?width=2048`
    ]
  },
  uranus: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_uranus.jpg?width=2048`
    ],
    bump: null,
    ring: null
  },
  neptune: {
    albedo: [
      `${WIKI_FILEPATH}/Solarsystemscope_texture_2k_neptune.jpg?width=2048`
    ],
    bump: null
  },
  io: {
    albedo: null,
    bump: null
  },
  europa: {
    albedo: null,
    bump: null
  },
  titan: {
    albedo: null,
    bump: null
  }
};

const textureCache = new Map();
const heightfieldCache = new Map();

const sharedTextureLoader = new THREE.TextureLoader();
sharedTextureLoader.setCrossOrigin('anonymous');
sharedTextureLoader.crossOrigin = 'anonymous';

/**
 * Applies strict PBR sharpness, mipmapping, anisotropic filtering, and colorSpace settings
 * to any procedural or CDN-loaded THREE.Texture.
 *
 * @param {THREE.Texture} texture
 * @param {'albedo'|'bump'|'normal'|'roughness'|'specular'|'clouds'|'night'|'ring'} [mapType='albedo']
 * @param {number} [maxAnisotropy=16]
 * @returns {THREE.Texture}
 */
export function applyTextureSharpness(texture, mapType = 'albedo', maxAnisotropy = 16) {
  if (!texture) return texture;
  const normalizedType = String(mapType || 'albedo').toLowerCase();
  const isSRGB =
    normalizedType === 'albedo' ||
    normalizedType === 'night' ||
    normalizedType === 'ring' ||
    normalizedType === 'clouds';

  texture.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = Math.max(1, Number(maxAnisotropy) || 16);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createSeededRandom(seed = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function nextRandom() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PERM = new Uint8Array(512);
(function initPermutation() {
  const rand = createSeededRandom(1337);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
})();

function fastNoise2D(x, y, seed = 0) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = xf * xf * xf * (xf * (xf * 6.0 - 15.0) + 10.0);
  const v = yf * yf * yf * (yf * (yf * 6.0 - 15.0) + 10.0);

  const s = seed & 255;
  const aa = PERM[(PERM[(xi + s) & 255] + yi) & 255] / 255.0;
  const ab = PERM[(PERM[(xi + s) & 255] + yi + 1) & 255] / 255.0;
  const ba = PERM[(PERM[(xi + 1 + s) & 255] + yi) & 255] / 255.0;
  const bb = PERM[(PERM[(xi + 1 + s) & 255] + yi + 1) & 255] / 255.0;

  return aa + (ba - aa) * u + (ab - aa) * v + (aa - ba - ab + bb) * u * v;
}

function fbm2D(x, y, octaves = 7, seed = 1, lacunarity = 2.03, gain = 0.5) {
  let value = 0.0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let norm = 0.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * fastNoise2D(x * frequency, y * frequency, seed + i * 31);
    norm += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value / norm;
}

function ridgedMultifractal2D(x, y, octaves = 6, seed = 17) {
  let sum = 0.0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let prev = 1.0;
  for (let i = 0; i < octaves; i++) {
    let n = fastNoise2D(x * frequency, y * frequency, seed + i * 43);
    n = 1.0 - Math.abs(n * 2.0 - 1.0);
    n = n * n;
    sum += n * amplitude * prev;
    prev = n;
    frequency *= 2.05;
    amplitude *= 0.5;
  }
  return Math.min(1.0, sum);
}

function warpedFbm2D(x, y, octaves = 7, seed = 1) {
  const qx = fbm2D(x, y, 4, seed + 11);
  const qy = fbm2D(x + 5.2, y + 1.3, 4, seed + 29);
  return fbm2D(x + 2.2 * qx, y + 2.2 * qy, octaves, seed);
}

function getBodySynthesizedField(bodyKey) {
  if (heightfieldCache.has(bodyKey)) {
    return heightfieldCache.get(bodyKey);
  }

  const gridW = 512;
  const gridH = 256;
  const heightMap = new Float32Array(gridW * gridH);
  const auxiliaryMap = new Float32Array(gridW * gridH);

  for (let y = 0; y < gridH; y++) {
    const v = y / gridH;
    const lat = (v - 0.5) * 2.0;
    const poleFade = Math.cos(lat * Math.PI * 0.5);

    for (let x = 0; x < gridW; x++) {
      const u = x / gridW;
      const angle = u * Math.PI * 2.0;
      const nx = Math.cos(angle) * 2.4 + 4.0;
      const nz = Math.sin(angle) * 2.4 + 4.0;
      const ny = v * 4.8;

      const idx = y * gridW + x;

      switch (bodyKey) {
        case 'earth': {
          const continent = warpedFbm2D(nx * 1.15, ny * 1.15 + nz * 0.4, 7, 77);
          const mountainRidge = ridgedMultifractal2D(nx * 2.6, ny * 2.6 + nz * 0.8, 6, 107);
          const isPolarCap = Math.abs(lat) > 0.84 + (continent - 0.5) * 0.12;
          const isLand = continent > 0.505;
          auxiliaryMap[idx] = isPolarCap ? 2.0 : isLand ? 1.0 : 0.0;
          heightMap[idx] = isLand
            ? 0.35 + (continent - 0.505) * 1.4 + mountainRidge * 0.55 * poleFade
            : Math.max(0.0, continent * 0.45);
          break;
        }

        case 'mars': {
          const base = warpedFbm2D(nx * 1.3, ny * 1.3 + nz * 0.5, 7, 314);
          const ridges = ridgedMultifractal2D(nx * 2.2, ny * 2.2, 6, 331);
          const canyonDist = Math.abs(v - 0.52) * 8.0 + Math.abs(u - 0.48) * 3.2;
          const canyonCarve = canyonDist < 0.45 ? (0.45 - canyonDist) * 1.6 : 0.0;
          heightMap[idx] = Math.max(0.0, Math.min(1.0, base * 0.72 + ridges * 0.42 - canyonCarve));
          auxiliaryMap[idx] = base;
          break;
        }

        case 'mercury':
        case 'moon': {
          const seed = bodyKey === 'moon' ? 909 : 404;
          const maria = warpedFbm2D(nx * 1.1, ny * 1.1 + nz * 0.35, 7, seed);
          const highlands = ridgedMultifractal2D(nx * 2.8, ny * 2.8 + nz * 0.6, 6, seed + 55);
          heightMap[idx] = Math.max(0.0, Math.min(1.0, maria * 0.58 + highlands * 0.48));
          auxiliaryMap[idx] = maria;
          break;
        }

        case 'venus': {
          const radarTerrain = warpedFbm2D(nx * 1.5, ny * 1.5 + nz * 0.5, 7, 222);
          const tesserae = ridgedMultifractal2D(nx * 3.0, ny * 3.0, 6, 263);
          heightMap[idx] = Math.max(0.0, Math.min(1.0, radarTerrain * 0.65 + tesserae * 0.45));
          auxiliaryMap[idx] = radarTerrain;
          break;
        }

        case 'jupiter':
        case 'saturn':
        case 'uranus':
        case 'neptune': {
          const bandFreq = bodyKey === 'jupiter' ? 18.0 : bodyKey === 'saturn' ? 22.0 : 10.0;
          const eddy = warpedFbm2D(nx * 2.2, ny * 3.5 + nz * 0.6, 7, bodyKey.charCodeAt(0) * 13);
          const zonal = Math.sin(v * Math.PI * bandFreq + (eddy - 0.5) * 3.8) * 0.5 + 0.5;
          heightMap[idx] = zonal * 0.65 + eddy * 0.35;
          auxiliaryMap[idx] = eddy;
          break;
        }

        default: {
          const h = warpedFbm2D(nx * 1.6, ny * 1.6 + nz * 0.4, 7, bodyKey.charCodeAt(0) * 19);
          heightMap[idx] = h;
          auxiliaryMap[idx] = h;
          break;
        }
      }
    }
  }

  const field = { gridW, gridH, heightMap, auxiliaryMap };
  heightfieldCache.set(bodyKey, field);
  return field;
}

function draw4KCraterField(
  ctx,
  width,
  height,
  count,
  seed,
  lightRim = 'rgba(255,255,255,0.34)',
  darkFloor = 'rgba(15,23,42,0.52)',
  withEjectaRays = false
) {
  const rand = createSeededRandom(seed);
  for (let i = 0; i < count; i++) {
    const cx = rand() * width;
    const cy = (0.06 + rand() * 0.88) * height;
    const r = Math.pow(rand(), 3.0) * (width * 0.032) + 3.5;

    if (withEjectaRays && r > width * 0.012 && rand() > 0.45) {
      ctx.save();
      ctx.translate(cx, cy);
      const rayCount = 16 + Math.floor(rand() * 18);
      for (let k = 0; k < rayCount; k++) {
        const angle = (k / rayCount) * Math.PI * 2 + rand() * 0.25;
        const rayLen = r * (2.6 + rand() * 3.8);
        const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
        rayGrad.addColorStop(0, 'rgba(248, 250, 252, 0.28)');
        rayGrad.addColorStop(0.4, 'rgba(226, 232, 240, 0.12)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8);
        ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    const grad = ctx.createRadialGradient(cx - r * 0.24, cy - r * 0.24, r * 0.08, cx, cy, r);
    grad.addColorStop(0.0, darkFloor);
    grad.addColorStop(0.68, darkFloor);
    grad.addColorStop(0.86, lightRim);
    grad.addColorStop(0.95, 'rgba(15, 23, 42, 0.28)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (r > width * 0.009) {
      ctx.fillStyle = lightRim;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Generates initial fallback or procedural PBR textures for any celestial body.
 * Note: For `clouds`, returns a clean transparent canvas while `earth_clouds_1024.png` streams in
 * (never draws pixelated squares or grid blocks).
 *
 * @param {string} bodyKey
 * @param {'albedo'|'bump'|'normal'|'roughness'|'specular'|'clouds'|'night'|'ring'} [mapType='albedo']
 * @param {number} [maxAnisotropy=16]
 * @returns {THREE.CanvasTexture}
 */
export function createProceduralPlanetTexture(bodyKey, mapType = 'albedo', maxAnisotropy = 16) {
  const normalizedKey = String(bodyKey || 'earth').toLowerCase();
  const normalizedType = String(mapType || 'albedo').toLowerCase();
  const cacheKey = `proc4k:${normalizedKey}:${normalizedType}`;

  if (textureCache.has(cacheKey)) {
    const cached = textureCache.get(cacheKey);
    return applyTextureSharpness(cached, normalizedType, maxAnisotropy);
  }

  // Smooth transparent placeholder while real `earth_clouds_1024.png` downloads (no pixel squares!)
  if (normalizedType === 'clouds') {
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 64;
    cloudCanvas.height = 32;
    const cloudCtx = cloudCanvas.getContext('2d');
    cloudCtx.clearRect(0, 0, 64, 32);
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.wrapS = THREE.RepeatWrapping;
    cloudTex.wrapT = THREE.ClampToEdgeWrapping;
    applyTextureSharpness(cloudTex, 'clouds', maxAnisotropy);
    textureCache.set(cacheKey, cloudTex);
    return cloudTex;
  }

  const isRing = normalizedType === 'ring';
  const width = isRing ? 2048 : 4096;
  const height = isRing ? 256 : 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (isRing) {
    render4KRingTexture(ctx, width, height, normalizedKey);
  } else if (normalizedType === 'night') {
    render4KNightLightsTexture(ctx, width, height);
  } else if (normalizedType === 'roughness') {
    render4KRoughnessTexture(ctx, width, height, normalizedKey);
  } else if (normalizedType === 'specular') {
    render4KEarthSpecularTexture(ctx, width, height);
  } else if (normalizedType === 'bump') {
    render4KBumpTexture(ctx, width, height, normalizedKey);
  } else if (normalizedType === 'normal') {
    render4KNormalTexture(ctx, width, height, normalizedKey);
  } else {
    render4KAlbedoTexture(ctx, width, height, normalizedKey);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = isRing ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  applyTextureSharpness(texture, normalizedType, maxAnisotropy);

  textureCache.set(cacheKey, texture);
  return texture;
}

function render4KAlbedoTexture(ctx, width, height, bodyKey) {
  const field = getBodySynthesizedField(bodyKey);
  const { gridW, gridH, heightMap, auxiliaryMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let y = 0; y < gridH; y++) {
    const v = y / gridH;
    const lat = Math.abs(v - 0.5) * 2.0;

    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      const pIdx = idx * 4;
      const h = heightMap[idx];
      const aux = auxiliaryMap[idx];

      let r = 128;
      let g = 128;
      let b = 128;

      switch (bodyKey) {
        case 'sun': {
          const plasma = h;
          r = Math.min(255, Math.floor(215 + plasma * 40));
          g = Math.min(255, Math.floor(85 + plasma * 145));
          b = Math.min(255, Math.floor(10 + Math.pow(plasma, 3) * 180));
          break;
        }

        case 'earth': {
          if (aux === 2.0) {
            r = 242;
            g = 247;
            b = 252;
          } else if (aux === 1.0) {
            const elev = Math.max(0, Math.min(1, (h - 0.35) * 1.45));
            if (elev > 0.76) {
              r = Math.floor(215 + elev * 35);
              g = Math.floor(218 + elev * 32);
              b = Math.floor(224 + elev * 28);
            } else if (elev > 0.48 || (lat > 0.18 && lat < 0.38 && aux > 0.5)) {
              r = Math.floor(158 + elev * 52);
              g = Math.floor(126 + elev * 38);
              b = Math.floor(78 + elev * 24);
            } else if (lat < 0.22) {
              r = Math.floor(28 + elev * 45);
              g = Math.floor(88 + elev * 55);
              b = Math.floor(34 + elev * 25);
            } else {
              r = Math.floor(54 + elev * 58);
              g = Math.floor(106 + elev * 48);
              b = Math.floor(44 + elev * 30);
            }
          } else {
            const depth = Math.max(0, Math.min(1, h / 0.23));
            r = Math.floor(6 + depth * 22);
            g = Math.floor(38 + depth * 64);
            b = Math.floor(82 + depth * 78);
          }
          break;
        }

        case 'mars': {
          if (lat > 0.91 + (aux - 0.5) * 0.06) {
            r = 244;
            g = 240;
            b = 236;
          } else {
            const basalt = aux > 0.54 ? (aux - 0.54) * 1.9 : 0.0;
            r = Math.floor(Math.max(58, Math.min(232, 188 + h * 46 - basalt * 115)));
            g = Math.floor(Math.max(32, Math.min(148, 86 + h * 38 - basalt * 64)));
            b = Math.floor(Math.max(20, Math.min(98, 48 + h * 24 - basalt * 38)));
          }
          break;
        }

        case 'mercury': {
          const shade = 78 + h * 118;
          r = Math.floor(shade * 1.02);
          g = Math.floor(shade * 0.99);
          b = Math.floor(shade * 0.95);
          break;
        }

        case 'moon': {
          const isMare = aux < 0.47;
          const baseLum = isMare ? 68 + h * 75 : 128 + h * 105;
          r = Math.floor(baseLum);
          g = Math.floor(baseLum * 0.99);
          b = Math.floor(baseLum * 0.97);
          break;
        }

        case 'venus': {
          r = Math.floor(142 + h * 108);
          g = Math.floor(84 + h * 96);
          b = Math.floor(24 + h * 58);
          break;
        }

        case 'jupiter': {
          const t = h;
          const turb = aux;
          if (t > 0.62) {
            r = Math.floor(228 + (t - 0.62) * 65);
            g = Math.floor(204 + (t - 0.62) * 70);
            b = Math.floor(166 + (t - 0.62) * 80);
          } else if (t > 0.38) {
            r = Math.floor(196 + turb * 38);
            g = Math.floor(134 + turb * 36);
            b = Math.floor(82 + turb * 30);
          } else {
            r = Math.floor(138 + t * 90);
            g = Math.floor(74 + t * 70);
            b = Math.floor(42 + t * 50);
          }
          break;
        }

        case 'saturn': {
          const band = h;
          r = Math.floor(194 + band * 54);
          g = Math.floor(166 + band * 56);
          b = Math.floor(108 + band * 48);
          break;
        }

        case 'uranus': {
          const band = h;
          r = Math.floor(110 + band * 55);
          g = Math.floor(208 + band * 38);
          b = Math.floor(224 + band * 28);
          break;
        }

        case 'neptune': {
          const band = h;
          r = Math.floor(24 + band * 42);
          g = Math.floor(68 + band * 76);
          b = Math.floor(168 + band * 78);
          break;
        }

        case 'io': {
          r = Math.floor(195 + h * 58);
          g = Math.floor(145 + aux * 85);
          b = Math.floor(22 + h * 40);
          break;
        }

        case 'europa': {
          r = Math.floor(198 + h * 48);
          g = Math.floor(218 + h * 34);
          b = Math.floor(232 + h * 22);
          break;
        }

        default: {
          r = Math.floor(168 + h * 72);
          g = Math.floor(116 + h * 64);
          b = Math.floor(44 + h * 42);
          break;
        }
      }

      data[pIdx] = Math.max(0, Math.min(255, r));
      data[pIdx + 1] = Math.max(0, Math.min(255, g));
      data[pIdx + 2] = Math.max(0, Math.min(255, b));
      data[pIdx + 3] = 255;
    }
  }

  mCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(masterCanvas, 0, 0, width, height);

  if (bodyKey === 'mercury' || bodyKey === 'moon') {
    draw4KCraterField(
      ctx,
      width,
      height,
      780,
      bodyKey === 'moon' ? 909 : 404,
      'rgba(248, 250, 252, 0.32)',
      'rgba(15, 23, 42, 0.46)',
      true
    );
  } else if (bodyKey === 'mars') {
    draw4KCraterField(
      ctx,
      width,
      height,
      360,
      505,
      'rgba(254, 215, 170, 0.24)',
      'rgba(67, 20, 7, 0.42)',
      false
    );
    const omX = width * 0.28;
    const omY = height * 0.39;
    const omGrad = ctx.createRadialGradient(omX, omY, 8, omX, omY, width * 0.038);
    omGrad.addColorStop(0, '#431407');
    omGrad.addColorStop(0.18, '#fde68a');
    omGrad.addColorStop(0.55, 'rgba(154, 52, 18, 0.55)');
    omGrad.addColorStop(1, 'rgba(154, 52, 18, 0)');
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, width * 0.038, 0, Math.PI * 2);
    ctx.fill();
  } else if (bodyKey === 'jupiter') {
    for (let y = 0; y < height; y += 4) {
      ctx.strokeStyle = y % 8 === 0 ? 'rgba(255, 251, 235, 0.14)' : 'rgba(120, 53, 15, 0.15)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 24) {
        const wave =
          Math.sin((x / width) * Math.PI * 16 + y * 0.08) * 11 +
          Math.cos((x / width) * Math.PI * 36 - y * 0.05) * 5;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    const grsX = width * 0.62;
    const grsY = height * 0.63;
    ctx.save();
    ctx.translate(grsX, grsY);
    ctx.scale(1.72, 1.0);
    const grsGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, width * 0.036);
    grsGrad.addColorStop(0, '#991b1b');
    grsGrad.addColorStop(0.35, '#dc2626');
    grsGrad.addColorStop(0.7, '#ea580c');
    grsGrad.addColorStop(0.88, '#fde68a');
    grsGrad.addColorStop(1, 'rgba(253, 230, 138, 0)');
    ctx.fillStyle = grsGrad;
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.036, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (bodyKey === 'neptune') {
    ctx.save();
    ctx.translate(width * 0.42, height * 0.58);
    ctx.scale(1.6, 0.92);
    const gds = ctx.createRadialGradient(0, 0, 10, 0, 0, width * 0.028);
    gds.addColorStop(0, 'rgba(15, 23, 42, 0.82)');
    gds.addColorStop(0.7, 'rgba(30, 58, 138, 0.55)');
    gds.addColorStop(0.9, 'rgba(186, 230, 253, 0.35)');
    gds.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = gds;
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function render4KBumpTexture(ctx, width, height, bodyKey) {
  const field = getBodySynthesizedField(bodyKey);
  const { gridW, gridH, heightMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let i = 0; i < gridW * gridH; i++) {
    const h = heightMap[i];
    const contrast = Math.max(0, Math.min(1, (h - 0.15) * 1.35));
    const val = Math.floor(contrast * 255);
    const pIdx = i * 4;
    data[pIdx] = val;
    data[pIdx + 1] = val;
    data[pIdx + 2] = val;
    data[pIdx + 3] = 255;
  }

  mCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(masterCanvas, 0, 0, width, height);

  if (bodyKey === 'mercury' || bodyKey === 'moon' || bodyKey === 'mars') {
    draw4KCraterField(
      ctx,
      width,
      height,
      620,
      bodyKey === 'mars' ? 505 : bodyKey === 'moon' ? 909 : 404,
      'rgba(255, 255, 255, 0.65)',
      'rgba(0, 0, 0, 0.72)',
      false
    );
  }
}

function render4KNormalTexture(ctx, width, height, bodyKey) {
  const field = getBodySynthesizedField(bodyKey);
  const { gridW, gridH, heightMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;
  const strength = bodyKey === 'earth' ? 5.5 : 8.0;

  for (let y = 0; y < gridH; y++) {
    const yUp = Math.max(0, y - 1);
    const yDown = Math.min(gridH - 1, y + 1);
    for (let x = 0; x < gridW; x++) {
      const xLeft = (x - 1 + gridW) % gridW;
      const xRight = (x + 1) % gridW;

      const dX = (heightMap[y * gridW + xRight] - heightMap[y * gridW + xLeft]) * strength;
      const dY = (heightMap[yDown * gridW + x] - heightMap[yUp * gridW + x]) * strength;
      const dZ = 1.0;
      const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);

      const nx = Math.floor(((-dX * invLen) * 0.5 + 0.5) * 255);
      const ny = Math.floor(((-dY * invLen) * 0.5 + 0.5) * 255);
      const nz = Math.floor(((dZ * invLen) * 0.5 + 0.5) * 255);

      const pIdx = (y * gridW + x) * 4;
      data[pIdx] = nx;
      data[pIdx + 1] = ny;
      data[pIdx + 2] = nz;
      data[pIdx + 3] = 255;
    }
  }

  mCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(masterCanvas, 0, 0, width, height);
}

function render4KRoughnessTexture(ctx, width, height, bodyKey) {
  const field = getBodySynthesizedField(bodyKey);
  const { gridW, gridH, heightMap, auxiliaryMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let i = 0; i < gridW * gridH; i++) {
    let roughByte = 235;
    if (bodyKey === 'earth') {
      const aux = auxiliaryMap[i];
      if (aux === 1.0) {
        roughByte = 242; // Continents: roughness ~ 0.95
      } else if (aux === 2.0) {
        roughByte = 184;
      } else {
        roughByte = 90; // Oceans: roughness ~ 0.35
      }
    } else {
      roughByte = Math.floor(224 + heightMap[i] * 26);
    }

    const pIdx = i * 4;
    data[pIdx] = roughByte;
    data[pIdx + 1] = roughByte;
    data[pIdx + 2] = roughByte;
    data[pIdx + 3] = 255;
  }

  mCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(masterCanvas, 0, 0, width, height);
}

function deriveEarthRoughnessFromSpecular(specularTexture, maxAnisotropy = 16) {
  const img = specularTexture?.image;
  if (!img) return null;

  const w = Math.min(2048, img.width || 1024);
  const h = Math.min(1024, img.height || 512);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const spec = data[i] / 255.0;
      const roughByte = Math.round((0.95 - spec * 0.6) * 255);
      data[i] = roughByte;
      data[i + 1] = roughByte;
      data[i + 2] = roughByte;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const roughTex = new THREE.CanvasTexture(canvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.ClampToEdgeWrapping;
    return applyTextureSharpness(roughTex, 'roughness', maxAnisotropy);
  } catch {
    return null;
  }
}

function render4KEarthSpecularTexture(ctx, width, height) {
  const field = getBodySynthesizedField('earth');
  const { gridW, gridH, auxiliaryMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let i = 0; i < gridW * gridH; i++) {
    const isOcean = auxiliaryMap[i] === 0.0;
    const val = isOcean ? 220 : 12;
    const pIdx = i * 4;
    data[pIdx] = val;
    data[pIdx + 1] = val;
    data[pIdx + 2] = val;
    data[pIdx + 3] = 255;
  }

  mCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(masterCanvas, 0, 0, width, height);
}

function render4KNightLightsTexture(ctx, width, height) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const field = getBodySynthesizedField('earth');
  const { gridW, gridH, auxiliaryMap } = field;

  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = gridW;
  masterCanvas.height = gridH;
  const mCtx = masterCanvas.getContext('2d');
  const imgData = mCtx.createImageData(gridW, gridH);
  const data = imgData.data;

  for (let y = 24; y < gridH - 24; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      const pIdx = idx * 4;
      if (auxiliaryMap[idx] === 1.0) {
        const urban = fbm2D(x * 0.14, y * 0.14, 5, 999);
        if (urban > 0.55) {
          const intensity = Math.min(1.0, (urban - 0.55) * 4.5);
          data[pIdx] = Math.floor(255 * intensity);
          data[pIdx + 1] = Math.floor(214 * intensity);
          data[pIdx + 2] = Math.floor(102 * intensity);
          data[pIdx + 3] = 255;
        }
      }
    }
  }

  mCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(masterCanvas, 0, 0, width, height);
}

function render4KRingTexture(ctx, width, height, bodyKey) {
  ctx.clearRect(0, 0, width, height);
  const isUranus = bodyKey === 'uranus';

  for (let x = 0; x < width; x++) {
    const t = x / width;
    let alpha = 0;
    let r = 234;
    let g = 198;
    let b = 138;

    if (isUranus) {
      const band = Math.sin(t * Math.PI * 36) * 0.5 + 0.5;
      alpha = t > 0.14 && t < 0.93 ? Math.pow(band, 4) * 0.44 : 0;
      r = 125;
      g = 232;
      b = 250;
    } else {
      const microRinglet = Math.sin(t * 620.0) * 0.08 + Math.cos(t * 1480.0) * 0.04;

      if (t >= 0.04 && t < 0.23) {
        alpha = 0.2 + 0.08 * Math.sin(t * 180.0) + microRinglet * 0.5;
        r = 178;
        g = 152;
        b = 118;
      } else if (t >= 0.23 && t < 0.615) {
        const tone = Math.sin(t * 95.0) * 0.5 + 0.5;
        alpha = 0.82 + 0.14 * Math.sin(t * 280.0) + microRinglet;
        r = Math.floor(236 + tone * 18);
        g = Math.floor(208 + tone * 22);
        b = Math.floor(154 + tone * 26);
      } else if (t >= 0.615 && t < 0.672) {
        alpha = 0.025;
      } else if (t >= 0.672 && t <= 0.965) {
        if ((t > 0.868 && t < 0.884) || (t > 0.95 && t < 0.956)) {
          alpha = 0.03;
        } else {
          alpha = 0.62 + 0.12 * Math.sin(t * 210.0) + microRinglet * 0.8;
          r = 224;
          g = 196;
          b = 148;
        }
      }
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
    ctx.fillRect(x, 0, 1, height);
  }
}

function loadUrlWithFallbacks(urlList, index, onSuccess, onAllFailed) {
  if (!Array.isArray(urlList) || index >= urlList.length) {
    if (typeof onAllFailed === 'function') onAllFailed();
    return;
  }
  const currentUrl = urlList[index];
  if (!currentUrl) {
    loadUrlWithFallbacks(urlList, index + 1, onSuccess, onAllFailed);
    return;
  }

  sharedTextureLoader.load(
    currentUrl,
    (loadedTexture) => {
      onSuccess(loadedTexture, currentUrl);
    },
    undefined,
    () => {
      loadUrlWithFallbacks(urlList, index + 1, onSuccess, onAllFailed);
    }
  );
}

/**
 * Loads official Three.js & 2K/4K CDN textures (`albedo`, `bump`, `normal`, `roughness`, `specular`, `clouds`, `night`, `ring`)
 * with `crossOrigin = 'anonymous'` and maximum anisotropic filtering.
 *
 * @param {string} bodyKey
 * @param {(mapType: string, texture: THREE.Texture, bundle: object) => void} [onTextureUpdated]
 * @param {number} [maxAnisotropy=16]
 * @returns {{ albedo: THREE.Texture, bump?: THREE.Texture, normal?: THREE.Texture, roughness?: THREE.Texture, specular?: THREE.Texture, clouds?: THREE.Texture, night?: THREE.Texture, ring?: THREE.Texture }}
 */
export function loadBodyTextures(bodyKey, onTextureUpdated, maxAnisotropy = 16) {
  const normalizedKey = String(bodyKey || 'earth').toLowerCase();
  const manifestEntry = TEXTURE_MANIFEST[normalizedKey] || {};

  const bundle = {
    albedo: createProceduralPlanetTexture(normalizedKey, 'albedo', maxAnisotropy)
  };

  if (normalizedKey !== 'sun') {
    bundle.bump = createProceduralPlanetTexture(normalizedKey, 'bump', maxAnisotropy);
    bundle.normal = createProceduralPlanetTexture(normalizedKey, 'normal', maxAnisotropy);
    bundle.roughness = createProceduralPlanetTexture(normalizedKey, 'roughness', maxAnisotropy);
  }

  if (normalizedKey === 'earth') {
    bundle.specular = createProceduralPlanetTexture('earth', 'specular', maxAnisotropy);
    bundle.clouds = createProceduralPlanetTexture('earth', 'clouds', maxAnisotropy);
    bundle.night = createProceduralPlanetTexture('earth', 'night', maxAnisotropy);
  }

  if (normalizedKey === 'saturn' || normalizedKey === 'uranus') {
    bundle.ring = createProceduralPlanetTexture(normalizedKey, 'ring', maxAnisotropy);
  }

  Object.entries(manifestEntry).forEach(([mapType, rawUrls]) => {
    if (!rawUrls) return;
    const urlList = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
    if (urlList.length === 0) return;

    const remoteCacheKey = `remote:${normalizedKey}:${mapType}:${urlList[0]}`;
    if (textureCache.has(remoteCacheKey)) {
      const cachedRemote = applyTextureSharpness(textureCache.get(remoteCacheKey), mapType, maxAnisotropy);
      bundle[mapType] = cachedRemote;
      if (typeof onTextureUpdated === 'function') {
        onTextureUpdated(mapType, cachedRemote, bundle);
      }
      return;
    }

    loadUrlWithFallbacks(
      urlList,
      0,
      (loadedTexture) => {
        loadedTexture.wrapS = mapType === 'ring' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        applyTextureSharpness(loadedTexture, mapType, maxAnisotropy);

        textureCache.set(remoteCacheKey, loadedTexture);
        bundle[mapType] = loadedTexture;

        if (normalizedKey === 'earth' && mapType === 'specular') {
          const derivedRoughness = deriveEarthRoughnessFromSpecular(loadedTexture, maxAnisotropy);
          if (derivedRoughness) {
            textureCache.set(`remote:earth:roughness:derived`, derivedRoughness);
            bundle.roughness = derivedRoughness;
            if (typeof onTextureUpdated === 'function') {
              onTextureUpdated('roughness', derivedRoughness, bundle);
            }
          }
        }

        if (typeof onTextureUpdated === 'function') {
          onTextureUpdated(mapType, loadedTexture, bundle);
        }
      },
      () => {
        // Silent fallback: retain existing texture
      }
    );
  });

  return bundle;
}

/**
 * Disposes all cached procedural and remote THREE.Texture instances to prevent VRAM leaks.
 */
export function disposeTextureCache() {
  for (const texture of textureCache.values()) {
    if (texture && typeof texture.dispose === 'function') {
      texture.dispose();
    }
  }
  textureCache.clear();
  heightfieldCache.clear();
}

export default TEXTURE_MANIFEST;
