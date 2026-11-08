/**
 * Custom GLSL Shaders for:
 * 1. Planetary Rayleigh Atmosphere Scattering & Gas Giant Limb-Darkening Halo
 * 2. Earth 3-Layer Realism:
 *    - Layer 1: PBR-like Surface Shader (Matte Land roughness 0.95, GGX Ocean Specular roughness 0.35,
 *               Terminator Perturbed Bump Relief 0.045, Night City Lights on dark hemisphere)
 *    - Layer 2: Detached Volumetric-look Cloud Layer (scale 1.006, day-lit & terminator-tinted, dark on night side)
 *    - Layer 3: Rayleigh Fresnel Atmosphere Halo (scale 1.025)
 * Zero-allocation uniform updates for 120 FPS rendering.
 */
import * as THREE from 'three';

const ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;
  uniform vec3 uSunsetColor;
  uniform float uIntensity;
  uniform float uPower;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normalDir = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 sunDir = normalize(uSunDirection);

    // Fresnel limb factor: soft falloff into deep space at grazing angles
    float viewDot = clamp(abs(dot(normalDir, viewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - viewDot, uPower);

    // Strict Day / Terminator / Night modulation so the night side stays dark
    float sunOrientation = dot(normalDir, sunDir);
    float dayExposure = smoothstep(-0.22, 0.42, sunOrientation);
    float terminatorBand = exp(-pow((sunOrientation + 0.03) * 4.6, 2.0));

    vec3 scatterColor = mix(uAtmosphereColor, uSunsetColor, terminatorBand * 0.65);
    float alpha = fresnel * (0.04 + 0.96 * dayExposure) * uIntensity;

    gl_FragColor = vec4(scatterColor * (1.08 + terminatorBand * 0.38), clamp(alpha, 0.0, 0.9));
  }
`;

const EARTH_SURFACE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vObjectPos;

  void main() {
    vUv = uv;
    vObjectPos = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const EARTH_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uCloudsMap;
  uniform sampler2D uBumpMap;
  uniform sampler2D uRoughnessMap;
  uniform float uHasNightMap;
  uniform float uHasCloudsMap;
  uniform float uHasBumpMap;
  uniform float uHasRoughnessMap;
  uniform float uBumpScale;
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vObjectPos;

  // Lightweight procedural city lights fallback if uNightMap is still streaming
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  // GGX / Trowbridge-Reitz Normal Distribution Function for realistic ocean microfacets
  float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = 3.14159265 * denom * denom;
    return a2 / max(denom, 0.0001);
  }

  // Tangent-free UV finite-difference bump normal perturbation for 3D mountain shadows along Terminator
  vec3 computePerturbedNormal(vec3 baseNormal, vec2 uv) {
    vec2 texelStep = vec2(1.0 / 2048.0, 1.0 / 1024.0);
    float hCenter;
    float hRight;
    float hUp;

    if (uHasBumpMap > 0.5) {
      hCenter = texture2D(uBumpMap, uv).r;
      hRight = texture2D(uBumpMap, uv + vec2(texelStep.x, 0.0)).r;
      hUp = texture2D(uBumpMap, uv + vec2(0.0, texelStep.y)).r;
    } else {
      vec3 c0 = texture2D(uDayMap, uv).rgb;
      vec3 cX = texture2D(uDayMap, uv + vec2(texelStep.x, 0.0)).rgb;
      vec3 cY = texture2D(uDayMap, uv + vec2(0.0, texelStep.y)).rgb;
      hCenter = dot(c0, vec3(0.333));
      hRight = dot(cX, vec3(0.333));
      hUp = dot(cY, vec3(0.333));
    }

    float dHx = (hRight - hCenter) * uBumpScale * 28.0;
    float dHy = (hUp - hCenter) * uBumpScale * 28.0;

    vec3 upRef = abs(baseNormal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(upRef, baseNormal));
    vec3 bitangent = cross(baseNormal, tangent);

    return normalize(baseNormal - tangent * dHx - bitangent * dHy);
  }

  void main() {
    vec3 geomNormal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 sunDir = normalize(uSunDirection);

    vec3 dayAlbedo = texture2D(uDayMap, vUv).rgb;

    // Determine land vs ocean mask from roughness/specular map or color heuristic
    float oceanMask;
    if (uHasRoughnessMap > 0.5) {
      // In earth_specular_2048, ocean is bright (1.0) and land is dark (0.0)
      oceanMask = clamp(texture2D(uRoughnessMap, vUv).r, 0.0, 1.0);
    } else {
      oceanMask = clamp((dayAlbedo.b - max(dayAlbedo.r, dayAlbedo.g) * 0.84) * 5.0, 0.0, 1.0);
    }

    // Perturb normal only on continents/islands so oceans remain hydrodynamically smooth
    vec3 normalDir = mix(computePerturbedNormal(geomNormal, vUv), geomNormal, oceanMask * 0.88);

    float ndotlGeom = dot(geomNormal, sunDir);
    float ndotl = dot(normalDir, sunDir);

    float dayFactor = smoothstep(-0.12, 0.18, ndotlGeom);
    float nightFactor = 1.0 - smoothstep(-0.18, 0.04, ndotlGeom);
    float twilightFactor = exp(-pow((ndotlGeom + 0.01) * 8.0, 2.0));

    // Subtle cloud shadow projected onto the surface from the detached cloud layer
    vec2 cloudShadowUv = vec2(fract(vUv.x - uTime * 0.0012 + 0.0015), vUv.y - 0.001);
    float cloudShadowSample = uHasCloudsMap > 0.5 ? texture2D(uCloudsMap, cloudShadowUv).r : 0.0;
    float surfaceShadowAtten = 1.0 - cloudShadowSample * 0.42;

    // PBR Roughness: Continents are strictly matte (roughness = 0.95), Oceans have soft solar glint (roughness = 0.35)
    float surfaceRoughness = mix(0.95, 0.35, oceanMask);
    vec3 halfVec = normalize(sunDir + viewDir);
    float ggxD = distributionGGX(normalDir, halfVec, surfaceRoughness);
    float fresnelSpec = 0.02 + 0.18 * pow(1.0 - max(dot(viewDir, halfVec), 0.0), 5.0);
    // Zero specular on land (oceanMask = 0), soft GGX sun reflection on ocean (oceanMask = 1)
    vec3 oceanSpecular = vec3(1.0, 0.93, 0.82) * ggxD * fresnelSpec * oceanMask * max(ndotl, 0.0) * surfaceShadowAtten * 0.45;

    // Lambertian + Oren-Nayar-like matte diffuse on continents & deep ocean scattering
    float diffuseTerm = max(ndotl, 0.0) * surfaceShadowAtten;
    vec3 litDay = dayAlbedo * (0.015 + diffuseTerm * 1.04) + oceanSpecular;

    // Warm Rayleigh sunset along the Terminator line
    vec3 twilightGlow = vec3(0.95, 0.36, 0.12) * twilightFactor * (0.22 + 0.25 * max(ndotl, 0.0));

    // Night hemisphere city lights strictly where dot(normal, sunDirection) < 0
    vec3 nightTex = texture2D(uNightMap, vUv).rgb;
    float landHeuristic = 1.0 - oceanMask;
    float latMask = smoothstep(0.82, 0.25, abs(vObjectPos.y));
    float procGrid = smoothstep(0.78, 0.98, hash21(floor(vUv * vec2(200.0, 100.0))));
    vec3 procNightLights = vec3(1.0, 0.74, 0.36) * procGrid * landHeuristic * latMask * 0.82;

    vec3 cityLights = mix(procNightLights, nightTex * vec3(1.15, 0.9, 0.62) * 1.35, uHasNightMap);
    cityLights *= (1.0 - cloudShadowSample * 0.65);

    // Deep space dark night side (0.008 ambient) + golden city lights
    vec3 darkSide = dayAlbedo * 0.008 + cityLights * nightFactor;

    // Subtle atmospheric Rayleigh rim on sunlit limb
    float fresnelRim = pow(1.0 - clamp(dot(geomNormal, viewDir), 0.0, 1.0), 3.6);
    vec3 atmosphereRim = uAtmosphereColor * fresnelRim * smoothstep(-0.2, 0.45, ndotlGeom) * 0.48;

    vec3 finalColor = mix(darkSide, litDay, dayFactor) + twilightGlow + atmosphereRim;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const EARTH_CLOUDS_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const EARTH_CLOUDS_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uCloudsMap;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec3 normalDir = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    float cloudDensity = texture2D(uCloudsMap, vUv).r;
    if (cloudDensity < 0.02) discard;

    float ndotl = dot(normalDir, sunDir);
    float dayLit = smoothstep(-0.14, 0.28, ndotl);
    float terminatorTint = exp(-pow((ndotl + 0.02) * 7.0, 2.0));

    vec3 dayCloudColor = vec3(0.98, 0.99, 1.0) * (0.02 + max(ndotl, 0.0) * 1.05);
    vec3 sunsetCloudColor = vec3(1.0, 0.48, 0.22) * terminatorTint * 0.52;
    vec3 nightCloudColor = vec3(0.015, 0.022, 0.038);

    vec3 finalCloudRGB = mix(nightCloudColor, dayCloudColor, dayLit) + sunsetCloudColor;
    float alpha = clamp(cloudDensity * (0.18 + 0.74 * dayLit), 0.0, 0.9);

    gl_FragColor = vec4(finalCloudRGB, alpha);
  }
`;

/**
 * Creates a Fresnel Rayleigh atmospheric scattering & limb-darkening ShaderMaterial.
 * Used for Earth's outer halo (scale 1.025) and Gas/Ice Giant atmospheric rims.
 * @param {object} [options]
 * @param {number|string|THREE.Color} [options.color=0x38bdf8]
 * @param {number|string|THREE.Color} [options.sunsetColor=0xff6b2b]
 * @param {number} [options.intensity=0.95]
 * @param {number} [options.power=3.2]
 * @returns {THREE.ShaderMaterial}
 */
export function createAtmosphereMaterial(options = {}) {
  const color = new THREE.Color(options.color !== undefined ? options.color : 0x38bdf8);
  const sunsetColor = new THREE.Color(options.sunsetColor !== undefined ? options.sunsetColor : 0xff6b2b);
  const intensity = options.intensity !== undefined ? options.intensity : 0.95;
  const power = options.power !== undefined ? options.power : 3.2;

  return new THREE.ShaderMaterial({
    name: 'PlanetaryAtmosphereMaterial',
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uAtmosphereColor: { value: color },
      uSunsetColor: { value: sunsetColor },
      uIntensity: { value: intensity },
      uPower: { value: power }
    },
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false
  });
}

