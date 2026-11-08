/**
 * NASA 3D Solar System — 3D Keplerian Orbital Mechanics Engine (120 FPS Zero-Allocation)
 * Solves Kepler's Equation M = E - e*sin(E) via Newton-Raphson iteration and maps
 * heliocentric & geocentric (Moon) elements (a, e, i, Ω, ω, M0) to Three.js Y-up 3D coordinates.
 */
import * as THREE from 'three';
import { SCALE_CONSTANTS, SOLAR_SYSTEM_DATA } from '../data/solarSystemData.js';

const DEG_TO_RAD = Math.PI / 180.0;
const TWO_PI = Math.PI * 2.0;

// Pre-allocated scratch vector for standalone Moon geocentric offset — ZERO heap allocation in render loop
const _scratchMoonOffset = new THREE.Vector3();

/**
 * Solves Kepler's Equation M = E - e * sin(E) for Eccentric Anomaly E using Newton-Raphson.
 * Pure numeric function — Zero heap allocation.
 *
 * @param {number} meanAnomalyRad Mean anomaly M in radians
 * @param {number} eccentricity Orbital eccentricity e (0 <= e < 1)
 * @returns {number} Eccentric anomaly E in radians
 */
export function solveKeplerEquation(meanAnomalyRad, eccentricity) {
  let M = meanAnomalyRad % TWO_PI;
  if (M > Math.PI) M -= TWO_PI;
  if (M < -Math.PI) M += TWO_PI;

  if (eccentricity < 1e-6) {
    return M;
  }

  let E = M + eccentricity * Math.sin(M);
  for (let iter = 0; iter < 6; iter++) {
    const f = E - eccentricity * Math.sin(E) - M;
    const fPrime = 1.0 - eccentricity * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-7) {
      break;
    }
  }
  return E;
}

/**
 * Returns the scaled semi-major axis in scene units for the active scale mode.
 * Pure numeric function — Zero heap allocation.
 *
 * @param {object} bodyData
 * @param {'cinematic'|'true'} scaleMode
 * @returns {number}
 */
export function getScaledSemiMajorAxis(bodyData, scaleMode = 'cinematic') {
  if (!bodyData || bodyData.id === 'sun') return 0.0;
  if (bodyData.id === 'moon' || bodyData.parentBodyKey === 'earth') {
    return scaleMode === 'true'
      ? bodyData.trueOrbitRadius ?? bodyData.trueScaleOrbitRadius ?? 3.2
      : bodyData.cinematicOrbitRadius ?? bodyData.cinematicDistance ?? 4.8;
  }
  if (scaleMode === 'true') {
    if (typeof bodyData.trueScaleDistance === 'number' && bodyData.trueScaleDistance > 0) {
      return bodyData.trueScaleDistance;
    }
    return (bodyData.semiMajorAxisAU || 0) * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS;
  }
  return bodyData.cinematicDistance ?? (bodyData.semiMajorAxisAU || 0) * SCALE_CONSTANTS.CINEMATIC_AU_BASE;
}

/**
 * Returns the scaled 3D radius in scene units for the active scale mode.
 * Pure numeric function — Zero heap allocation.
 *
 * @param {object} bodyData
 * @param {'cinematic'|'true'} scaleMode
 * @returns {number}
 */
export function getScaledBodyRadius(bodyData, scaleMode = 'cinematic') {
  if (!bodyData) return 1.0;
  if (scaleMode === 'true') {
    return bodyData.trueScaleRadius ?? Math.max(0.22, (bodyData.radiusKm || 1000) * SCALE_CONSTANTS.TRUE_SCALE_RADIUS_MULTIPLIER);
  }
  return bodyData.cinematicRadius ?? 1.0;
}

/**
 * ZERO-ALLOCATION 3D Keplerian Position & Telemetry solver called every frame in requestAnimationFrame.
 * Writes heliocentric 3D coordinates directly into `outVector3` (NO `new THREE.Vector3()`).
 * If `bodyData.id === 'moon'`, computes Earth's heliocentric position + the Moon's geocentric Keplerian offset.
 *
 * @param {object} bodyData Planet or Moon data from SOLAR_SYSTEM_DATA
 * @param {number} simDays Elapsed simulation days from J2000 epoch
 * @param {'cinematic'|'true'} scaleMode Active scale mode
 * @param {THREE.Vector3} outVector3 Pre-allocated target Vector3
 * @param {object} [outTelemetry] Optional pre-allocated telemetry object to mutate in-place
 * @returns {THREE.Vector3} `outVector3`
 */
