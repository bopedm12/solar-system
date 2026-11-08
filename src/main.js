/**
 * NASA 3D Solar System — Entry Point (60-120 FPS Target, Liquid Glass UI)
 * Orchestrates SolarScene (3D WebGL Engine with Milky Way SkySphere, First-Class Moon,
 * Seamless Hybrid Orbit + WASD Free-Fly), Real Photo Gallery, and Liquid Glass SciFiHUD.
 */
import './style.css';
import './ui/hud.css';
import { SOLAR_SYSTEM_DATA, CELESTIAL_ORDER } from './data/solarSystemData.js';
import { fetchBodyNasaTelemetry } from './data/nasaApiService.js';
import { PLANET_GALLERY_DATA, getPlanetGallery, fetchNasaGalleryEnrichment } from './data/planetGalleryData.js';
import { SolarScene } from './engine/SolarScene.js';
import { SciFiHUD } from './ui/SciFiHUD.js';

function bootstrapApp() {
  const canvas = document.getElementById('solar-canvas');
  const hudRoot = document.getElementById('hud-root');
  const bootLoader = document.getElementById('boot-loader');

  if (!canvas || !hudRoot) {
    console.error('[SolarSystem] Missing #solar-canvas or #hud-root mount elements.');
    return;
  }

  let hud = null;

  const scene = new SolarScene({
    canvas,
    solarData: SOLAR_SYSTEM_DATA,
    celestialOrder: CELESTIAL_ORDER,
    onSelectBody: async (bodyKey, bodyData, liveTelemetry) => {
      if (!hud) return;
      if (!bodyKey || !bodyData) {
        // Detached lock (e.g. Overview or WASD Free-Fly): smoothly hide Telemetry panel
        hud.hideTelemetryPanel();
        return;
      }

      hud.setSelectedBody(bodyKey, bodyData, liveTelemetry, getPlanetGallery(bodyKey));

      const [enriched, extraPhotos] = await Promise.all([
        fetchBodyNasaTelemetry(bodyKey),
        fetchNasaGalleryEnrichment(bodyKey)
      ]);
      if (hud && enriched) {
        hud.updateNasaEnrichment(bodyKey, enriched);
      }
      if (hud && Array.isArray(extraPhotos) && extraPhotos.length > 0) {
        hud.updateGalleryPhotos(bodyKey, extraPhotos);
      }
    },
    onOrbitDragActivity: (isDragging) => {
      if (hud) {
        hud.setTelemetryOrbitDragDim(isDragging);
      }
    },
    onTelemetryTick: (metrics) => {
      if (hud) {
        hud.updateRealtimeTelemetry(metrics);
      }
    },
    onContextStateChange: (stateInfo) => {
      if (hud) {
        hud.setWebGLContextBanner(stateInfo);
      }
    }
  });

  hud = new SciFiHUD({
    container: hudRoot,
    solarData: SOLAR_SYSTEM_DATA,
    celestialOrder: CELESTIAL_ORDER,
    galleryData: PLANET_GALLERY_DATA,
    onSelectBody: (bodyKey) => {
      scene.focusBody(bodyKey);
    },
    onTimeScaleChange: (timeScale, isPaused) => {
      scene.setTimeWarp(timeScale, isPaused);
    },
    onToggleOrbits: (visible) => {
      scene.setOrbitLinesVisible(visible);
    },
    onToggleScaleMode: (scaleMode) => {
      scene.setScaleMode(scaleMode);
    },
    onResetCamera: () => {
      scene.resetOverviewCamera();
    },
    onModalOverlayChange: (isOpen) => {
      scene.setKeyboardInputBlocked(isOpen);
    }
  });

  scene.start();

  // Start in Overview mode by default so Telemetry Panel is hidden until user clicks a planet or Moon
  scene.resetOverviewCamera({ immediate: true });

  // Hide boot loader once initial frame is rendered
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (bootLoader) {
        bootLoader.classList.add('hidden');
        setTimeout(() => {
          if (bootLoader && bootLoader.parentNode) {
            bootLoader.style.display = 'none';
          }
        }, 800);
      }
    });
  });

  // Safety fallback: ensure bootLoader is never stuck if RAF is delayed
  setTimeout(() => {
    if (bootLoader && !bootLoader.classList.contains('hidden')) {
      bootLoader.classList.add('hidden');
      setTimeout(() => {
        if (bootLoader && bootLoader.parentNode) {
          bootLoader.style.display = 'none';
        }
      }, 800);
    }
  }, 1800);

  window.addEventListener('beforeunload', () => {
    scene.dispose();
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp, { once: true });
} else {
  bootstrapApp();
}
