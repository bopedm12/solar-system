/**
 * Custom GLSL Shaders for the Sun (Photosphere Plasma + Fresnel Corona Glow)
 * Zero-allocation runtime updates, 120 FPS optimized (no expensive multi-pass post-processing).
 */
import * as THREE from 'three';

const SUN_SURFACE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vObjectPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SUN_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uSurfaceMap;
  uniform float uHasTexture;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uCoronaColor;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying vec2 vUv;

  // Fast 3D Simplex-like hash & noise for 120 FPS target
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbmPlasma(vec3 p) {
    float value = 0.0;
    float amp = 0.52;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      value += amp * snoise(p * freq);
      freq *= 2.07;
      amp *= 0.48;
    }
    return value;
  }

  void main() {
    vec3 normalDir = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 sphereCoord = normalize(vObjectPosition);

    float t = uTime * 0.14;
    vec3 q = vec3(
      fbmPlasma(sphereCoord * 3.2 + vec3(0.0, t, t * 0.6)),
      fbmPlasma(sphereCoord * 3.2 + vec3(t * 0.8, 1.7, -t * 0.5)),
      fbmPlasma(sphereCoord * 3.2 + vec3(-t * 0.4, -t * 0.7, 2.3))
    );

    float granulation = fbmPlasma(sphereCoord * 6.5 + q * 1.45 + vec3(t * 0.35));
    float flareFilaments = abs(snoise(sphereCoord * 10.0 - q * 1.8 + vec3(0.0, t * 0.9, 0.0)));
    float plasmaIntensity = clamp(0.55 + 0.42 * granulation + 0.25 * (1.0 - flareFilaments), 0.0, 1.35);

    // Sunspot dark magnetic regions
    float spotMask = smoothstep(-0.55, -0.18, granulation);

    // Sample base procedural/NASA solar map if available
    vec3 texSample = texture2D(uSurfaceMap, vec2(vUv.x + uTime * 0.003, vUv.y)).rgb;
    float texLuma = dot(texSample, vec3(0.299, 0.587, 0.114));
    plasmaIntensity = mix(plasmaIntensity, plasmaIntensity * (0.72 + 0.55 * texLuma), uHasTexture);

    // Multi-stop blackbody thermal color ramp
    vec3 darkSpotColor = vec3(0.45, 0.08, 0.01);
    vec3 basePlasma = mix(uMidColor, uCoreColor, smoothstep(0.32, 0.98, plasmaIntensity));
    basePlasma = mix(darkSpotColor, basePlasma, spotMask);

    // Fresnel limb darkening + hot chromosphere rim
    float ndotv = clamp(dot(normalDir, viewDir), 0.0, 1.0);
    float limbDarkening = pow(ndotv, 0.38);
    float fresnelRim = pow(1.0 - ndotv, 2.8);

    vec3 finalColor = basePlasma * (0.68 + 0.52 * limbDarkening);
    finalColor += uCoronaColor * fresnelRim * 1.45;
    finalColor += uCoreColor * pow(max(plasmaIntensity - 0.75, 0.0), 2.0) * 1.6;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const SUN_CORONA_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalDir;

  void main() {
    vLocalDir = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SUN_CORONA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCoronaInnerColor;
  uniform vec3 uCoronaOuterColor;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalDir;

  // Compact 3D value noise for dynamic solar corona streamers
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3D(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash31(i + vec3(0, 0, 0)), hash31(i + vec3(1, 0, 0)), f.x),
        mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
        mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x),
        f.y
      ),
      f.z
    );
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normalDir = normalize(vNormal);

    // BackSide shell: dot(-normalDir, viewDir) measures how close ray is to the solar center
    float viewAlignment = clamp(dot(-normalDir, viewDir), 0.0, 1.0);
    float radialGlow = pow(viewAlignment, 2.35);

    float streamer = noise3D(vLocalDir * 5.5 + vec3(uTime * 0.18, -uTime * 0.14, uTime * 0.11));
    float streamerFine = noise3D(vLocalDir * 11.0 - vec3(uTime * 0.25));
    float coronaRays = 0.78 + 0.34 * streamer + 0.18 * streamerFine;

    float alpha = clamp(radialGlow * coronaRays * 0.92, 0.0, 1.0);
    vec3 glowColor = mix(uCoronaOuterColor, uCoronaInnerColor, pow(viewAlignment, 1.6));

    gl_FragColor = vec4(glowColor * coronaRays * 1.35, alpha);
  }
`;

/**
 * Creates the custom GLSL ShaderMaterial for the Sun's animated plasma photosphere.
 * @param {object} [options]
 * @param {THREE.Texture|null} [options.surfaceMap]
 * @returns {THREE.ShaderMaterial}
 */
export function createSunSurfaceMaterial(options = {}) {
  const surfaceMap = options.surfaceMap || null;

  return new THREE.ShaderMaterial({
    name: 'SunPhotosphereShaderMaterial',
    uniforms: {
      uTime: { value: 0.0 },
      uSurfaceMap: { value: surfaceMap },
      uHasTexture: { value: surfaceMap ? 1.0 : 0.0 },
      uCoreColor: { value: new THREE.Color(0xfff7d6) },
      uMidColor: { value: new THREE.Color(0xff7b00) },
      uCoronaColor: { value: new THREE.Color(0xffae34) }
    },
    vertexShader: SUN_SURFACE_VERTEX_SHADER,
    fragmentShader: SUN_SURFACE_FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true
  });
}

/**
 * Creates an additive-blended Fresnel Corona Halo ShaderMaterial around the Sun.
 * @returns {THREE.ShaderMaterial}
 */
export function createSunCoronaMaterial() {
  return new THREE.ShaderMaterial({
    name: 'SunCoronaGlowShaderMaterial',
    uniforms: {
      uTime: { value: 0.0 },
      uCoronaInnerColor: { value: new THREE.Color(0xffe49e) },
      uCoronaOuterColor: { value: new THREE.Color(0xff4d00) }
    },
    vertexShader: SUN_CORONA_VERTEX_SHADER,
    fragmentShader: SUN_CORONA_FRAGMENT_SHADER,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
}

/**
 * Updates Sun shader uniforms in-place with zero memory allocation.
 * @param {THREE.ShaderMaterial|null} surfaceMaterial
 * @param {THREE.ShaderMaterial|null} coronaMaterial
 * @param {number} elapsedSeconds
 */
export function updateSunShaders(surfaceMaterial, coronaMaterial, elapsedSeconds) {
  if (surfaceMaterial && surfaceMaterial.uniforms) {
    surfaceMaterial.uniforms.uTime.value = elapsedSeconds;
  }
  if (coronaMaterial && coronaMaterial.uniforms) {
    coronaMaterial.uniforms.uTime.value = elapsedSeconds;
  }
}
