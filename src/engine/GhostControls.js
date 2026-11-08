/**
 * NASA 3D Solar System — Seamless Hybrid Orbit + Free-Fly WASD Controller (120 FPS Target)
 * Features:
 * - Works simultaneously and seamlessly with THREE.OrbitControls (never hijacks mouse or requires mode switching)
 * - Pressing W, A, S, D, Space, or C immediately detaches planet lock (`lockedPlanet = null`), stops active
 *   GSAP camera tweens, and translates both `camera.position` and `controls.target` by `_deltaMove`
 * - Holding Shift activates 10x Warp Speed Boost with smooth FOV stretch
 * - Strict Zero-Allocation in `update(deltaSeconds)` (all Vector3 instances pre-allocated at module scope)
 */
import * as THREE from 'three';

// ============================================================================
// PRE-ALLOCATED STATIC MATH REGISTERS (ZERO ALLOCATION IN RENDER LOOP)
// ============================================================================
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _moveInput = new THREE.Vector3();
const _desiredVel = new THREE.Vector3();
const _deltaMove = new THREE.Vector3();

export class GhostControls {
  /**
   * @param {object} options
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls} [options.controls]
   * @param {Function} [options.onFreeFlyInterrupt] - Invoked immediately when user presses W/A/S/D/Space/C
   */
  constructor(options = {}) {
    this.camera = options.camera;
    this.controls = options.controls || null;
    this.onFreeFlyInterrupt = options.onFreeFlyInterrupt || null;

    this.enabled = true;
    this.inputBlocked = false;

    // Flight dynamics parameters tuned for 120 FPS interplanetary navigation
    this.baseSpeed = 36.0; // Scene units per second
    this.warpBoostMultiplier = 10.0; // Shift key 10x Warp Speed Boost
    this.damping = 10.0; // Exponential velocity damping factor (1.0 - Math.exp(-10.0 * dt))

    this.baseFov = this.camera ? this.camera.fov : 45.0;
    this.warpFov = 58.0;

    // Persistent velocity vector (pre-allocated)
    this.velocity = new THREE.Vector3();
    this.currentSpeed = 0.0;

    // Key state map (zero object allocation on key press)
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      shiftWarp: false
    };

    this._bindEvents();
  }

  /**
   * Enables or disables keyboard free-flight processing.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this._resetKeys();
      this.velocity.set(0, 0, 0);
    }
  }

  /**
   * Blocks or unblocks WASD keyboard shortcuts (e.g., while Lightbox modal or text input is active).
   * @param {boolean} blocked
   */
  setInputBlocked(blocked) {
    this.inputBlocked = Boolean(blocked);
    if (this.inputBlocked) {
      this._resetKeys();
      this.velocity.set(0, 0, 0);
    }
  }

  /**
   * Returns true if any movement key (W, A, S, D, Space, C) is currently held down.
   * @returns {boolean}
   */
  isMovingInputActive() {
    return (
      this.keys.forward ||
      this.keys.backward ||
      this.keys.left ||
      this.keys.right ||
      this.keys.up ||
      this.keys.down
    );
  }

  _resetKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
    this.keys.shiftWarp = false;
  }

  _isTypingInFormElement(event) {
    if (this.inputBlocked) return true;
    const target = event.target;
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toUpperCase();
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      Boolean(target.isContentEditable)
    );
  }

  /**
   * STRICT ZERO-ALLOCATION 120 FPS UPDATE
   * Translates both `camera.position` and `controls.target` simultaneously so OrbitControls
   * mouse rotation and wheel zoom work seamlessly alongside WASD free-flight.
   *
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    if (!this.enabled || !this.camera) return;

    const hasInput = this.isMovingInputActive();
    if (hasInput && typeof this.onFreeFlyInterrupt === 'function') {
      this.onFreeFlyInterrupt();
    }

    // Compute local movement basis from current camera view direction (Zero-allocation)
    this.camera.getWorldDirection(_forward);
    _right.crossVectors(_forward, this.camera.up).normalize();

    _moveInput.set(0, 0, 0);
    if (this.keys.forward) _moveInput.add(_forward);
    if (this.keys.backward) _moveInput.sub(_forward);
    if (this.keys.right) _moveInput.add(_right);
    if (this.keys.left) _moveInput.sub(_right);
    if (this.keys.up) _moveInput.add(_up);
    if (this.keys.down) _moveInput.sub(_up);

    const hasThrust = _moveInput.lengthSq() > 1e-5;
    if (hasThrust) {
      _moveInput.normalize();
    }

    const warpFactor = this.keys.shiftWarp ? this.warpBoostMultiplier : 1.0;
    const maxSpeed = this.baseSpeed * warpFactor;

    _desiredVel.copy(_moveInput).multiplyScalar(maxSpeed);

    // Frame-rate-independent exponential velocity damping for smooth inertia at 120 FPS
    const smoothing = 1.0 - Math.exp(-10.0 * deltaSeconds);
    this.velocity.lerp(_desiredVel, smoothing);

    if (this.velocity.lengthSq() > 1e-6) {
      _deltaMove.copy(this.velocity).multiplyScalar(deltaSeconds);
      this.camera.position.add(_deltaMove);
      if (this.controls && this.controls.target) {
        this.controls.target.add(_deltaMove);
      }
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.currentSpeed = this.velocity.length();

    // Smooth FOV Warp Stretch when holding Shift + moving
    const targetFov = this.keys.shiftWarp && hasThrust ? this.warpFov : this.baseFov;
    const fovDiff = targetFov - this.camera.fov;
    if (Math.abs(fovDiff) > 0.04) {
      this.camera.fov += fovDiff * (1.0 - Math.exp(-9.0 * deltaSeconds));
      this.camera.updateProjectionMatrix();
    }
  }

  _bindEvents() {
    this._onKeyDown = (event) => {
      if (!this.enabled || this._isTypingInFormElement(event)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const code = event.code;
      let movementTriggered = false;

      switch (code) {
        case 'KeyW':
          this.keys.forward = true;
          movementTriggered = true;
          break;
        case 'KeyS':
          this.keys.backward = true;
          movementTriggered = true;
          break;
        case 'KeyA':
          this.keys.left = true;
          movementTriggered = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          movementTriggered = true;
          break;
        case 'Space':
          event.preventDefault();
          this.keys.up = true;
          movementTriggered = true;
          break;
        case 'KeyC':
          this.keys.down = true;
          movementTriggered = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shiftWarp = true;
          break;
        default:
          break;
      }

      if (movementTriggered && typeof this.onFreeFlyInterrupt === 'function') {
        this.onFreeFlyInterrupt();
      }
    };

    this._onKeyUp = (event) => {
      const code = event.code;
      switch (code) {
        case 'KeyW':
          this.keys.forward = false;
          break;
        case 'KeyS':
          this.keys.backward = false;
          break;
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.up = false;
          break;
        case 'KeyC':
          this.keys.down = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shiftWarp = false;
          break;
        default:
          break;
      }
    };

    this._onWindowBlur = () => {
      this._resetKeys();
      this.velocity.set(0, 0, 0);
    };

    window.addEventListener('keydown', this._onKeyDown, false);
    window.addEventListener('keyup', this._onKeyUp, false);
    window.addEventListener('blur', this._onWindowBlur, { passive: true });
  }

  /**
   * Removes all event listeners cleanly.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown, false);
    window.removeEventListener('keyup', this._onKeyUp, false);
    window.removeEventListener('blur', this._onWindowBlur);
  }
}

export default GhostControls;