/**
 * Layer 1 of Earth: Surface ShaderMaterial with matte continents (roughness 0.95),
 * GGX microfacet ocean specular (roughness 0.35), Perturbed Bump Relief (0.045),
 * and Night City Lights on the dark hemisphere (dot(normal, sunDirection) < 0).
 * @param {object} [options]
 * @param {THREE.Texture|null} [options.dayMap]
 * @param {THREE.Texture|null} [options.nightMap]
 * @param {THREE.Texture|null} [options.cloudsMap]
 * @param {THREE.Texture|null} [options.bumpMap]
 * @param {THREE.Texture|null} [options.roughnessMap]
 * @returns {THREE.ShaderMaterial}
 */
export function createEarthSurfaceMaterial(options = {}) {
  const bumpScale = options.bumpScale !== undefined ? options.bumpScale : 0.045;
  const mat = new THREE.ShaderMaterial({
    name: 'EarthDayNightPBRShaderMaterial',
    uniforms: {
      uDayMap: { value: options.dayMap || null },
      uNightMap: { value: options.nightMap || null },
      uCloudsMap: { value: options.cloudsMap || null },
      uBumpMap: { value: options.bumpMap || null },
      uRoughnessMap: { value: options.roughnessMap || null },
      uHasNightMap: { value: options.nightMap ? 1.0 : 0.0 },
      uHasCloudsMap: { value: options.cloudsMap ? 1.0 : 0.0 },
      uHasBumpMap: { value: options.bumpMap ? 1.0 : 0.0 },
      uHasRoughnessMap: { value: options.roughnessMap ? 1.0 : 0.0 },
      uBumpScale: { value: bumpScale },
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uAtmosphereColor: { value: new THREE.Color(0x38bdf8) },
      uTime: { value: 0.0 }
    },
    vertexShader: EARTH_SURFACE_VERTEX_SHADER,
    fragmentShader: EARTH_SURFACE_FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true
  });

  // Expose PBR metadata for QA inspection
  mat.userData = {
    roughness: 0.95,
    oceanRoughness: 0.35,
    metalness: 0.0,
    bumpScale
  };

  return mat;
}

