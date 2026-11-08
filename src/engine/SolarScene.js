/**
 * NASA 3D Solar System — Core 60-120 FPS WebGL Scene Engine (Giai đoạn 8: Liquid Glass, Milky Way & Standalone Moon)
 * Features:
 * - Strict Zero-Allocation requestAnimationFrame loop (all Vector3/Matrix4/Quaternion/Color pre-allocated)
 * - Custom GLSL Milky Way & Deep Nebula SkySphere (`galaxyBackgroundShader.js`, centered on `camera.position`)
 * - Ultra-crisp 128x128 High-LOD SphereGeometry (`lodHigh: 128x128`, `lodMid: 64x64`, `lodLow: 32x32`)
 * - Full Anisotropic Filtering (`renderer.capabilities.getMaxAnisotropy()`) & SRGB/Linear ColorSpace enforcement
 * - Zero "Plastic Shine" PBR Materials:
 *   * Rocky Planets (`mercury`, `venus`, `mars`): `roughness: 0.92`, `metalness: 0.0`, `bumpScale: 0.04`
 *   * Standalone Moon (`moon`): `roughness: 0.95`, `metalness: 0.0`, `bumpScale: 0.04` (`moon_1024.jpg` map & bumpMap)
 *   * Gas & Ice Giants: `roughness: 0.88`, `metalness: 0.0`, `bumpScale: 0.015` + GLSL Fresnel Limb-Darkening
 *   * Earth 3-Layer Architecture:
 *     - Layer 1: Surface (Matte Land 0.95, GGX Ocean 0.35, Perturbed Bump 0.045, Night City Lights)
 *     - Layer 2: Detached Cloud Sphere (`SphereGeometry(1, 96, 96)` at `scale: 1.008`, `MeshStandardMaterial`
 *                with `map` & `alphaMap` from `earth_clouds_1024.png`, `opacity: 0.86`, `roughness: 1.0`)
 *     - Layer 3: Rayleigh Fresnel Atmosphere Halo (`scale: 1.025`)
 * - Space Lighting: `AmbientLight(intensity: 0.04)` + `ACESFilmicToneMapping(exposure: 1.1)`
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

import { SOLAR_SYSTEM_DATA, CELESTIAL_ORDER } from '../data/solarSystemData.js';
import { loadBodyTextures, disposeTextureCache } from '../data/textureManifest.js';
import {
  computeOrbitalPosition,
  computeMoonPosition,
  computeAxialRotationAngle,
  generateOrbitPathPoints,
  getScaledBodyRadius
} from './orbitalMechanics.js';
import {
  createSunSurfaceMaterial,
  createSunCoronaMaterial,
  updateSunShaders
} from './shaders/sunShader.js';
import {
  createAtmosphereMaterial,
  createEarthSurfaceMaterial,
  updatePlanetShaderUniforms
} from './shaders/atmosphereShader.js';
import { createGalaxyBackgroundMesh } from './shaders/galaxyBackgroundShader.js';
import { Starfield } from './Starfield.js';
import { AsteroidBelt } from './AsteroidBelt.js';
import { GhostControls } from './GhostControls.js';

// ============================================================================
// PRE-ALLOCATED STATIC MATH REGISTERS (ZERO ALLOCATION IN RENDER LOOP)
// ============================================================================
const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpVecC = new THREE.Vector3();
const _tmpSunDir = new THREE.Vector3();
const _tmpFollowPos = new THREE.Vector3();
const _tmpFollowDelta = new THREE.Vector3();
const _tmpPointerNDC = new THREE.Vector2();
const _flyStartTarget = new THREE.Vector3();
const _flyStartOffset = new THREE.Vector3();
const _flyDesiredOffset = new THREE.Vector3();
const _flyStartCam = new THREE.Vector3();
const _flyEndTarget = new THREE.Vector3();
const _flyEndCam = new THREE.Vector3();

const DEG_TO_RAD = Math.PI / 180.0;
const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000.0;

const ROCKY_BUMP_SCALES = {
  mercury: 0.04,
  venus: 0.04,
  mars: 0.04,
  moon: 0.04,
  io: 0.04,
  europa: 0.04,
  titan: 0.04
};

export class SolarScene {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {object} [options.solarData]
   * @param {string[]} [options.celestialOrder]
   * @param {Function} [options.onSelectBody]
   * @param {Function} [options.onOrbitDragActivity]
   * @param {Function} [options.onTelemetryTick]
   * @param {Function} [options.onContextStateChange]
   */
  constructor(options = {}) {
    this.canvas = options.canvas;
    this.solarData = options.solarData || SOLAR_SYSTEM_DATA;
    this.celestialOrder = options.celestialOrder || CELESTIAL_ORDER;
    this.onSelectBody = options.onSelectBody || null;
    this.onOrbitDragActivity = options.onOrbitDragActivity || null;
    this.onTelemetryTick = options.onTelemetryTick || null;
    this.onContextStateChange = options.onContextStateChange || null;

    this.isRunning = false;
    this.isContextLost = false;
    this.rafId = null;

    // Simulation clock state (starts at current real UTC date relative to J2000)
    this.simDays = (Date.now() - J2000_EPOCH_MS) / MS_PER_DAY;
    this.elapsedSeconds = 0.0;
    this.lastFrameTimeMs = 0.0;

    // Time Warp & Scale Mode
    this.timeScale = 1;
    this.isPaused = false;
    this.scaleMode = 'cinematic'; // 'cinematic' | 'true'
    this.scaleMixState = { value: 0.0 };
    this.orbitsVisible = true;

    // Seamless Hybrid Orbit + Free-Fly WASD State
    // Starts in Overview mode (no planet locked, Telemetry panel hidden until user clicks a planet or Moon)
    this.selectedBodyKey = null;
    this.lockedPlanet = null;
    this.isFollowingBody = false;
    this._hasPrevFollowPos = false;
    this._prevFollowWorldPos = new THREE.Vector3();
    this._cameraFlyTween = null;
    this._scaleTween = null;

    // Pointer drag state for dimming Telemetry panel (`opacity: 0.25`) while orbiting around a locked body
    this._isPointerDown = false;
    this._isOrbitDragging = false;
    this._pointerDownX = 0;
    this._pointerDownY = 0;
    this._raycaster = new THREE.Raycaster();

    // Pre-allocated telemetry & profiler structs mutated in-place (zero GC pressure)
    this._liveOrbitalSample = {
      heliocentricDistanceAU: 1.0,
      instantVelocityKms: 29.78,
      trueAnomalyDeg: 0.0
    };

    this._telemetryPacket = {
      fps: 120,
      frameTimeMs: 4.2,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      simDays: this.simDays,
      simTimestampMs: Date.now(),
      timeScale: this.timeScale,
      isPaused: this.isPaused,
      scaleMode: this.scaleMode,
      selectedBodyKey: null,
      heliocentricDistanceAU: 1.0,
      instantVelocityKms: 29.78,
      trueAnomalyDeg: 0.0
    };

    // FPS rolling accumulator
    this._fpsFrameCount = 0;
    this._fpsAccumMs = 0.0;
    this._smoothedFrameMs = 6.5;
    this._lastHudEmitMs = 0.0;

    // Collections for fast indexed iteration inside _update (no Object.entries/forEach allocations)
    this.bodyMap = new Map();
    this.bodyEntries = [];
    this.pickableMeshes = [];
    this.orbitLinesGroup = new THREE.Group();
    this.orbitLinesGroup.name = 'KeplerOrbitLinesGroup';
    this.lunarOrbitLine = null;

    this._initRendererAndScene();
    this._initSharedGeometries();
    this._buildEnvironment();
    this._buildCelestialBodies();
    this._buildOrbitLines();
    this._initHybridFreeFlyController();
    this._bindEvents();
  }

  _initRendererAndScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
      stencil: false,
      depth: true
    });

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    // ACES Filmic Tone Mapping calibrated to exposure 1.1 for crisp, non-blown-out highlights
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Query maximum hardware anisotropic filtering for razor-sharp grazing angles
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy() || 8;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.08,
      65000
    );
    this.camera.position.set(0, 115, 225);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 1.15;
    this.controls.panSpeed = 0.8;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 4800;
    this.controls.target.set(0, 0, 0);

    // Deep-Space Lighting: High-contrast heliocentric PointLight + ultra-low 0.04 AmbientLight
    this.sunLight = new THREE.PointLight(0xfff8ed, 3.4, 0, 0.0);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x0f172a, 0.04);
    this.scene.add(this.ambientLight);
  }

  /**
   * Enforces texture sharpness: hardware maxAnisotropy, trilinear mipmap filtering,
   * and strict SRGBColorSpace (for Albedo/Night/Ring) vs NoColorSpace (for Bump/Normal/Roughness/Clouds).
   *
   * @param {THREE.Texture|null|undefined} texture
   * @param {string} [mapType='albedo']
   */
  _configureTextureQuality(texture, mapType = 'albedo') {
    if (!texture) return;
    const isColorMap = mapType === 'albedo' || mapType === 'night' || mapType === 'ring';
    texture.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }

  /**
   * Applies `_configureTextureQuality` across all maps in a texture bundle.
   * @param {object} bundle
   */
  _configureBundleQuality(bundle) {
    if (!bundle) return;
    const keys = Object.keys(bundle);
    for (let i = 0; i < keys.length; i++) {
      const mapType = keys[i];
      this._configureTextureQuality(bundle[mapType], mapType);
    }
  }

  _initSharedGeometries() {
    this.sharedGeometries = {
      lodHigh: new THREE.SphereGeometry(1.0, 128, 128),
      lodMid: new THREE.SphereGeometry(1.0, 64, 64),
      lodLow: new THREE.SphereGeometry(1.0, 32, 32),
      earthClouds: new THREE.SphereGeometry(1.0, 96, 96),
      atmosphereShell: new THREE.SphereGeometry(1.025, 64, 64),
      sunCoronaShell: new THREE.SphereGeometry(1.42, 64, 64)
    };
  }

  _buildEnvironment() {
    // 1. Custom GLSL Milky Way & Deep Nebula SkySphere (`SphereGeometry(45000, 48, 48)`)
    this.galaxySkyMesh = createGalaxyBackgroundMesh();
    this.scene.add(this.galaxySkyMesh);

    // 2. 15,000 Spectral Stars in 1 InstancedMesh draw call
    this.starfield = new Starfield({
      count: 15000,
      minRadius: 3200,
      maxRadius: 7200
    });
    this.scene.add(this.starfield.mesh);

    // 3. 6,000 Main Belt + Kuiper Belt Asteroids in 1 InstancedMesh draw call
    this.asteroidBelt = new AsteroidBelt({
      count: 6000,
      scaleMode: this.scaleMode
    });
    this.scene.add(this.asteroidBelt.mesh);

    this.scene.add(this.orbitLinesGroup);
  }

  _buildCelestialBodies() {
    for (let idx = 0; idx < this.celestialOrder.length; idx++) {
      const key = this.celestialOrder[idx];
      const data = this.solarData[key];
      if (!data) continue;

      const entry = this._createBodyHierarchy(key, data);
      this.bodyMap.set(key, entry);
      this.bodyEntries.push(entry);
      this.scene.add(entry.orbitAnchor);
    }

    // Perform initial orbital placement at current simDays
    this._updateAllBodyPositions();
  }

  _initHybridFreeFlyController() {
    this.controls.enabled = true;
    this.ghostControls = new GhostControls({
      camera: this.camera,
      controls: this.controls,
      onFreeFlyInterrupt: () => {
        this.detachPlanetLock();
      }
    });
  }

  /**
   * Immediately detaches planet lock (`lockedPlanet = null`, `isFollowingBody = false`),
   * stops any active GSAP camera fly tween, and notifies HUD to hide the Telemetry panel.
   */
  detachPlanetLock() {
    if (this._cameraFlyTween) {
      this._cameraFlyTween.kill();
      this._cameraFlyTween = null;
    }
    const hadSelection = Boolean(this.lockedPlanet || this.selectedBodyKey);
    this.lockedPlanet = null;
    this.isFollowingBody = false;
    this.selectedBodyKey = null;
    this._hasPrevFollowPos = false;
    this._highlightSelectedOrbitLine(null);

    if (this._isOrbitDragging) {
      this._isOrbitDragging = false;
      if (typeof this.onOrbitDragActivity === 'function') {
        this.onOrbitDragActivity(false);
      }
    }

    if (hadSelection && typeof this.onSelectBody === 'function') {
      this.onSelectBody(null, null, null);
    }
  }

  /**
   * Blocks or unblocks WASD keyboard shortcuts when a modal overlay is open.
   * @param {boolean} isBlocked
   */
  setKeyboardInputBlocked(isBlocked) {
    if (this.ghostControls) {
      this.ghostControls.setInputBlocked(isBlocked);
    }
  }

  _createBodyHierarchy(key, data) {
    const orbitAnchor = new THREE.Group();
    orbitAnchor.name = `OrbitAnchor_${key}`;

    // Tilt group applies axialTiltDeg (obliquity) relative to orbital plane
    const tiltGroup = new THREE.Group();
    tiltGroup.name = `AxialTilt_${key}`;
    tiltGroup.rotation.z = (data.axialTiltDeg || 0.0) * DEG_TO_RAD;
    orbitAnchor.add(tiltGroup);

    // Scale group scales unit LOD geometry to cinematicRadius or trueScaleRadius
    const scaleGroup = new THREE.Group();
    scaleGroup.name = `RadiusScale_${key}`;
    const initialRadius = getScaledBodyRadius(data, this.scaleMode);
    scaleGroup.scale.setScalar(initialRadius);
    tiltGroup.add(scaleGroup);

    // Spin group rotates around local Y axis according to sidereal rotationPeriodHours
    const spinGroup = new THREE.Group();
    spinGroup.name = `SpinAxis_${key}`;
    scaleGroup.add(spinGroup);

    let surfaceMaterial = null;
    let coronaMaterial = null;
    let atmosphereMaterial = null;
    let cloudMesh = null;
    let cloudMaterial = null;
    let lodOrMesh = null;

    if (key === 'sun') {
      const texBundle = loadBodyTextures(
        'sun',
        (mapType, tex) => {
          this._configureTextureQuality(tex, mapType);
          if (mapType === 'albedo' && surfaceMaterial) {
            surfaceMaterial.uniforms.uSurfaceMap.value = tex;
            surfaceMaterial.uniforms.uHasTexture.value = 1.0;
          }
        },
        this.maxAnisotropy
      );
      this._configureBundleQuality(texBundle);

      surfaceMaterial = createSunSurfaceMaterial({ surfaceMap: texBundle.albedo });
      const sunMesh = new THREE.Mesh(this.sharedGeometries.lodHigh, surfaceMaterial);
      sunMesh.name = 'CelestialBody_sun';
      sunMesh.userData.bodyKey = 'sun';
      spinGroup.add(sunMesh);
      this.pickableMeshes.push(sunMesh);
      lodOrMesh = sunMesh;

      coronaMaterial = createSunCoronaMaterial();
      const coronaMesh = new THREE.Mesh(this.sharedGeometries.sunCoronaShell, coronaMaterial);
      coronaMesh.name = 'SunCoronaHalo';
      scaleGroup.add(coronaMesh);
    } else {
      // Planet or First-Class Moon with 3-tier THREE.LOD (128x128 close, 64x64 mid, 32x32 far)
      const lod = new THREE.LOD();
      lod.name = `LOD_${key}`;

      if (key === 'earth') {
        const texBundle = loadBodyTextures(
          'earth',
          (mapType, tex) => {
            this._configureTextureQuality(tex, mapType);
            if (!surfaceMaterial || !surfaceMaterial.uniforms) return;
            if (mapType === 'albedo') {
              surfaceMaterial.uniforms.uDayMap.value = tex;
            } else if (mapType === 'night') {
              surfaceMaterial.uniforms.uNightMap.value = tex;
              surfaceMaterial.uniforms.uHasNightMap.value = 1.0;
            } else if (mapType === 'clouds') {
              surfaceMaterial.uniforms.uCloudsMap.value = tex;
              surfaceMaterial.uniforms.uHasCloudsMap.value = 1.0;
              if (cloudMaterial) {
                cloudMaterial.map = tex;
                cloudMaterial.alphaMap = tex;
                cloudMaterial.needsUpdate = true;
              }
            } else if (mapType === 'bump' || mapType === 'normal') {
              surfaceMaterial.uniforms.uBumpMap.value = tex;
              surfaceMaterial.uniforms.uHasBumpMap.value = 1.0;
            } else if (mapType === 'roughness' || mapType === 'specular') {
              surfaceMaterial.uniforms.uRoughnessMap.value = tex;
              surfaceMaterial.uniforms.uHasRoughnessMap.value = 1.0;
            }
          },
          this.maxAnisotropy
        );
        this._configureBundleQuality(texBundle);

        // Layer 1: Earth Surface (Matte Land roughness 0.95, GGX Ocean 0.35, Perturbed Bump 0.045, Night Lights)
        surfaceMaterial = createEarthSurfaceMaterial({
          dayMap: texBundle.albedo,
          nightMap: texBundle.night,
          cloudsMap: texBundle.clouds,
          bumpMap: texBundle.bump || texBundle.normal || texBundle.albedo,
          roughnessMap: texBundle.roughness || texBundle.specular,
          bumpScale: 0.045
        });

        // Layer 2: Natural Soft Cloud Sphere (`SphereGeometry(1, 96, 96)` at `scale: 1.008` using `MeshStandardMaterial`)
        cloudMaterial = new THREE.MeshStandardMaterial({
          name: 'EarthCloudsStandardMaterial',
          map: texBundle.clouds,
          alphaMap: texBundle.clouds,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
          roughness: 1.0,
          metalness: 0.0,
          blending: THREE.NormalBlending
        });
        cloudMesh = new THREE.Mesh(this.sharedGeometries.earthClouds, cloudMaterial);
        cloudMesh.name = 'earthCloudsMesh';
        cloudMesh.scale.setScalar(1.008);
        scaleGroup.add(cloudMesh);
      } else {
        const isGasOrIceGiant = data.type === 'gas_giant' || data.type === 'ice_giant';
        const targetRoughness = key === 'moon' ? 0.95 : isGasOrIceGiant ? 0.88 : 0.92;
        const targetBumpScale = isGasOrIceGiant ? 0.015 : (ROCKY_BUMP_SCALES[key] || 0.04);

        const texBundle = loadBodyTextures(
          key,
          (mapType, tex) => {
            this._configureTextureQuality(tex, mapType);
            if (!surfaceMaterial) return;
            if (mapType === 'albedo') {
              surfaceMaterial.map = tex;
              if (!surfaceMaterial.bumpMap || key === 'moon') {
                surfaceMaterial.bumpMap = tex;
              }
              surfaceMaterial.needsUpdate = true;
            } else if (mapType === 'bump') {
              surfaceMaterial.bumpMap = tex;
              surfaceMaterial.needsUpdate = true;
            } else if (mapType === 'normal') {
              surfaceMaterial.normalMap = tex;
              surfaceMaterial.needsUpdate = true;
            }
          },
          this.maxAnisotropy
        );
        this._configureBundleQuality(texBundle);

        surfaceMaterial = new THREE.MeshStandardMaterial({
          name: `PBRMaterial_${key}`,
          map: texBundle.albedo,
          bumpMap: texBundle.bump || texBundle.albedo,
          bumpScale: targetBumpScale,
          roughness: targetRoughness,
          metalness: 0.0
        });
      }

      const meshHigh = new THREE.Mesh(this.sharedGeometries.lodHigh, surfaceMaterial);
      const meshMid = new THREE.Mesh(this.sharedGeometries.lodMid, surfaceMaterial);
      const meshLow = new THREE.Mesh(this.sharedGeometries.lodLow, surfaceMaterial);

      meshHigh.userData.bodyKey = key;
      meshMid.userData.bodyKey = key;
      meshLow.userData.bodyKey = key;

      lod.addLevel(meshHigh, 0);
      lod.addLevel(meshMid, 85);
      lod.addLevel(meshLow, 220);

      spinGroup.add(lod);
      this.pickableMeshes.push(meshHigh);
      lodOrMesh = lod;

      // Layer 3 (Earth scale 1.025) & Gas/Terrestrial Atmospheric Rayleigh Fresnel Shell
      if (data.hasAtmosphere && data.atmosphere) {
        atmosphereMaterial = createAtmosphereMaterial({
          color: data.atmosphere.color || data.color,
          intensity: key === 'earth' ? 1.15 : (data.atmosphere.intensity || 0.62),
          power: key === 'earth' ? 3.0 : 3.4
        });
        const atmoMesh = new THREE.Mesh(this.sharedGeometries.atmosphereShell, atmosphereMaterial);
        atmoMesh.name = `Atmosphere_${key}`;
        scaleGroup.add(atmoMesh);
      }

      // Planetary Ring System (Saturn & Uranus) aligned with planet's equatorial tiltGroup
      if (data.hasRings && data.ringSystem) {
        const ringMesh = this._createPlanetaryRingMesh(key, data.ringSystem);
        scaleGroup.add(ringMesh);
      }
    }

    // Create secondary moons (Io, Europa, Titan) orbiting around their parent planet
    const moonEntries = [];
    if (Array.isArray(data.moons) && data.moons.length > 0) {
      for (let m = 0; m < data.moons.length; m++) {
        const moonData = data.moons[m];
        const moonEntry = this._createMoonMesh(moonData);
        orbitAnchor.add(moonEntry.anchor);
        moonEntries.push(moonEntry);
      }
    }

    return {
      key,
      data,
      orbitAnchor,
      tiltGroup,
      scaleGroup,
      spinGroup,
      lodOrMesh,
      surfaceMaterial,
      coronaMaterial,
      atmosphereMaterial,
      cloudMesh,
      cloudMaterial,
      moonEntries,
      currentScaledRadius: initialRadius
    };
  }

  _createPlanetaryRingMesh(bodyKey, ringSystem) {
    const innerR = ringSystem.innerRadiusMultiplier || 1.3;
    const outerR = ringSystem.outerRadiusMultiplier || 2.35;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 1);

    // Remap RingGeometry UVs radially (u = 0 at inner edge, u = 1 at outer edge)
    const posAttr = ringGeo.attributes.position;
    const uvAttr = ringGeo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const radius = Math.sqrt(vx * vx + vy * vy);
      const u = (radius - innerR) / Math.max(0.001, outerR - innerR);
      uvAttr.setXY(i, Math.max(0, Math.min(1, u)), 0.5);
    }
    uvAttr.needsUpdate = true;

    let ringMat = null;
    const texBundle = loadBodyTextures(
      bodyKey,
      (mapType, tex) => {
        this._configureTextureQuality(tex, mapType);
        if (mapType === 'ring' && ringMat) {
          ringMat.map = tex;
          ringMat.needsUpdate = true;
        }
      },
      this.maxAnisotropy
    );
    this._configureBundleQuality(texBundle);

    ringMat = new THREE.MeshStandardMaterial({
      name: `RingMaterial_${bodyKey}`,
      map: texBundle.ring,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: ringSystem.opacity ?? 0.9,
      roughness: 0.88,
      metalness: 0.0,
      depthWrite: false
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.name = `PlanetaryRing_${bodyKey}`;
    ringMesh.rotation.x = Math.PI * 0.5;
    return ringMesh;
  }

  _createMoonMesh(moonData) {
    const anchor = new THREE.Group();
    anchor.name = `MoonAnchor_${moonData.key}`;

    let mat = null;
    const texBundle = loadBodyTextures(
      moonData.key,
      (mapType, tex) => {
        this._configureTextureQuality(tex, mapType);
        if (!mat) return;
        if (mapType === 'albedo') {
          mat.map = tex;
          if (!mat.bumpMap) mat.bumpMap = tex;
          mat.needsUpdate = true;
        } else if (mapType === 'bump') {
          mat.bumpMap = tex;
          mat.needsUpdate = true;
        }
      },
      this.maxAnisotropy
    );
    this._configureBundleQuality(texBundle);

    mat = new THREE.MeshStandardMaterial({
      name: `MoonPBRMaterial_${moonData.key}`,
      map: texBundle.albedo,
      bumpMap: texBundle.bump || texBundle.albedo,
      bumpScale: ROCKY_BUMP_SCALES[moonData.key] || 0.04,
      roughness: 0.92,
      metalness: 0.0
    });

    const mesh = new THREE.Mesh(this.sharedGeometries.lodMid, mat);
    const initialR = this.scaleMode === 'true'
      ? (moonData.trueScaleRadius || 0.25)
      : (moonData.cinematicRadius || 0.45);
    mesh.scale.setScalar(initialR);
    anchor.add(mesh);

    return {
      data: moonData,
      anchor,
      mesh,
      material: mat
    };
  }

  _buildOrbitLines() {
    while (this.orbitLinesGroup.children.length > 0) {
      const child = this.orbitLinesGroup.children[0];
      this.orbitLinesGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (this.lunarOrbitLine && this.lunarOrbitLine.parent) {
      this.lunarOrbitLine.parent.remove(this.lunarOrbitLine);
      if (this.lunarOrbitLine.geometry) this.lunarOrbitLine.geometry.dispose();
      if (this.lunarOrbitLine.material) this.lunarOrbitLine.material.dispose();
      this.lunarOrbitLine = null;
    }

    for (let i = 0; i < this.bodyEntries.length; i++) {
      const entry = this.bodyEntries[i];
      if (entry.key === 'sun') continue;

      // Do not draw a giant heliocentric orbit for the Moon; attach a local lunar orbit ring around Earth instead
      if (entry.key === 'moon' || entry.data.parentBodyKey === 'earth' || entry.data.parentId === 'earth') {
        const earthEntry = this.bodyMap.get('earth');
        if (earthEntry) {
          const lunarPts = [];
          const segments = 96;
          const period = entry.data.orbitalPeriodDays || 27.32;
          for (let s = 0; s <= segments; s++) {
            const sampleDays = (s / segments) * period;
            const pt = new THREE.Vector3();
            computeMoonPosition(entry.data, earthEntry.currentScaledRadius, sampleDays, pt, this.scaleMode);
            lunarPts.push(pt);
          }
          const lunarGeo = new THREE.BufferGeometry().setFromPoints(lunarPts);
          const lunarMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(entry.data.orbitColor || '#cbd5e1'),
            transparent: true,
            opacity: this.selectedBodyKey === 'moon' ? 0.68 : 0.28,
            depthWrite: false
          });
          this.lunarOrbitLine = new THREE.Line(lunarGeo, lunarMat);
          this.lunarOrbitLine.name = 'OrbitLine_moon_local';
          this.lunarOrbitLine.userData.bodyKey = 'moon';
          this.lunarOrbitLine.visible = this.orbitsVisible;
          earthEntry.orbitAnchor.add(this.lunarOrbitLine);
        }
        continue;
      }

      const points = generateOrbitPathPoints(entry.data, this.scaleMode, 192);
      if (points.length === 0) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const isSelected = entry.key === this.selectedBodyKey;
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(entry.data.orbitColor || entry.data.color || '#38bdf8'),
        transparent: true,
        opacity: isSelected ? 0.68 : 0.24,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);
      line.name = `OrbitLine_${entry.key}`;
      line.userData.bodyKey = entry.key;
      this.orbitLinesGroup.add(line);
    }

    this.orbitLinesGroup.visible = this.orbitsVisible;
  }

  _highlightSelectedOrbitLine(selectedKey) {
    const children = this.orbitLinesGroup.children;
    for (let i = 0; i < children.length; i++) {
      const line = children[i];
      if (line.material) {
        line.material.opacity = line.userData.bodyKey === selectedKey ? 0.72 : 0.22;
      }
    }
    if (this.lunarOrbitLine && this.lunarOrbitLine.material) {
      this.lunarOrbitLine.material.opacity = selectedKey === 'moon' ? 0.75 : 0.28;
    }
  }

  /**
   * Zero-allocation update of all celestial body positions, axial spins, Earth detached clouds, and shader uniforms.
   */
  _updateAllBodyPositions() {
    for (let i = 0; i < this.bodyEntries.length; i++) {
      const entry = this.bodyEntries[i];
      const {
        key,
        data,
        orbitAnchor,
        spinGroup,
        lodOrMesh,
        surfaceMaterial,
        coronaMaterial,
        atmosphereMaterial,
        cloudMesh,
        moonEntries
      } = entry;

      if (key === 'sun') {
        orbitAnchor.position.set(0, 0, 0);
        spinGroup.rotation.y = computeAxialRotationAngle(data, this.simDays);
        updateSunShaders(surfaceMaterial, coronaMaterial, this.elapsedSeconds);
        if (key === this.selectedBodyKey) {
          this._liveOrbitalSample.heliocentricDistanceAU = 0.0;
          this._liveOrbitalSample.instantVelocityKms = data.orbitalVelocityKms || 220.0;
          this._liveOrbitalSample.trueAnomalyDeg = 0.0;
        }
        continue;
      }

      const isSelected = key === this.selectedBodyKey;

      // Standalone Moon orbits around Earth's world position
      if (key === 'moon' || data.parentBodyKey === 'earth' || data.parentId === 'earth') {
        const earthEntry = this.bodyMap.get('earth');
        const parentRadius = earthEntry ? earthEntry.currentScaledRadius : 1.85;
        computeMoonPosition(data, parentRadius, this.simDays, _tmpVecB, this.scaleMode);
        if (earthEntry) {
          _tmpVecA.copy(earthEntry.orbitAnchor.position).add(_tmpVecB);
        } else {
          _tmpVecA.copy(_tmpVecB);
        }
        orbitAnchor.position.copy(_tmpVecA);

        if (isSelected) {
          this._liveOrbitalSample.heliocentricDistanceAU = data.semiMajorAxisAU || 1.00257;
          this._liveOrbitalSample.instantVelocityKms = data.orbitalVelocityKms || 1.022;
          this._liveOrbitalSample.trueAnomalyDeg = 0.0;
        }
      } else {
        // Compute 3D Keplerian heliocentric position into pre-allocated _tmpVecA
        computeOrbitalPosition(
          data,
          this.simDays,
          this.scaleMode,
          _tmpVecA,
          isSelected ? this._liveOrbitalSample : undefined
        );
        orbitAnchor.position.copy(_tmpVecA);
      }

      // Update sidereal axial spin (respects retrograde negative rotationPeriodHours & Moon's tidal lock)
      const rotAngle = computeAxialRotationAngle(data, this.simDays);
      spinGroup.rotation.y = rotAngle;

      // Normalized direction vector from body to Sun (0,0,0) = -normalize(bodyPos)
      _tmpSunDir.copy(_tmpVecA).negate().normalize();

      if (key === 'earth') {
        if (surfaceMaterial) {
          updatePlanetShaderUniforms(surfaceMaterial, _tmpSunDir, this.elapsedSeconds);
        }
        if (cloudMesh) {
          // Detached troposphere clouds rotate slightly faster than solid Earth
          cloudMesh.rotation.y = rotAngle * 1.14 + this.elapsedSeconds * 0.008;
        }
      }
      if (atmosphereMaterial) {
        updatePlanetShaderUniforms(atmosphereMaterial, _tmpSunDir, this.elapsedSeconds);
      }

      // Update LOD level based on camera distance
      if (lodOrMesh && lodOrMesh.isLOD) {
        lodOrMesh.update(this.camera);
      }

      // Update secondary moons (Io, Europa, Titan) around parent planet
      for (let m = 0; m < moonEntries.length; m++) {
        const moon = moonEntries[m];
        computeMoonPosition(
          moon.data,
          entry.currentScaledRadius,
          this.simDays,
          _tmpVecB,
          this.scaleMode
        );
        moon.anchor.position.copy(_tmpVecB);
        moon.mesh.rotation.y = computeAxialRotationAngle(moon.data, this.simDays);
      }
    }
  }

  /**
   * Smoothly flies the camera to lock & follow a celestial body (Planet, Sun, or Moon) using GSAP.
   * @param {string} bodyKey
   * @param {object} [options]
   * @param {boolean} [options.immediate=false]
   */
  focusBody(bodyKey, options = {}) {
    const normalizedKey = String(bodyKey || 'earth').toLowerCase();
    const entry = this.bodyMap.get(normalizedKey);
    if (!entry) return;

    this.selectedBodyKey = normalizedKey;
    this.lockedPlanet = normalizedKey;
    this.isFollowingBody = true;
    this.controls.enabled = true;
    this._highlightSelectedOrbitLine(normalizedKey);

    this._updateAllBodyPositions();

    this._prevFollowWorldPos.copy(entry.orbitAnchor.position);
    this._hasPrevFollowPos = true;

    const r = entry.currentScaledRadius;
    const idealDist = normalizedKey === 'sun'
      ? r * 3.6
      : normalizedKey === 'moon'
        ? Math.max(r * 4.2, 2.2)
        : Math.max(r * 3.8, 2.6);

    _tmpVecA.copy(entry.orbitAnchor.position);
    if (_tmpVecA.lengthSq() < 0.001) {
      _tmpVecA.set(0.3, 0.35, 1.0).normalize();
    } else {
      _tmpVecA.normalize();
      const angle = 0.65;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const nx = _tmpVecA.x * cosA - _tmpVecA.z * sinA;
      const nz = _tmpVecA.x * sinA + _tmpVecA.z * cosA;
      _tmpVecA.set(nx, 0.36, nz).normalize();
    }

    _flyDesiredOffset.copy(_tmpVecA).multiplyScalar(idealDist);

    if (this._cameraFlyTween) {
      this._cameraFlyTween.kill();
      this._cameraFlyTween = null;
    }

    if (options.immediate) {
      this.controls.target.copy(entry.orbitAnchor.position);
      this.camera.position.copy(entry.orbitAnchor.position).add(_flyDesiredOffset);
      this.controls.update();
    } else {
      _flyStartTarget.copy(this.controls.target);
      _flyStartOffset.copy(this.camera.position).sub(_flyStartTarget);
      const tweenObj = { t: 0 };

      this._cameraFlyTween = gsap.to(tweenObj, {
        t: 1,
        duration: 1.45,
        ease: 'power3.inOut',
        onUpdate: () => {
          const currentBodyPos = entry.orbitAnchor.position;
          this.controls.target.lerpVectors(_flyStartTarget, currentBodyPos, tweenObj.t);
          _tmpVecC.lerpVectors(_flyStartOffset, _flyDesiredOffset, tweenObj.t);
          this.camera.position.copy(this.controls.target).add(_tmpVecC);
        },
        onComplete: () => {
          this._prevFollowWorldPos.copy(entry.orbitAnchor.position);
          this._hasPrevFollowPos = true;
          this._cameraFlyTween = null;
        }
      });
    }

    if (typeof this.onSelectBody === 'function') {
      this.onSelectBody(normalizedKey, entry.data, {
        heliocentricDistanceAU: this._liveOrbitalSample.heliocentricDistanceAU,
        instantVelocityKms: this._liveOrbitalSample.instantVelocityKms,
        trueAnomalyDeg: this._liveOrbitalSample.trueAnomalyDeg,
        scaleMode: this.scaleMode
      });
    }
  }

  /**
   * Resets camera to a grand solar system overview and hides the Telemetry panel.
   * @param {object} [options]
   * @param {boolean} [options.immediate=false]
   */
  resetOverviewCamera(options = {}) {
    if (this._cameraFlyTween) {
      this._cameraFlyTween.kill();
      this._cameraFlyTween = null;
    }

    this.lockedPlanet = null;
    this.isFollowingBody = false;
    this.selectedBodyKey = null;
    this._hasPrevFollowPos = false;
    this._highlightSelectedOrbitLine(null);

    if (this._isOrbitDragging) {
      this._isOrbitDragging = false;
      if (typeof this.onOrbitDragActivity === 'function') {
        this.onOrbitDragActivity(false);
      }
    }

    _flyEndTarget.set(0, 0, 0);
    if (this.scaleMode === 'true') {
      _flyEndCam.set(0, 260, 520);
    } else {
      _flyEndCam.set(0, 115, 225);
    }

    if (options.immediate) {
      this.controls.target.copy(_flyEndTarget);
      this.camera.position.copy(_flyEndCam);
      this.controls.update();
    } else {
      _flyStartTarget.copy(this.controls.target);
      _flyStartCam.copy(this.camera.position);

      const tweenObj = { t: 0 };
      this._cameraFlyTween = gsap.to(tweenObj, {
        t: 1,
        duration: 1.5,
        ease: 'power3.inOut',
        onUpdate: () => {
          this.controls.target.lerpVectors(_flyStartTarget, _flyEndTarget, tweenObj.t);
          this.camera.position.lerpVectors(_flyStartCam, _flyEndCam, tweenObj.t);
        },
        onComplete: () => {
          this._cameraFlyTween = null;
        }
      });
    }

    if (typeof this.onSelectBody === 'function') {
      this.onSelectBody(null, null, null);
    }
  }

  /**
   * Sets Time Warp speed multiplier & pause state.
   * @param {number} timeScale
   * @param {boolean} [isPaused=false]
   */
  setTimeWarp(timeScale, isPaused = false) {
    if (typeof timeScale === 'number' && Number.isFinite(timeScale)) {
      this.timeScale = timeScale;
    }
    this.isPaused = Boolean(isPaused);
  }

  /**
   * Toggles visibility of 3D Keplerian orbit lines (and local Lunar orbit line).
   * @param {boolean} visible
   */
  setOrbitLinesVisible(visible) {
    this.orbitsVisible = Boolean(visible);
    this.orbitLinesGroup.visible = this.orbitsVisible;
    if (this.lunarOrbitLine) {
      this.lunarOrbitLine.visible = this.orbitsVisible;
    }
  }

  /**
   * Toggles between 'cinematic' and 'true' scale mode with smooth transition.
   * @param {'cinematic'|'true'} scaleMode
   */
  setScaleMode(scaleMode) {
    const nextMode = scaleMode === 'true' ? 'true' : 'cinematic';
    if (this.scaleMode === nextMode) return;
    this.scaleMode = nextMode;

    for (let i = 0; i < this.bodyEntries.length; i++) {
      const entry = this.bodyEntries[i];
      const targetRadius = getScaledBodyRadius(entry.data, this.scaleMode);
      entry.currentScaledRadius = targetRadius;
      entry.scaleGroup.scale.setScalar(targetRadius);

      for (let m = 0; m < entry.moonEntries.length; m++) {
        const moon = entry.moonEntries[m];
        const moonR = this.scaleMode === 'true'
          ? (moon.data.trueScaleRadius || 0.25)
          : (moon.data.cinematicRadius || 0.45);
        moon.mesh.scale.setScalar(moonR);
      }
    }

    if (this._scaleTween) {
      this._scaleTween.kill();
    }
    this._scaleTween = gsap.to(this.scaleMixState, {
      value: this.scaleMode === 'true' ? 1.0 : 0.0,
      duration: 0.85,
      ease: 'power2.out',
      onUpdate: () => {
        if (this.asteroidBelt) {
          this.asteroidBelt.update(this.simDays, this.scaleMixState.value);
        }
      }
    });

    this._buildOrbitLines();
    this._updateAllBodyPositions();

    if (this.lockedPlanet && this.isFollowingBody) {
      this.focusBody(this.lockedPlanet, { immediate: false });
    }
  }

  /**
   * Starts the 120 FPS requestAnimationFrame render loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTimeMs = performance.now();
    this._renderLoop = this._renderLoop.bind(this);
    this.rafId = requestAnimationFrame(this._renderLoop);
  }

  /**
   * Stops the requestAnimationFrame loop.
   */
  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * STRICT ZERO-ALLOCATION 120 FPS RENDER LOOP (Frame Budget <= 8.33ms)
   * @param {number} nowMs
   */
  _renderLoop(nowMs) {
    if (!this.isRunning || this.isContextLost) return;
    this.rafId = requestAnimationFrame(this._renderLoop);

    const rawDeltaMs = Math.max(0.1, nowMs - this.lastFrameTimeMs);
    this.lastFrameTimeMs = nowMs;

    const deltaSeconds = Math.min(rawDeltaMs * 0.001, 0.1);
    this.elapsedSeconds += deltaSeconds;

    if (!this.isPaused) {
      const absScale = Math.abs(this.timeScale);
      const warpFactor = absScale <= 1
        ? (this.timeScale / 86400.0)
        : (this.timeScale * 0.0005);
      this.simDays += deltaSeconds * warpFactor;
    }

    // 1. Update all planetary & lunar Keplerian positions, axial rotations, and shaders
    this._updateAllBodyPositions();

    // 2. Seamless Hybrid Camera Update:
    //    - GhostControls applies WASD / Space / C / Shift free-flight delta simultaneously to
    //      `camera.position` and `controls.target` (and detaches `lockedPlanet` on movement)
    //    - If `isFollowingBody && lockedPlanet` is active, camera tracks the body's orbital delta
    //    - OrbitControls is always enabled for 360° mouse rotation and wheel zoom
    this.ghostControls.update(deltaSeconds);

    if (this.isFollowingBody && this.lockedPlanet) {
      const followedEntry = this.bodyMap.get(this.lockedPlanet);
      if (followedEntry && !this._cameraFlyTween) {
        _tmpFollowPos.copy(followedEntry.orbitAnchor.position);
        if (this._hasPrevFollowPos) {
          _tmpFollowDelta.subVectors(_tmpFollowPos, this._prevFollowWorldPos);
          this.camera.position.add(_tmpFollowDelta);
          this.controls.target.add(_tmpFollowDelta);
        }
        this._prevFollowWorldPos.copy(_tmpFollowPos);
        this._hasPrevFollowPos = true;
      }
    }

    this.controls.update();

    // 3. Synchronize Milky Way SkySphere center with camera position (Zero-allocation)
    //    and update InstancedMesh Starfield + Asteroid Belt
    if (this.galaxySkyMesh) {
      this.galaxySkyMesh.position.copy(this.camera.position);
    }
    this.starfield.update(this.elapsedSeconds, this.camera.position);
    this.asteroidBelt.update(this.simDays);

    // 4. Execute WebGL Render Pass
    this.renderer.render(this.scene, this.camera);

    // 5. Compute rolling FPS & Frame Time and emit throttled HUD telemetry (~5 Hz)
    this._fpsFrameCount++;
    this._fpsAccumMs += rawDeltaMs;
    this._smoothedFrameMs = this._smoothedFrameMs * 0.9 + rawDeltaMs * 0.1;

    if (nowMs - this._lastHudEmitMs >= 200.0) {
      const currentFps = Math.round((this._fpsFrameCount * 1000.0) / Math.max(1.0, this._fpsAccumMs));
      this._fpsFrameCount = 0;
      this._fpsAccumMs = 0.0;
      this._lastHudEmitMs = nowMs;

      const renderInfo = this.renderer.info;
      this._telemetryPacket.fps = currentFps;
      this._telemetryPacket.frameTimeMs = this._smoothedFrameMs;
      this._telemetryPacket.drawCalls = renderInfo.render.calls;
      this._telemetryPacket.triangles = renderInfo.render.triangles;
      this._telemetryPacket.geometries = renderInfo.memory.geometries;
      this._telemetryPacket.textures = renderInfo.memory.textures;
      this._telemetryPacket.simDays = this.simDays;
      this._telemetryPacket.simTimestampMs = J2000_EPOCH_MS + this.simDays * MS_PER_DAY;
      this._telemetryPacket.timeScale = this.timeScale;
      this._telemetryPacket.isPaused = this.isPaused;
      this._telemetryPacket.scaleMode = this.scaleMode;
      this._telemetryPacket.selectedBodyKey = this.selectedBodyKey;
      this._telemetryPacket.heliocentricDistanceAU = this._liveOrbitalSample.heliocentricDistanceAU;
      this._telemetryPacket.instantVelocityKms = this._liveOrbitalSample.instantVelocityKms;
      this._telemetryPacket.trueAnomalyDeg = this._liveOrbitalSample.trueAnomalyDeg;

      if (typeof this.onTelemetryTick === 'function') {
        this.onTelemetryTick(this._telemetryPacket);
      }
    }
  }

  _bindEvents() {
    this._onResize = () => {
      if (!this.renderer || !this.camera) return;
      const width = window.innerWidth;
      const height = Math.max(1, window.innerHeight);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height, false);
    };

    this._onPointerDown = (event) => {
      this._isPointerDown = true;
      this._pointerDownX = event.clientX;
      this._pointerDownY = event.clientY;
    };

    this._onPointerMove = (event) => {
      if (!this._isPointerDown || !this.isFollowingBody) return;
      const dx = event.clientX - this._pointerDownX;
      const dy = event.clientY - this._pointerDownY;
      if (!this._isOrbitDragging && dx * dx + dy * dy > 25) {
        this._isOrbitDragging = true;
        if (typeof this.onOrbitDragActivity === 'function') {
          this.onOrbitDragActivity(true);
        }
      }
    };

    this._endPointerInteraction = () => {
      this._isPointerDown = false;
      if (this._isOrbitDragging) {
        this._isOrbitDragging = false;
        if (typeof this.onOrbitDragActivity === 'function') {
          this.onOrbitDragActivity(false);
        }
      }
    };

    this._onPointerUp = (event) => {
      const dx = event.clientX - this._pointerDownX;
      const dy = event.clientY - this._pointerDownY;
      this._endPointerInteraction();

      if (dx * dx + dy * dy > 36) return;

      const rect = this.canvas.getBoundingClientRect();
      _tmpPointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2.0 - 1.0;
      _tmpPointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2.0 + 1.0;

      this._raycaster.setFromCamera(_tmpPointerNDC, this.camera);
      const hits = this._raycaster.intersectObjects(this.pickableMeshes, false);
      if (hits.length > 0) {
        const hitBodyKey = hits[0].object.userData?.bodyKey;
        if (hitBodyKey) {
          this.focusBody(hitBodyKey);
        }
      }
    };

    this._onContextLost = (event) => {
      event.preventDefault();
      this.isContextLost = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (typeof this.onContextStateChange === 'function') {
        this.onContextStateChange({
          status: 'lost',
          message: 'WebGL Context Lost — Tạm dừng vòng lặp 3D để bảo vệ GPU VRAM. Đang chờ khôi phục...'
        });
      }
    };

    this._onContextRestored = () => {
      this.isContextLost = false;
      this.lastFrameTimeMs = performance.now();
      if (typeof this.onContextStateChange === 'function') {
        this.onContextStateChange({
          status: 'restored',
          message: 'WebGL Context Restored — Đã khôi phục ngữ cảnh đồ họa 3D 120 FPS.'
        });
      }
      if (this.isRunning && this.rafId === null) {
        this.rafId = requestAnimationFrame(this._renderLoop);
      }
    };

    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointercancel', this._endPointerInteraction, { passive: true });
    this.canvas.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    this.canvas.addEventListener('pointerup', this._onPointerUp, { passive: true });
    this.canvas.addEventListener('pointerleave', this._endPointerInteraction, { passive: true });
    this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);
  }

  /**
   * Complete VRAM & Event cleanup to prevent memory leaks.
   */
  dispose() {
    this.stop();

    if (this._cameraFlyTween) {
      this._cameraFlyTween.kill();
      this._cameraFlyTween = null;
    }
    if (this._scaleTween) {
      this._scaleTween.kill();
      this._scaleTween = null;
    }

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointercancel', this._endPointerInteraction);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointerleave', this._endPointerInteraction);
      this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    }

    if (this.ghostControls) {
      this.ghostControls.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.galaxySkyMesh && typeof this.galaxySkyMesh.dispose === 'function') {
      this.galaxySkyMesh.dispose();
    }
    if (this.starfield) {
      this.starfield.dispose();
    }
    if (this.asteroidBelt) {
      this.asteroidBelt.dispose();
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            for (let i = 0; i < obj.material.length; i++) {
              obj.material[i].dispose();
            }
          } else if (typeof obj.material.dispose === 'function') {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.sharedGeometries) {
      Object.values(this.sharedGeometries).forEach((geo) => {
        if (geo && typeof geo.dispose === 'function') {
          geo.dispose();
        }
      });
    }

    disposeTextureCache();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
