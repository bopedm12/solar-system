/**
 * Deep-Space Spectral Starfield (15,000 Stars in 1 Draw Call via THREE.InstancedMesh)
 * Uses Harvard spectral classification (O, B, A, F, G, K, M) colors & magnitudes.
 * Zero memory allocation during the 120 FPS render loop.
 */
import * as THREE from 'three';

// Harvard spectral classes: color hex & probability weight
const SPECTRAL_CLASSES = [
  { type: 'O', color: 0x9bb0ff, weight: 0.02, scaleRange: [2.2, 3.6] },
  { type: 'B', color: 0xaabfff, weight: 0.06, scaleRange: [1.8, 2.9] },
  { type: 'A', color: 0xcad7ff, weight: 0.14, scaleRange: [1.4, 2.2] },
  { type: 'F', color: 0xf8f7ff, weight: 0.19, scaleRange: [1.1, 1.8] },
  { type: 'G', color: 0xfff4ea, weight: 0.24, scaleRange: [0.9, 1.6] },
  { type: 'K', color: 0xffd2a1, weight: 0.20, scaleRange: [0.8, 1.4] },
  { type: 'M', color: 0xffcc6f, weight: 0.15, scaleRange: [0.6, 1.2] }
];

const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aPhase;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    vPhase = aPhase;

    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    float twinkle = 0.84 + 0.16 * sin(uTime * 1.9 + vPhase);
    gl_FragColor = vec4(vColor * twinkle, 1.0);
  }
`;

export class Starfield {
  /**
   * @param {object} [options]
   * @param {number} [options.count=15000]
   * @param {number} [options.minRadius=2800]
   * @param {number} [options.maxRadius=6500]
   */
  constructor(options = {}) {
    this.count = options.count || 15000;
    this.minRadius = options.minRadius || 2800;
    this.maxRadius = options.maxRadius || 6500;

    // Lightweight octahedron/tetrahedron crystal star geometry (4 triangles per star, 1 draw call total)
    this.geometry = new THREE.TetrahedronGeometry(1.0, 0);

    this.material = new THREE.ShaderMaterial({
      name: 'InstancedSpectralStarfieldMaterial',
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
    this.mesh.name = 'SpectralStarfield_15000';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;

    this._populateInstances();
  }

  _pickSpectralClass(rand) {
    let acc = 0;
    for (let i = 0; i < SPECTRAL_CLASSES.length; i++) {
      acc += SPECTRAL_CLASSES[i].weight;
      if (rand <= acc) {
        return SPECTRAL_CLASSES[i];
      }
    }
    return SPECTRAL_CLASSES[SPECTRAL_CLASSES.length - 1];
  }

  _populateInstances() {
    const dummyMatrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    const phases = new Float32Array(this.count);

    // Deterministic seeded PRNG for reproducible galactic band + spherical halo
    let seed = 1337420;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < this.count; i++) {
      const spectral = this._pickSpectralClass(nextRand());

      // Concentrate ~35% of stars near the Milky Way galactic plane, ~65% isotropic
      const inGalacticDisk = nextRand() < 0.35;
      const u = nextRand() * 2.0 - 1.0;
      const latFactor = inGalacticDisk ? u * Math.abs(u) * 0.28 : u;
      const theta = nextRand() * Math.PI * 2.0;
      const phi = Math.acos(Math.max(-1.0, Math.min(1.0, latFactor)));

      const dist = this.minRadius + (this.maxRadius - this.minRadius) * Math.pow(nextRand(), 0.45);
      const sinPhi = Math.sin(phi);

      pos.set(
        dist * sinPhi * Math.cos(theta),
        dist * Math.cos(phi),
        dist * sinPhi * Math.sin(theta)
      );

      // Slight tilt of the Milky Way band relative to the ecliptic (~60 deg)
      if (inGalacticDisk) {
        const tilt = 1.047; // ~60 deg in rad
        const y = pos.y * Math.cos(tilt) - pos.z * Math.sin(tilt);
        const z = pos.y * Math.sin(tilt) + pos.z * Math.cos(tilt);
        pos.y = y;
        pos.z = z;
      }

      const [minS, maxS] = spectral.scaleRange;
      const radiusScale = (minS + (maxS - minS) * Math.pow(nextRand(), 2.2)) * (dist / 2400);
      scale.set(radiusScale, radiusScale, radiusScale);

      quat.setFromEuler(
        new THREE.Euler(nextRand() * Math.PI, nextRand() * Math.PI, nextRand() * Math.PI)
      );

      dummyMatrix.compose(pos, quat, scale);
      this.mesh.setMatrixAt(i, dummyMatrix);

      color.setHex(spectral.color);
      // Slight luminosity variation per star
      color.multiplyScalar(0.75 + 0.55 * nextRand());
      this.mesh.setColorAt(i, color);

      phases[i] = nextRand() * Math.PI * 2.0;
    }

    this.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.mesh.updateMatrix();
  }

  /**
   * Zero-allocation per-frame update. Centers starfield on camera so stars remain at infinity.
   * @param {number} elapsedSeconds
   * @param {THREE.Vector3} [cameraWorldPos]
   */
  update(elapsedSeconds, cameraWorldPos) {
    this.material.uniforms.uTime.value = elapsedSeconds;
    if (cameraWorldPos) {
      this.mesh.position.copy(cameraWorldPos);
      this.mesh.updateMatrix();
    }
  }

  /**
   * Releases GPU buffers & materials.
   */
  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.mesh && typeof this.mesh.dispose === 'function') {
      this.mesh.dispose();
    }
  }
}
