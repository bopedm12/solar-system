/**
 * NASA 3D Solar System — Milky Way & Deep Nebula SkySphere Shader (`galaxyBackgroundShader.js`)
 * Renders a 45,000-unit celestial background dome (`THREE.BackSide`, `depthWrite: false`)
 * centered on `camera.position` with zero per-frame allocations.
 */
import * as THREE from 'three';

const GALAXY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDirection;

  void main() {
    vWorldDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GALAXY_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vWorldDirection;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(in vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec3(13.1, 7.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    vec3 galDir = normalize(vec3(dir.x, dir.y * 0.65 + dir.z * 0.75, -dir.y * 0.75 + dir.z * 0.65));
    float band = exp(-abs(galDir.y) * 5.5);
    float n1 = fbm(galDir * 3.2);
    float n2 = fbm(galDir * 7.5 - vec3(n1 * 1.4));
    float dustLane = smoothstep(0.38, 0.68, fbm(galDir * 5.0 + vec3(2.0)));

    vec3 deepSpace = vec3(0.006, 0.010, 0.022);
    vec3 nebulaBlue = vec3(0.032, 0.070, 0.155);
    vec3 nebulaWarm = vec3(0.10, 0.060, 0.125);
    vec3 coreGlow = vec3(0.17, 0.14, 0.11);

    vec3 col = deepSpace;
    col += nebulaBlue * (n1 * 0.55) * (0.25 + 0.75 * band);
    col += nebulaWarm * (n2 * 0.42) * band;
    col += coreGlow * pow(band, 2.2) * n1 * (1.0 - dustLane * 0.75);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Creates the Milky Way SkySphere mesh (`SphereGeometry(45000, 48, 48)`).
 * @returns {THREE.Mesh}
 */
export function createGalaxyBackgroundMesh() {
  const geometry = new THREE.SphereGeometry(45000, 48, 48);
  const material = new THREE.ShaderMaterial({
    name: 'GalaxyMilkyWaySkyMaterial',
    vertexShader: GALAXY_VERTEX_SHADER,
    fragmentShader: GALAXY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'GalaxyMilkyWaySkySphere';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;

  mesh.dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return mesh;
}
