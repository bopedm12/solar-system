/**
 * Main Asteroid Belt (Mars–Jupiter) & Kuiper Belt (Trans-Neptunian)
 * Renders 6,000 asteroids in 1 single Draw Call via THREE.InstancedMesh.
 * Zero-allocation per-frame orbital & tumble updates via GPU instanced attributes.
 */
import * as THREE from 'three';

// Pre-allocated static math helpers (never allocated inside update loops)
const _tmpMatrix = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();
const _tmpScale = new THREE.Vector3();
const _tmpColor = new THREE.Color();

const ASTEROID_VERTEX_SHADER = /* glsl */ `
  attribute vec4 aOrbitData;   // x: cinematicRadius, y: trueScaleRadius, z: initialAngle, w: angularSpeedRadPerDay
  attribute vec3 aBeltOffset;  // x: verticalOffsetCinematic, y: verticalOffsetTrue, z: tumbleSpeed

  uniform float uSimDays;
  uniform float uScaleMix;     // 0.0 = cinematic, 1.0 = true scale

  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;

  mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  void main() {
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(0.62, 0.58, 0.54);
    #endif

    // Local asteroid tumble rotation around X/Z
    float tumbleAngle = uSimDays * aBeltOffset.z;
    mat2 localSpin = rotate2d(tumbleAngle);
    vec3 spunPos = position;
    spunPos.xy = localSpin * spunPos.xy;

    vec3 spunNormal = normal;
    spunNormal.xy = localSpin * spunNormal.xy;

    // Apply instance local scale & orientation from instanceMatrix upper 3x3
    vec3 scaledLocalPos = mat3(instanceMatrix) * spunPos;
    float scaleFactor = mix(1.0, 0.52, uScaleMix);
    scaledLocalPos *= scaleFactor;

    // Compute Keplerian orbit position around Sun
    float orbitRadius = mix(aOrbitData.x, aOrbitData.y, uScaleMix);
    float currentAngle = aOrbitData.z + uSimDays * aOrbitData.w;
    float verticalY = mix(aBeltOffset.x, aBeltOffset.y, uScaleMix);

    vec3 orbitCenter = vec3(
      cos(currentAngle) * orbitRadius,
      verticalY,
      sin(currentAngle) * orbitRadius
    );

    vec4 worldPosition = modelMatrix * vec4(orbitCenter + scaledLocalPos, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * spunNormal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ASTEROID_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;

  void main() {
    vec3 normalDir = normalize(vWorldNormal);
    // Sun is at origin (0, 0, 0)
    vec3 lightDir = normalize(-vWorldPos);
    float ndotl = max(dot(normalDir, lightDir), 0.0);

    // Lommel-Seeliger-like rocky regolith scattering + subtle ambient
    float diffuse = pow(ndotl, 0.82) * 0.92 + 0.14;
    vec3 finalColor = vColor * diffuse;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class AsteroidBelt {
  /**
   * @param {object} [options]
   * @param {number} [options.count=6000]
   * @param {string} [options.scaleMode='cinematic']
   */
  constructor(options = {}) {
    this.count = options.count || 6000;
    this.mainBeltCount = Math.floor(this.count * 0.72); // 4,320 in Main Belt (Mars-Jupiter)
    this.kuiperBeltCount = this.count - this.mainBeltCount; // 1,680 in Kuiper Belt (beyond Neptune)
    this.scaleMode = options.scaleMode || 'cinematic';

    this.geometry = this._createRockyGeometry();

    this.material = new THREE.ShaderMaterial({
      name: 'InstancedAsteroidKuiperBeltMaterial',
      uniforms: {
        uSimDays: { value: 0.0 },
        uScaleMix: { value: this.scaleMode === 'true' ? 1.0 : 0.0 }
      },
      vertexShader: ASTEROID_VERTEX_SHADER,
      fragmentShader: ASTEROID_FRAGMENT_SHADER
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
    this.mesh.name = 'AsteroidAndKuiperBelt_6000';
    this.mesh.frustumCulled = false;

    this._populateAsteroids();
  }

  _createRockyGeometry() {
    const geo = new THREE.IcosahedronGeometry(1.0, 0);
    const posAttr = geo.attributes.position;
    // Perturb vertices deterministically to look like irregular jagged space rocks
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const hash = Math.sin(vx * 12.9898 + vy * 78.233 + vz * 37.719) * 43758.5453;
      const factor = 0.76 + (hash - Math.floor(hash)) * 0.38;
      posAttr.setXYZ(i, vx * factor, vy * factor * 0.82, vz * factor);
    }
    geo.computeVertexNormals();
    return geo;
  }

  _populateAsteroids() {
    const orbitDataArray = new Float32Array(this.count * 4);
    const beltOffsetArray = new Float32Array(this.count * 3);

    let seed = 987654321;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < this.count; i++) {
      const isMainBelt = i < this.mainBeltCount;

      let cinematicRadius;
      let trueScaleRadius;
      let angularSpeed;
      let verticalCinematic;
      let verticalTrue;
      let baseSize;

      if (isMainBelt) {
        // Main Asteroid Belt between Mars (60 cinematic / 1.52 AU) and Jupiter (92 cinematic / 5.20 AU)
        const u = nextRand();
        const au = 2.12 + u * 1.18; // 2.12 AU to 3.30 AU
        cinematicRadius = 67.5 + u * 16.5 + (nextRand() - 0.5) * 2.2;
        trueScaleRadius = au * 60.0;

        // Kepler's 3rd Law angular speed: 2*PI / (365.256 * a^1.5) rad/day
        const periodDays = 365.256 * Math.pow(au, 1.5);
        angularSpeed = (Math.PI * 2.0) / periodDays;

        const gaussY = (nextRand() + nextRand() - 1.0);
        verticalCinematic = gaussY * 3.2;
        verticalTrue = gaussY * 7.5;
        baseSize = 0.14 + Math.pow(nextRand(), 3.2) * 0.52;

        // C-type (dark carbon), S-type (silicate grey-brown), M-type (metallic)
        const typeRoll = nextRand();
        if (typeRoll < 0.65) {
          _tmpColor.setRGB(0.42 + nextRand() * 0.08, 0.39 + nextRand() * 0.08, 0.36 + nextRand() * 0.07);
        } else if (typeRoll < 0.9) {
          _tmpColor.setRGB(0.62 + nextRand() * 0.12, 0.53 + nextRand() * 0.1, 0.45 + nextRand() * 0.08);
        } else {
          _tmpColor.setRGB(0.72 + nextRand() * 0.14, 0.71 + nextRand() * 0.14, 0.74 + nextRand() * 0.14);
        }
      } else {
        // Kuiper Belt beyond Neptune (198 cinematic / 30.1 AU to 48 AU)
        const u = nextRand();
        const au = 30.8 + u * 17.2;
        cinematicRadius = 208.0 + u * 46.0 + (nextRand() - 0.5) * 3.5;
        trueScaleRadius = au * 60.0;

        const periodDays = 365.256 * Math.pow(au, 1.5);
        angularSpeed = (Math.PI * 2.0) / periodDays;

        const gaussY = (nextRand() + nextRand() - 1.0);
        verticalCinematic = gaussY * 7.8;
        verticalTrue = gaussY * 28.0;
        baseSize = 0.22 + Math.pow(nextRand(), 2.8) * 0.68;

        // Kuiper Belt icy blue-grey & reddish tholin objects
        if (nextRand() < 0.68) {
          _tmpColor.setRGB(0.55 + nextRand() * 0.15, 0.64 + nextRand() * 0.15, 0.74 + nextRand() * 0.16);
        } else {
          _tmpColor.setRGB(0.68 + nextRand() * 0.12, 0.46 + nextRand() * 0.1, 0.42 + nextRand() * 0.1);
        }
      }

      const initialAngle = nextRand() * Math.PI * 2.0;

      // Store initial transform in instanceMatrix (including non-uniform rock elongation)
      _tmpPos.set(
        Math.cos(initialAngle) * cinematicRadius,
        verticalCinematic,
        Math.sin(initialAngle) * cinematicRadius
      );
      _tmpEuler.set(
        nextRand() * Math.PI * 2.0,
        nextRand() * Math.PI * 2.0,
        nextRand() * Math.PI * 2.0
      );
      _tmpQuat.setFromEuler(_tmpEuler);
      _tmpScale.set(
        baseSize * (0.75 + nextRand() * 0.65),
        baseSize * (0.65 + nextRand() * 0.55),
        baseSize * (0.75 + nextRand() * 0.65)
      );

      _tmpMatrix.compose(_tmpPos, _tmpQuat, _tmpScale);
      this.mesh.setMatrixAt(i, _tmpMatrix);
      this.mesh.setColorAt(i, _tmpColor);

      const idx4 = i * 4;
      orbitDataArray[idx4] = cinematicRadius;
      orbitDataArray[idx4 + 1] = trueScaleRadius;
      orbitDataArray[idx4 + 2] = initialAngle;
      orbitDataArray[idx4 + 3] = angularSpeed;

      const idx3 = i * 3;
      beltOffsetArray[idx3] = verticalCinematic;
      beltOffsetArray[idx3 + 1] = verticalTrue;
      beltOffsetArray[idx3 + 2] = (nextRand() - 0.5) * 0.45;
    }

    this.geometry.setAttribute('aOrbitData', new THREE.InstancedBufferAttribute(orbitDataArray, 4));
    this.geometry.setAttribute('aBeltOffset', new THREE.InstancedBufferAttribute(beltOffsetArray, 3));

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Zero-allocation per-frame update.
   * @param {number} simDays - Current simulation days since J2000
   * @param {number} [scaleMixValue] - Optional smooth interpolation value (0 = cinematic, 1 = true scale)
   */
  update(simDays, scaleMixValue) {
    this.material.uniforms.uSimDays.value = simDays;
    if (scaleMixValue !== undefined) {
      this.material.uniforms.uScaleMix.value = scaleMixValue;
    }
  }

  /**
   * Switches between 'cinematic' and 'true' scale mode.
   * @param {'cinematic'|'true'} scaleMode
   */
  setScaleMode(scaleMode) {
    this.scaleMode = scaleMode === 'true' ? 'true' : 'cinematic';
    this.material.uniforms.uScaleMix.value = this.scaleMode === 'true' ? 1.0 : 0.0;
  }

  /**
   * Releases GPU geometry and shader material.
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