/**
 * Layer 2 of Earth: Detached Cloud Layer ShaderMaterial (rendered on a separate sphere at scale 1.006).
 * @param {object} [options]
 * @param {THREE.Texture|null} [options.cloudsMap]
 * @returns {THREE.ShaderMaterial}
 */
export function createEarthCloudsMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    name: 'EarthDetachedCloudsShaderMaterial',
    uniforms: {
      uCloudsMap: { value: options.cloudsMap || null },
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
    },
    vertexShader: EARTH_CLOUDS_VERTEX_SHADER,
    fragmentShader: EARTH_CLOUDS_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false
  });
}

/**
 * Zero-allocation update for atmosphere, Earth surface, and Earth cloud shaders.
 * @param {THREE.ShaderMaterial|null} material
 * @param {THREE.Vector3} sunDirNormalized - Pre-normalized vector from planet to Sun
 * @param {number} [elapsedSeconds=0]
 */
export function updatePlanetShaderUniforms(material, sunDirNormalized, elapsedSeconds = 0) {
  if (!material || !material.uniforms) return;
  if (material.uniforms.uSunDirection) {
    material.uniforms.uSunDirection.value.copy(sunDirNormalized);
  }
  if (material.uniforms.uTime) {
    material.uniforms.uTime.value = elapsedSeconds;
  }
}