export function computeOrbitalPosition(bodyData, simDays, scaleMode, outVector3, outTelemetry) {
  if (!bodyData || bodyData.id === 'sun' || !bodyData.orbitalPeriodDays) {
    outVector3.set(0, 0, 0);
    if (outTelemetry) {
      outTelemetry.heliocentricDistanceAU = 0;
      outTelemetry.instantVelocityKms = bodyData?.orbitalVelocityKms || 0;
      outTelemetry.trueAnomalyDeg = 0;
    }
    return outVector3;
  }

  // First-class Standalone Moon: Position = Earth Heliocentric Position + Moon Geocentric Elliptical Offset
  if (bodyData.id === 'moon' || bodyData.parentBodyKey === 'earth') {
    const earthData = SOLAR_SYSTEM_DATA.earth;
    computeOrbitalPosition(earthData, simDays, scaleMode, outVector3, undefined);
    const earthRadiusScaled = getScaledBodyRadius(earthData, scaleMode);
    computeMoonPosition(bodyData, earthRadiusScaled, simDays, _scratchMoonOffset, scaleMode);
    outVector3.add(_scratchMoonOffset);

    if (outTelemetry) {
      const e = bodyData.eccentricity || 0.0549;
      const M0Rad = (bodyData.meanAnomalyAtEpochDeg || 0.0) * DEG_TO_RAD;
      const meanMotion = TWO_PI / bodyData.orbitalPeriodDays;
      const E = solveKeplerEquation(M0Rad + meanMotion * simDays, e);
      const rFactor = 1.0 - e * Math.cos(E);
      const visVivaFactor = Math.sqrt(Math.max(0.1, 2.0 / Math.max(0.05, rFactor) - 1.0));

      outTelemetry.heliocentricDistanceAU = 1.0 + 0.00257 * rFactor;
      outTelemetry.distanceToEarthKm = (bodyData.distanceToEarthKm || 384400) * rFactor;
      outTelemetry.instantVelocityKms = (bodyData.orbitalVelocityKms || 1.022) * visVivaFactor;
      const sqrtOneMinusESq = Math.sqrt(Math.max(0.0, 1.0 - e * e));
      const nu = Math.atan2(sqrtOneMinusESq * Math.sin(E), Math.cos(E) - e);
      outTelemetry.trueAnomalyDeg = ((nu / DEG_TO_RAD) + 360.0) % 360.0;
    }
    return outVector3;
  }

  const a = getScaledSemiMajorAxis(bodyData, scaleMode);
  const e = bodyData.eccentricity || 0.0;
  const iRad = (bodyData.inclinationDeg || 0.0) * DEG_TO_RAD;
  const omegaNodeRad = (bodyData.longitudeOfAscendingNodeDeg || 0.0) * DEG_TO_RAD;
  const argPeriRad = (bodyData.argumentOfPeriapsisDeg || 0.0) * DEG_TO_RAD;
  const M0Rad = (bodyData.meanAnomalyAtEpochDeg || 0.0) * DEG_TO_RAD;

  const meanMotion = TWO_PI / bodyData.orbitalPeriodDays;
  const M = M0Rad + meanMotion * simDays;
  const E = solveKeplerEquation(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusESq = Math.sqrt(Math.max(0.0, 1.0 - e * e));

  const xOrb = a * (cosE - e);
  const yOrb = a * sqrtOneMinusESq * sinE;

  const cosNode = Math.cos(omegaNodeRad);
  const sinNode = Math.sin(omegaNodeRad);
  const cosPeri = Math.cos(argPeriRad);
  const sinPeri = Math.sin(argPeriRad);
  const cosInc = Math.cos(iRad);
  const sinInc = Math.sin(iRad);

  const xEcl =
    (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrb +
    (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrb;

  const yEcl =
    (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrb +
    (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrb;

  const zEcl = (sinPeri * sinInc) * xOrb + (cosPeri * sinInc) * yOrb;

  outVector3.set(xEcl, zEcl, -yEcl);

  if (outTelemetry) {
    const rFactor = 1.0 - e * cosE;
    const baseAU = bodyData.semiMajorAxisAU || 1.0;
    outTelemetry.heliocentricDistanceAU = baseAU * rFactor;
    const visVivaFactor = Math.sqrt(Math.max(0.1, 2.0 / Math.max(0.05, rFactor) - 1.0));
    outTelemetry.instantVelocityKms = (bodyData.orbitalVelocityKms || 0) * visVivaFactor;
    const nu = Math.atan2(sqrtOneMinusESq * sinE, cosE - e);
    outTelemetry.trueAnomalyDeg = ((nu / DEG_TO_RAD) + 360.0) % 360.0;
  }

  return outVector3;
}

/**
 * ZERO-ALLOCATION Moon local orbital position solver around its parent planet.
 * Writes parent-relative 3D offset directly into `outVector3`.
 *
 * @param {object} moonData Moon entry from MOONS_DATA / SOLAR_SYSTEM_DATA.moon
 * @param {number} parentRadiusScaled Current scaled radius of the parent planet
 * @param {number} simDays Elapsed simulation days
 * @param {THREE.Vector3} outVector3 Pre-allocated target Vector3
 * @param {'cinematic'|'true'} [scaleMode='cinematic']
 * @returns {THREE.Vector3} `outVector3`
 */
export function computeMoonPosition(moonData, parentRadiusScaled, simDays, outVector3, scaleMode = 'cinematic') {
  if (!moonData || !moonData.orbitalPeriodDays) {
    outVector3.set(0, 0, 0);
    return outVector3;
  }

  const baseOrbit =
    scaleMode === 'true'
      ? moonData.trueOrbitRadius || moonData.trueScaleOrbitRadius || moonData.cinematicOrbitRadius || 3.2
      : moonData.cinematicOrbitRadius || moonData.cinematicDistance || 4.8;

  const orbitRadius = Math.max(baseOrbit, parentRadiusScaled * 2.1);
  const e = moonData.eccentricity || 0.0;
  const incRad = (moonData.inclinationDeg || 0.0) * DEG_TO_RAD;
  const nodeRad = (moonData.longitudeOfAscendingNodeDeg || 0.0) * DEG_TO_RAD;
  const periRad = (moonData.argumentOfPeriapsisDeg || 0.0) * DEG_TO_RAD;
  const M0Rad = (moonData.meanAnomalyAtEpochDeg || 0.0) * DEG_TO_RAD;

  const meanMotion = TWO_PI / moonData.orbitalPeriodDays;
  const E = solveKeplerEquation(M0Rad + meanMotion * simDays, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusESq = Math.sqrt(Math.max(0.0, 1.0 - e * e));

  const xOrb = orbitRadius * (cosE - e);
  const yOrb = orbitRadius * sqrtOneMinusESq * sinE;

  const cosNode = Math.cos(nodeRad);
  const sinNode = Math.sin(nodeRad);
  const cosPeri = Math.cos(periRad);
  const sinPeri = Math.sin(periRad);
  const cosInc = Math.cos(incRad);
  const sinInc = Math.sin(incRad);

  const xEcl =
    (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrb +
    (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrb;
  const yEcl =
    (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrb +
    (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrb;
  const zEcl = (sinPeri * sinInc) * xOrb + (cosPeri * sinInc) * yOrb;

  outVector3.set(xEcl, zEcl, -yEcl);
  return outVector3;
}

/**
 * Computes the axial rotation angle (in radians) of a celestial body at `simDays`.
 * Respects retrograde rotation when `rotationPeriodHours < 0` (e.g., Venus, Uranus).
 * Pure numeric function — Zero heap allocation.
 *
 * @param {object} bodyData
 * @param {number} simDays
 * @returns {number} Rotation angle around local polar axis in radians
 */
export function computeAxialRotationAngle(bodyData, simDays) {
  if (!bodyData || !bodyData.rotationPeriodHours) return 0.0;
  const rotationDays = bodyData.rotationPeriodHours / 24.0;
  return (simDays / rotationDays) * TWO_PI;
}

/**
 * Generates an array of 3D points sampling the complete elliptical Kepler orbit.
 * For `bodyData.id === 'moon'`, generates the local elliptical orbit ring around Earth.
 * Called ONLY during scene initialization or when toggling between Cinematic and True Scale.
 *
 * @param {object} bodyData Planet or Moon data object
 * @param {'cinematic'|'true'} [scaleMode='cinematic']
 * @param {number} [segments=192] Number of elliptical segments
 * @returns {THREE.Vector3[]} Array of `segments + 1` closed loop points
 */
export function generateOrbitPathPoints(bodyData, scaleMode = 'cinematic', segments = 192) {
  const points = [];
  if (!bodyData || bodyData.id === 'sun' || !bodyData.orbitalPeriodDays) {
    return points;
  }

  let a = getScaledSemiMajorAxis(bodyData, scaleMode);
  if (bodyData.id === 'moon' || bodyData.parentBodyKey === 'earth') {
    const earthRadiusScaled = getScaledBodyRadius(SOLAR_SYSTEM_DATA.earth, scaleMode);
    a = Math.max(a, earthRadiusScaled * 2.1);
  }

  const e = bodyData.eccentricity || 0.0;
  const iRad = (bodyData.inclinationDeg || 0.0) * DEG_TO_RAD;
  const omegaNodeRad = (bodyData.longitudeOfAscendingNodeDeg || 0.0) * DEG_TO_RAD;
  const argPeriRad = (bodyData.argumentOfPeriapsisDeg || 0.0) * DEG_TO_RAD;

  const sqrtOneMinusESq = Math.sqrt(Math.max(0.0, 1.0 - e * e));
  const cosNode = Math.cos(omegaNodeRad);
  const sinNode = Math.sin(omegaNodeRad);
  const cosPeri = Math.cos(argPeriRad);
  const sinPeri = Math.sin(argPeriRad);
  const cosInc = Math.cos(iRad);
  const sinInc = Math.sin(iRad);

  for (let s = 0; s <= segments; s++) {
    const E = (s / segments) * TWO_PI;
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);

    const xOrb = a * (cosE - e);
    const yOrb = a * sqrtOneMinusESq * sinE;

    const xEcl =
      (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrb +
      (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrb;
    const yEcl =
      (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrb +
      (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrb;
    const zEcl = (sinPeri * sinInc) * xOrb + (cosPeri * sinInc) * yOrb;

    points.push(new THREE.Vector3(xEcl, zEcl, -yEcl));
  }

  return points;
}
