/**
 * NASA EYES // Apple VisionOS Liquid Glass — 4K Sci-Fi HUD Controller (Giai đoạn 8)
 * Features:
 * - Minimalist Top Bar with strictly 3 `.liquid-glass-pill` controls: [OVERVIEW], [SCALE], [ORBITS]
 * - Context-Aware Telemetry Panel (`.liquid-glass`):
 *   * Hidden by default on load, in OVERVIEW, or during WASD free-flight (`.telemetry-hidden`)
 *   * Smoothly slides in when clicking a Planet or the Standalone Moon (`setSelectedBody`)
 *   * Dims to `opacity: 0.25` while dragging mouse to rotate around a locked body (`setTelemetryOrbitDragDim`)
 * - 100% Authentic Space Photography in Gallery & Lightbox (zero Canvas/SVG procedural drawings;
 *   direct `<img src="..." alt="..." loading="lazy" />` without `crossOrigin` preflight blocking)
 * - Security: 100% XSS-safe DOM updates via `document.createElement` & `node.textContent`
 */
import { SCALE_CONSTANTS } from '../data/solarSystemData.js';
import {
  PLANET_GALLERY_DATA,
  getPlanetGallery
} from '../data/planetGalleryData.js';

const TIME_WARP_PRESETS = [
  { label: '-1,000x', value: -1000 },
  { label: '-100x', value: -100 },
  { label: '1x LIVE', value: 1 },
  { label: '100x', value: 100 },
  { label: '1,000x', value: 1000 },
  { label: '10,000x', value: 10000 },
  { label: '100,000x', value: 100000 }
];

/**
 * Escapes HTML special characters as an extra defense-in-depth layer against XSS.
 * @param {unknown} raw
 * @returns {string}
 */
export function escapeHtml(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates external URLs so only safe http/https links are assigned to href or src.
 * @param {string} url
 * @returns {string}
 */
function sanitizeExternalUrl(url) {
  if (typeof url !== 'string') return 'https://science.nasa.gov/';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return 'https://science.nasa.gov/';
}

/**
 * Helper to create a DOM element with className and safe textContent.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }
  return node;
}

export class SciFiHUD {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container
   * @param {object} options.solarData
   * @param {string[]} options.celestialOrder
   * @param {object} [options.galleryData]
   * @param {Function} [options.onSelectBody]
   * @param {Function} [options.onTimeScaleChange]
   * @param {Function} [options.onToggleOrbits]
   * @param {Function} [options.onToggleScaleMode]
   * @param {Function} [options.onResetCamera]
   * @param {Function} [options.onModalOverlayChange]
   */
  constructor(options = {}) {
    this.container = options.container;
    this.solarData = options.solarData || {};
    this.celestialOrder = options.celestialOrder || [];
    this.galleryData = options.galleryData || PLANET_GALLERY_DATA;

    this.onSelectBody = options.onSelectBody || null;
    this.onTimeScaleChange = options.onTimeScaleChange || null;
    this.onToggleOrbits = options.onToggleOrbits || null;
    this.onToggleScaleMode = options.onToggleScaleMode || null;
    this.onResetCamera = options.onResetCamera || null;
    this.onModalOverlayChange = options.onModalOverlayChange || null;

    this.selectedBodyKey = null;
    this.timeScale = 1;
    this.isPaused = false;
    this.orbitsVisible = true;
    this.scaleMode = 'cinematic';

    // Lightbox state
    this.currentGalleryItems = [];
    this.currentLightboxIndex = 0;

    this.dockButtons = new Map();
    this.warpButtons = new Map();
    this.refs = {};

    this._mount();
    // Telemetry panel is hidden by default until user clicks a planet or Moon
    this.hideTelemetryPanel();
  }

  _mount() {
    if (!this.container) return;
    this.container.textContent = '';

    const root = el('div', 'hud-layer');

    // 1. Top Bar (Brand + 3 Liquid Glass Pill Controls + 120 FPS Profiler)
    const topBar = this._buildTopBar();
    root.appendChild(topBar);

    // 2. WebGL Context Status Banner (hidden by default)
    const contextBanner = el('div', 'hud-context-banner hidden');
    contextBanner.setAttribute('role', 'alert');
    this.refs.contextBanner = contextBanner;
    root.appendChild(contextBanner);

    // 3. Right Panel: Context-Aware Liquid Glass Scientific Telemetry & Real Photo Gallery
    const telemetryAside = this._buildTelemetryPanel();
    root.appendChild(telemetryAside);

    // 4. Bottom Stack: Liquid Glass Time Warp Bar + Celestial Planet & Moon Dock
    const bottomStack = this._buildBottomControls();
    root.appendChild(bottomStack);

    // 5. High-Resolution Real Photo Lightbox Modal
    const lightbox = this._buildLightboxModal();
    root.appendChild(lightbox);

    this.container.appendChild(root);

    // Close Lightbox on Escape key or navigate with Left/Right arrows
    this._onKeyDown = (event) => {
      if (!this.refs.lightboxBackdrop || this.refs.lightboxBackdrop.classList.contains('hidden')) {
        return;
      }
      if (event.code === 'Escape') {
        this._closeLightbox();
      } else if (event.code === 'ArrowRight') {
        this._stepLightbox(1);
      } else if (event.code === 'ArrowLeft') {
        this._stepLightbox(-1);
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  _buildTopBar() {
    const topBar = el('header', 'hud-top-bar');

    const brandCluster = el('div', 'hud-brand-cluster liquid-glass');
    const badge = el('div', 'hud-nasa-badge');
    badge.appendChild(el('span', 'hud-live-dot'));

    const titleWrap = el('div');
    titleWrap.appendChild(el('div', 'hud-brand-title', 'SOLAR SYSTEM'));
    titleWrap.appendChild(el('div', 'hud-brand-sub', 'Website designed and created by qipi'));
    badge.appendChild(titleWrap);
    brandCluster.appendChild(badge);

    // Strictly 3 Liquid Glass Pill buttons: [OVERVIEW], [SCALE: CINEMATIC / TRUE], [ORBITS: ON / OFF]
    const actions = el('div', 'hud-top-actions');

    // 1. [OVERVIEW]
    const overviewBtn = el('button', 'hud-btn liquid-glass-pill active', 'OVERVIEW');
    overviewBtn.type = 'button';
    overviewBtn.title = 'Đưa góc nhìn về toàn cảnh Hệ Mặt Trời & ẩn bảng Telemetry';
    overviewBtn.addEventListener('click', () => {
      if (typeof this.onResetCamera === 'function') {
        this.onResetCamera();
      }
    });
    this.refs.overviewBtn = overviewBtn;
    actions.appendChild(overviewBtn);

    // 2. [SCALE: CINEMATIC / TRUE]
    const scaleBtn = el('button', 'hud-btn liquid-glass-pill', 'SCALE: CINEMATIC');
    scaleBtn.type = 'button';
    scaleBtn.addEventListener('click', () => {
      this.scaleMode = this.scaleMode === 'cinematic' ? 'true' : 'cinematic';
      scaleBtn.textContent = this.scaleMode === 'true' ? 'SCALE: TRUE' : 'SCALE: CINEMATIC';
      scaleBtn.classList.toggle('active', this.scaleMode === 'true');
      if (typeof this.onToggleScaleMode === 'function') {
        this.onToggleScaleMode(this.scaleMode);
      }
    });
    this.refs.scaleBtn = scaleBtn;
    actions.appendChild(scaleBtn);

    // 3. [ORBITS: ON / OFF]
    const orbitsBtn = el('button', 'hud-btn liquid-glass-pill active', 'ORBITS: ON');
    orbitsBtn.type = 'button';
    orbitsBtn.addEventListener('click', () => {
      this.orbitsVisible = !this.orbitsVisible;
      orbitsBtn.textContent = this.orbitsVisible ? 'ORBITS: ON' : 'ORBITS: OFF';
      orbitsBtn.classList.toggle('active', this.orbitsVisible);
      if (typeof this.onToggleOrbits === 'function') {
        this.onToggleOrbits(this.orbitsVisible);
      }
    });
    this.refs.orbitsBtn = orbitsBtn;
    actions.appendChild(orbitsBtn);

    brandCluster.appendChild(actions);
    topBar.appendChild(brandCluster);

    // Right cluster: Compact FPS Liquid Glass Pill Badge
    const fpsBadge = el('div', 'hud-fps-pill liquid-glass-pill');
    fpsBadge.appendChild(el('span', 'hud-fps-label', 'FPS'));
    const fpsValNode = el('span', 'hud-fps-value', '60');
    fpsBadge.appendChild(fpsValNode);
    this.refs.fpsVal = fpsValNode;

    topBar.appendChild(fpsBadge);
    return topBar;
  }

  _buildTelemetryPanel() {
    const aside = el('aside', 'hud-telemetry-aside liquid-glass telemetry-hidden');
    aside.setAttribute('aria-label', 'Bảng thông số khoa học NASA & Thư viện Ảnh Chụp Thật');
    this.refs.telemetryAside = aside;

    const header = el('div', 'hud-telemetry-header');
    const leftHead = el('div');

    const titleGroup = el('div', 'hud-body-title-group');
    const swatch = el('span', 'hud-body-swatch');
    this.refs.bodySwatch = swatch;
    titleGroup.appendChild(swatch);

    const namesWrap = el('div');
    this.refs.bodyNameVi = el('h2', 'hud-body-name-vi', 'Trái Đất');
    this.refs.bodyNameEn = el('div', 'hud-body-name-en', 'EARTH (TERRA)');
    namesWrap.appendChild(this.refs.bodyNameVi);
    namesWrap.appendChild(this.refs.bodyNameEn);
    titleGroup.appendChild(namesWrap);

    leftHead.appendChild(titleGroup);
    this.refs.bodyClassBadge = el('span', 'hud-body-class', 'Terrestrial Ocean World');
    leftHead.appendChild(this.refs.bodyClassBadge);
    header.appendChild(leftHead);
    aside.appendChild(header);

    const body = el('div', 'hud-telemetry-body');

    // 1. Primary Real-Time Ephemeris Grid
    const statGrid = el('div', 'hud-stat-grid');
    const createStatCard = (label, initialVal, highlight = false) => {
      const card = el('div', 'hud-stat-card');
      const labelNode = el('div', 'hud-stat-label', label);
      card.appendChild(labelNode);
      const val = el('div', highlight ? 'hud-stat-val highlight' : 'hud-stat-val', initialVal);
      card.appendChild(val);
      statGrid.appendChild(card);
      return { val, labelNode };
    };

    const distStat = createStatCard('KHOẢNG CÁCH MẶT TRỜI', '1.000 AU', true);
    this.refs.statDistanceLabel = distStat.labelNode;
    this.refs.statDistanceAU = distStat.val;

    this.refs.statVelocity = createStatCard('VẬN TỐC QUỸ ĐẠO', '29.78 km/s', true).val;
    this.refs.statRadius = createStatCard('BÁN KÍNH TRUNG BÌNH', '6,371 km').val;
    this.refs.statAxialTilt = createStatCard('ĐỘ NGHIÊNG TRỤC QUAY', '23.44°').val;
    this.refs.statRotation = createStatCard('CHU KỲ TỰ QUAY', '23.93 giờ').val;
    this.refs.statOrbitalPeriod = createStatCard('CHU KỲ QUỸ ĐẠO', '365.26 ngày').val;
    this.refs.statTemperature = createStatCard('NHIỆT ĐỘ BỀ MẶT', '15 °C').val;
    this.refs.statGravity = createStatCard('TRỌNG LỰC BỀ MẶT', '9.81 m/s²').val;

    body.appendChild(statGrid);

    // 2. Planet & Natural Wonders Authentic Photo Gallery
    const gallerySection = el('div', 'hud-section-box');
    this.refs.gallerySectionTitle = el(
      'div',
      'hud-section-title',
      '📸 ẢNH CHỤP THỰC TẾ (NGUỒN: NASA / ISS / WIKIMEDIA)'
    );
    gallerySection.appendChild(this.refs.gallerySectionTitle);
    this.refs.galleryGrid = el('div', 'hud-gallery-grid');
    gallerySection.appendChild(this.refs.galleryGrid);
    body.appendChild(gallerySection);

    // 3. Scientific Overview Description
    const descSection = el('div', 'hud-section-box');
    descSection.appendChild(el('div', 'hud-section-title', 'TỔNG QUAN KHOA HỌC NASA'));
    this.refs.bodyDesc = el('p', 'hud-desc-text', '');
    descSection.appendChild(this.refs.bodyDesc);
    body.appendChild(descSection);

    // 4. Atmospheric Composition Section
    const atmoSection = el('div', 'hud-section-box');
    atmoSection.appendChild(el('div', 'hud-section-title', 'THÀNH PHẦN KHÍ QUYỂN'));
    this.refs.atmoList = el('div', 'hud-tag-list');
    atmoSection.appendChild(this.refs.atmoList);
    body.appendChild(atmoSection);

    // 5. Moons & Missions Section
    const moonsSection = el('div', 'hud-section-box');
    moonsSection.appendChild(el('div', 'hud-section-title', 'VỆ TINH TỰ NHIÊN & SỨ MỆNH NASA'));
    this.refs.moonsList = el('div', 'hud-tag-list');
    moonsSection.appendChild(this.refs.moonsList);
    body.appendChild(moonsSection);

    // 6. Key NASA Facts Section
    const factsSection = el('div', 'hud-section-box');
    factsSection.appendChild(el('div', 'hud-section-title', 'DỮ LIỆU KHÁM PHÁ NSSDCA'));
    this.refs.factsList = el('ul', 'hud-facts-list');
    factsSection.appendChild(this.refs.factsList);
    body.appendChild(factsSection);

    // 7. NASA Live Archive Enrichment Section
    const apiSection = el('div', 'hud-section-box');
    apiSection.appendChild(el('div', 'hud-section-title', 'NASA ARCHIVE TELEMETRY LINK'));
    this.refs.apiStatus = el('div', 'hud-api-status', 'SYNCING NSSDCA EPHEMERIS...');
    this.refs.apiSnippet = el('p', 'hud-desc-text', 'Đang đồng bộ dữ liệu lưu trữ NASA...');
    apiSection.appendChild(this.refs.apiStatus);
    apiSection.appendChild(this.refs.apiSnippet);
    body.appendChild(apiSection);

    aside.appendChild(body);
    return aside;
  }

  _buildLightboxModal() {
    const backdrop = el('div', 'hud-lightbox-backdrop hidden');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    this.refs.lightboxBackdrop = backdrop;

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        this._closeLightbox();
      }
    });

    const modal = el('div', 'hud-lightbox-modal liquid-glass');

    const imgWrap = el('div', 'hud-lightbox-img-wrap');
    const img = document.createElement('img');
    img.className = 'hud-lightbox-img';
    img.loading = 'lazy';
    img.alt = 'Ảnh chụp thực tế từ NASA / Wikimedia Commons';
    this.refs.lightboxImg = img;
    imgWrap.appendChild(img);
    modal.appendChild(imgWrap);

    const content = el('div', 'hud-lightbox-content');
    this.refs.lightboxTitle = el('h3', 'hud-lightbox-title', '');
    content.appendChild(this.refs.lightboxTitle);

    const metaRow = el('div', 'hud-lightbox-meta-row');
    this.refs.lightboxMission = el('span', '', '');
    this.refs.lightboxDate = el('span', '', '');
    metaRow.appendChild(this.refs.lightboxMission);
    metaRow.appendChild(el('span', '', '•'));
    metaRow.appendChild(this.refs.lightboxDate);
    content.appendChild(metaRow);

    this.refs.lightboxCaption = el('p', 'hud-lightbox-caption', '');
    content.appendChild(this.refs.lightboxCaption);

    const sourceBox = el('div', 'hud-lightbox-source-box');
    this.refs.lightboxCredit = el('span', 'hud-lightbox-credit-text', '');
    sourceBox.appendChild(this.refs.lightboxCredit);

    const sourceLink = el('a', 'hud-lightbox-source-link', 'Xem Hồ Sơ Gốc NASA / Wikimedia ↗');
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    this.refs.lightboxSourceLink = sourceLink;
    sourceBox.appendChild(sourceLink);
    content.appendChild(sourceBox);

    const footer = el('div', 'hud-lightbox-footer');
    const navLeft = el('div', 'hud-warp-buttons');

    const prevBtn = el('button', 'hud-btn liquid-glass-pill', '◀ ẢNH TRƯỚC');
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', () => this._stepLightbox(-1));

    const nextBtn = el('button', 'hud-btn liquid-glass-pill', 'ẢNH TIẾP ▶');
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => this._stepLightbox(1));

    navLeft.appendChild(prevBtn);
    navLeft.appendChild(nextBtn);
    footer.appendChild(navLeft);

    const closeBtn = el('button', 'hud-btn liquid-glass-pill active', 'ĐÓNG (ESC)');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => this._closeLightbox());
    footer.appendChild(closeBtn);

    content.appendChild(footer);
    modal.appendChild(content);
    backdrop.appendChild(modal);

    return backdrop;
  }

  _openLightbox(index) {
    if (!Array.isArray(this.currentGalleryItems) || this.currentGalleryItems.length === 0) return;
    const len = this.currentGalleryItems.length;
    this.currentLightboxIndex = ((index % len) + len) % len;
    const item = this.currentGalleryItems[this.currentLightboxIndex];

    if (this.refs.lightboxImg) {
      const img = this.refs.lightboxImg;
      const primaryUrl = sanitizeExternalUrl(item.imageUrl);
      const backupUrl = item.backupImageUrl ? sanitizeExternalUrl(item.backupImageUrl) : null;
      img.onerror = () => {
        img.onerror = null;
        if (backupUrl && img.src !== backupUrl) {
          img.src = backupUrl;
        }
      };
      img.src = primaryUrl;
      img.alt = item.title || 'NASA Authentic Space Photograph';
    }

    if (this.refs.lightboxTitle) {
      this.refs.lightboxTitle.textContent = item.title || '';
    }
    if (this.refs.lightboxMission) {
      this.refs.lightboxMission.textContent = `📍 ${item.locationOrMission || 'NASA Mission'}`;
    }
    if (this.refs.lightboxDate) {
      this.refs.lightboxDate.textContent = `📅 Ngày chụp: ${item.dateTaken || 'NASA Archive'}`;
    }
    if (this.refs.lightboxCaption) {
      this.refs.lightboxCaption.textContent = item.caption || '';
    }
    if (this.refs.lightboxCredit) {
      this.refs.lightboxCredit.textContent = `🏛️ ${item.creditSource || 'Nguồn: NASA / Wikimedia Commons'}`;
    }
    if (this.refs.lightboxSourceLink) {
      this.refs.lightboxSourceLink.href = sanitizeExternalUrl(item.sourceUrl || item.imageUrl);
    }

    if (this.refs.lightboxBackdrop) {
      this.refs.lightboxBackdrop.classList.remove('hidden');
    }
    if (typeof this.onModalOverlayChange === 'function') {
      this.onModalOverlayChange(true);
    }
  }

  _stepLightbox(delta) {
    if (!this.currentGalleryItems.length) return;
    this._openLightbox(this.currentLightboxIndex + delta);
  }

  _closeLightbox() {
    if (this.refs.lightboxBackdrop) {
      this.refs.lightboxBackdrop.classList.add('hidden');
    }
    if (typeof this.onModalOverlayChange === 'function') {
      this.onModalOverlayChange(false);
    }
  }

  /**
   * Renders 100% real photographs in the Gallery Grid using direct `<img src="..." alt="..." loading="lazy" />`.
   * Zero synthetic SVG/Canvas fallback generators are used.
   *
   * @param {string} bodyKey
   * @param {Array<object>} [galleryItems]
   */
  _renderGalleryCards(bodyKey, galleryItems) {
    if (!this.refs.galleryGrid) return;
    this.refs.galleryGrid.textContent = '';

    const items = Array.isArray(galleryItems) && galleryItems.length > 0
      ? galleryItems
      : getPlanetGallery(bodyKey);

    this.currentGalleryItems = items;

    if (this.refs.gallerySectionTitle) {
      if (bodyKey === 'earth') {
        this.refs.gallerySectionTitle.textContent = '📸 KỲ QUAN TRÁI ĐẤT & GÓC NHÌN ISS (ẢNH THẬT 100%)';
      } else if (bodyKey === 'moon') {
        this.refs.gallerySectionTitle.textContent = '📸 ẢNH CHỤP MẶT TRĂNG APOLLO & LRO (ẢNH THẬT 100%)';
      } else {
        this.refs.gallerySectionTitle.textContent = '📸 THƯ VIỆN ẢNH THỰC TẾ TÀU VŨ TRỤ NASA (CÓ NGUỒN)';
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const card = el('button', 'hud-gallery-card');
      card.type = 'button';
      card.title = `${item.title} — ${item.creditSource}`;

      const thumbWrap = el('div', 'hud-gallery-thumb-wrap');

      const img = document.createElement('img');
      img.className = 'hud-gallery-thumb';
      img.loading = 'lazy';
      img.alt = item.title || '';

      const primaryUrl = sanitizeExternalUrl(item.thumbnailUrl || item.imageUrl);
      const backupUrl = item.backupImageUrl ? sanitizeExternalUrl(item.backupImageUrl) : null;
      img.onerror = () => {
        img.onerror = null;
        if (backupUrl && img.src !== backupUrl) {
          img.src = backupUrl;
        }
      };
      img.src = primaryUrl;

      const rawCredit = String(item.creditSource || 'NASA');
      let badgeLabel = 'NASA / ARCHIVE';
      if (rawCredit.includes('ISS') || rawCredit.includes('Earth Observatory')) {
        badgeLabel = 'NASA / ISS';
      } else if (rawCredit.includes('Apollo') || rawCredit.includes('LRO')) {
        badgeLabel = 'NASA / APOLLO';
      } else if (rawCredit.includes('Wikimedia')) {
        badgeLabel = 'WIKIMEDIA';
      } else if (rawCredit.includes('JPL')) {
        badgeLabel = 'NASA / JPL';
      } else if (rawCredit.includes('Hubble') || rawCredit.includes('STScI')) {
        badgeLabel = 'NASA / HUBBLE';
      }
      const badgeEl = el('span', 'hud-gallery-badge', badgeLabel);

      thumbWrap.appendChild(img);
      thumbWrap.appendChild(badgeEl);
      card.appendChild(thumbWrap);

      const info = el('div', 'hud-gallery-info');
      info.appendChild(el('div', 'hud-gallery-title', item.title || ''));
      info.appendChild(el('div', 'hud-gallery-credit', item.creditSource || 'Nguồn: NASA'));
      card.appendChild(info);

      const idx = i;
      card.addEventListener('click', () => {
        this._openLightbox(idx);
      });

      this.refs.galleryGrid.appendChild(card);
    }
  }

  /**
   * Merges additional real photos from NASA Image and Video Library API into the gallery for `bodyKey`.
   * @param {string} bodyKey
   * @param {Array<object>} extraPhotos
   */
  updateGalleryPhotos(bodyKey, extraPhotos) {
    if (!bodyKey || String(bodyKey).toLowerCase() !== this.selectedBodyKey) return;
    if (!Array.isArray(extraPhotos) || extraPhotos.length === 0) return;

    const baseItems = getPlanetGallery(bodyKey);
    const seenUrls = new Set(baseItems.map((it) => it.imageUrl));
    const merged = [...baseItems];

    for (let i = 0; i < extraPhotos.length; i++) {
      const p = extraPhotos[i];
      if (p && p.imageUrl && !seenUrls.has(p.imageUrl) && merged.length < 8) {
        seenUrls.add(p.imageUrl);
        merged.push(p);
      }
    }

    this._renderGalleryCards(this.selectedBodyKey, merged);
  }

  _buildBottomControls() {
    const bottomStack = el('footer', 'hud-bottom-stack');

    const timeBar = el('div', 'hud-timewarp-bar liquid-glass');

    const clockWrap = el('div', 'hud-sim-clock');
    this.refs.simStateBadge = el('span', 'hud-clock-badge', 'LIVE 1x');
    this.refs.simDateText = el('span', '', '2026-11-08 05:27:00 UTC');
    clockWrap.appendChild(this.refs.simStateBadge);
    clockWrap.appendChild(this.refs.simDateText);
    timeBar.appendChild(clockWrap);

    const pauseBtn = el('button', 'hud-btn liquid-glass-pill', 'PAUSE');
    pauseBtn.type = 'button';
    pauseBtn.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      pauseBtn.textContent = this.isPaused ? 'RESUME' : 'PAUSE';
      pauseBtn.classList.toggle('active', this.isPaused);
      this._updateTimeBadge();
      if (typeof this.onTimeScaleChange === 'function') {
        this.onTimeScaleChange(this.timeScale, this.isPaused);
      }
    });
    this.refs.pauseBtn = pauseBtn;
    timeBar.appendChild(pauseBtn);

    const warpBtnsWrap = el('div', 'hud-warp-buttons');
    for (let i = 0; i < TIME_WARP_PRESETS.length; i++) {
      const preset = TIME_WARP_PRESETS[i];
      const btn = el(
        'button',
        preset.value === this.timeScale
          ? 'hud-warp-btn liquid-glass-pill active'
          : 'hud-warp-btn liquid-glass-pill',
        preset.label
      );
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.timeScale = preset.value;
        this.isPaused = false;
        if (this.refs.pauseBtn) {
          this.refs.pauseBtn.textContent = 'PAUSE';
          this.refs.pauseBtn.classList.remove('active');
        }
        this._highlightWarpButton(preset.value);
        this._updateTimeBadge();
        if (typeof this.onTimeScaleChange === 'function') {
          this.onTimeScaleChange(this.timeScale, this.isPaused);
        }
      });
      this.warpButtons.set(preset.value, btn);
      warpBtnsWrap.appendChild(btn);
    }
    timeBar.appendChild(warpBtnsWrap);
    bottomStack.appendChild(timeBar);

    const dock = el('nav', 'hud-planet-dock liquid-glass');
    dock.setAttribute('aria-label', 'Danh sách Mặt Trời, 8 Hành tinh và Mặt Trăng');

    for (let i = 0; i < this.celestialOrder.length; i++) {
      const key = this.celestialOrder[i];
      const data = this.solarData[key];
      if (!data) continue;

      const item = el(
        'button',
        key === this.selectedBodyKey
          ? 'hud-dock-item liquid-glass-pill active'
          : 'hud-dock-item liquid-glass-pill'
      );
      item.type = 'button';

      const orb = el('span', 'hud-dock-orb');
      orb.style.backgroundColor = data.color || '#38bdf8';
      orb.style.boxShadow = `0 0 10px ${data.color || '#38bdf8'}`;
      item.appendChild(orb);

      const textCol = el('div', 'hud-dock-text');
      textCol.appendChild(el('span', 'hud-dock-name', data.nameVi || data.name));
      let subText = `${Number(data.semiMajorAxisAU || 0).toFixed(2)} AU`;
      if (key === 'sun') {
        subText = '0.00 AU // STAR';
      } else if (key === 'moon') {
        subText = '384,400 km // LUNA';
      }
      textCol.appendChild(el('span', 'hud-dock-au', subText));
      item.appendChild(textCol);

      item.addEventListener('click', () => {
        if (typeof this.onSelectBody === 'function') {
          this.onSelectBody(key);
        }
      });

      this.dockButtons.set(key, item);
      dock.appendChild(item);
    }

    bottomStack.appendChild(dock);
    return bottomStack;
  }

  _highlightWarpButton(activeVal) {
    this.warpButtons.forEach((btn, val) => {
      btn.classList.toggle('active', val === activeVal);
    });
  }

  _updateTimeBadge() {
    if (!this.refs.simStateBadge) return;
    if (this.isPaused) {
      this.refs.simStateBadge.textContent = 'PAUSED';
    } else if (this.timeScale === 1) {
      this.refs.simStateBadge.textContent = 'LIVE 1x';
    } else {
      this.refs.simStateBadge.textContent = `WARP ${this.timeScale.toLocaleString('en-US')}x`;
    }
  }

  /**
   * Smoothly hides the Telemetry Panel (e.g., on initial load, when clicking [OVERVIEW],
   * or when pressing W/A/S/D/Space/C to enter Free-Fly mode).
   */
  hideTelemetryPanel() {
    this.selectedBodyKey = null;
    this.dockButtons.forEach((btn) => {
      btn.classList.remove('active');
    });
    if (this.refs.overviewBtn) {
      this.refs.overviewBtn.classList.add('active');
    }
    if (this.refs.telemetryAside) {
      this.refs.telemetryAside.classList.remove('telemetry-dragging');
      this.refs.telemetryAside.classList.add('telemetry-hidden');
    }
  }

  /**
   * Dims the Telemetry Panel to `opacity: 0.25` while dragging mouse to rotate around a locked planet/Moon.
   * @param {boolean} isDragging
   */
  setTelemetryOrbitDragDim(isDragging) {
    if (!this.refs.telemetryAside) return;
    if (this.refs.telemetryAside.classList.contains('telemetry-hidden')) return;
    this.refs.telemetryAside.classList.toggle('telemetry-dragging', Boolean(isDragging));
  }

  /**
   * Shows and updates the Liquid Glass Telemetry Panel & Real Photo Gallery when a planet, Moon, or Sun is selected.
   * Uses `textContent` exclusively for XSS immunity.
   *
   * @param {string|null} bodyKey
   * @param {object|null} bodyData
   * @param {object} [liveTelemetry]
   * @param {Array<object>} [galleryItems]
   */
  setSelectedBody(bodyKey, bodyData, liveTelemetry = {}, galleryItems) {
    if (!bodyKey || !bodyData) {
      this.hideTelemetryPanel();
      return;
    }

    const normalizedKey = String(bodyKey || bodyData.id || 'earth').toLowerCase();
    this.selectedBodyKey = normalizedKey;

    if (this.refs.overviewBtn) {
      this.refs.overviewBtn.classList.remove('active');
    }

    this.dockButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === normalizedKey);
    });

    if (this.refs.telemetryAside) {
      this.refs.telemetryAside.classList.remove('telemetry-hidden', 'telemetry-dragging');
    }

    const color = bodyData.color || '#38bdf8';
    if (this.refs.bodySwatch) {
      this.refs.bodySwatch.style.backgroundColor = color;
      this.refs.bodySwatch.style.boxShadow = `0 0 12px ${color}`;
    }

    if (this.refs.bodyNameVi) {
      this.refs.bodyNameVi.textContent = bodyData.nameVi || bodyData.name || '';
    }
    if (this.refs.bodyNameEn) {
      this.refs.bodyNameEn.textContent = (bodyData.nameEn || bodyData.name || '').toUpperCase();
    }
    if (this.refs.bodyClassBadge) {
      this.refs.bodyClassBadge.textContent = bodyData.classification || '';
    }

    if (normalizedKey === 'moon') {
      if (this.refs.statDistanceLabel) {
        this.refs.statDistanceLabel.textContent = 'KHOẢNG CÁCH TRÁI ĐẤT';
      }
      if (this.refs.statDistanceAU) {
        this.refs.statDistanceAU.textContent = '384,400 km (1.0026 AU)';
      }
    } else {
      if (this.refs.statDistanceLabel) {
        this.refs.statDistanceLabel.textContent = 'KHOẢNG CÁCH MẶT TRỜI';
      }
      const distAU = liveTelemetry?.heliocentricDistanceAU ?? bodyData.semiMajorAxisAU ?? 0;
      const distMillionKm = (distAU * SCALE_CONSTANTS.AU_IN_KM) / 1e6;
      if (this.refs.statDistanceAU) {
        this.refs.statDistanceAU.textContent =
          normalizedKey === 'sun'
            ? '0.000 AU (Trung tâm)'
            : `${distAU.toFixed(3)} AU (${distMillionKm.toFixed(1)}M km)`;
      }
    }

    const velKms = liveTelemetry?.instantVelocityKms ?? bodyData.orbitalVelocityKms ?? 0;
    if (this.refs.statVelocity) {
      this.refs.statVelocity.textContent =
        normalizedKey === 'moon' ? `${Number(bodyData.orbitalVelocityKms || 1.022).toFixed(3)} km/s` : `${velKms.toFixed(2)} km/s`;
    }

    if (this.refs.statRadius) {
      this.refs.statRadius.textContent = `${Number(bodyData.radiusKm || 0).toLocaleString('en-US')} km`;
    }

    if (this.refs.statAxialTilt) {
      const tilt = Number(bodyData.axialTiltDeg || 0);
      const retroNote = tilt > 90 ? ' (Nghịch chiều)' : '';
      this.refs.statAxialTilt.textContent = `${tilt.toFixed(2)}°${retroNote}`;
    }

    if (this.refs.statRotation) {
      const rotH = Number(bodyData.rotationPeriodHours || 0);
      const absH = Math.abs(rotH);
      const dir = rotH < 0 ? ' (Ngược chiều)' : '';
      if (absH >= 48) {
        this.refs.statRotation.textContent = `${(absH / 24).toFixed(2)} ngày${dir}`;
      } else {
        this.refs.statRotation.textContent = `${absH.toFixed(2)} giờ${dir}`;
      }
    }

    if (this.refs.statOrbitalPeriod) {
      const orbDays = Number(bodyData.orbitalPeriodDays || 0);
      if (orbDays <= 0) {
        this.refs.statOrbitalPeriod.textContent = '230 triệu năm (Ngân Hà)';
      } else if (orbDays >= 730) {
        this.refs.statOrbitalPeriod.textContent = `${orbDays.toLocaleString('en-US')} ngày (${(orbDays / 365.256).toFixed(1)} năm)`;
      } else {
        this.refs.statOrbitalPeriod.textContent = `${orbDays.toFixed(2)} ngày`;
      }
    }

    if (this.refs.statTemperature) {
      this.refs.statTemperature.textContent = bodyData.temperatureDisplay || `${bodyData.meanTempC ?? 0} °C`;
    }

    if (this.refs.statGravity) {
      this.refs.statGravity.textContent = `${bodyData.surfaceGravityMs2 ?? 0} m/s² (v_esc: ${bodyData.escapeVelocityKms ?? 0} km/s)`;
    }

    if (this.refs.bodyDesc) {
      this.refs.bodyDesc.textContent = bodyData.description || '';
    }

    if (this.refs.atmoList) {
      this.refs.atmoList.textContent = '';
      const list = Array.isArray(bodyData.atmosphereComposition) ? bodyData.atmosphereComposition : [];
      for (let i = 0; i < list.length; i++) {
        this.refs.atmoList.appendChild(el('span', 'hud-tag', list[i]));
      }
    }

    if (this.refs.moonsList) {
      this.refs.moonsList.textContent = '';
      const moonCountTag = el('span', 'hud-tag', `Vệ tinh đã biết: ${bodyData.moonCount ?? 0}`);
      this.refs.moonsList.appendChild(moonCountTag);

      if (Array.isArray(bodyData.moons)) {
        for (let i = 0; i < bodyData.moons.length; i++) {
          const m = bodyData.moons[i];
          this.refs.moonsList.appendChild(el('span', 'hud-tag', `🛰️ ${m.nameVi || m.name}`));
        }
      }
      if (Array.isArray(bodyData.missions)) {
        for (let i = 0; i < bodyData.missions.length; i++) {
          this.refs.moonsList.appendChild(el('span', 'hud-tag', `🚀 ${bodyData.missions[i]}`));
        }
      }
    }

    if (this.refs.factsList) {
      this.refs.factsList.textContent = '';
      const facts = Array.isArray(bodyData.nasaFacts) ? bodyData.nasaFacts : [];
      for (let i = 0; i < facts.length; i++) {
        this.refs.factsList.appendChild(el('li', '', facts[i]));
      }
    }

    // Render 100% Authentic Space Photographs
    this._renderGalleryCards(normalizedKey, galleryItems);
  }

  /**
   * Updates NASA Archive Telemetry enrichment section safely using textContent.
   * @param {string} bodyKey
   * @param {object} enriched
   */
  updateNasaEnrichment(bodyKey, enriched) {
    if (!enriched || String(bodyKey).toLowerCase() !== this.selectedBodyKey) return;

    if (this.refs.apiStatus) {
      this.refs.apiStatus.textContent = escapeHtml(
        `${enriched.missionStatus || 'TELEMETRY LOCK'} // ${enriched.source || 'NASA NSSDCA'}`
      );
    }

    if (this.refs.apiSnippet) {
      if (enriched.nasaArchiveTitle && enriched.nasaArchiveSnippet) {
        this.refs.apiSnippet.textContent = `[${enriched.nasaArchiveCenter || 'NASA'}] ${enriched.nasaArchiveTitle} — ${enriched.nasaArchiveSnippet}`;
      } else {
        this.refs.apiSnippet.textContent = `Cơ sở dữ liệu chuẩn NASA NSSDCA J2000 đã xác thực cho ${enriched.vietnameseName || bodyKey}. Khối lượng riêng: ${enriched.densityGcm3 ?? '-'} g/cm³.`;
      }
    }
  }

  /**
   * Throttled (~5 Hz) real-time update of Compact FPS Pill, Simulation UTC Clock, and Live Orbital Telemetry.
   * @param {object} metrics
   */
  updateRealtimeTelemetry(metrics) {
    if (!metrics) return;

    if (this.refs.fpsVal) {
      this.refs.fpsVal.textContent = String(metrics.fps ?? 60);
      this.refs.fpsVal.classList.toggle('warn', metrics.fps < 50);
    }

    if (this.refs.simDateText && typeof metrics.simTimestampMs === 'number') {
      const iso = new Date(metrics.simTimestampMs).toISOString();
      this.refs.simDateText.textContent = `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
    }

    if (this.selectedBodyKey && metrics.selectedBodyKey === this.selectedBodyKey) {
      if (this.selectedBodyKey === 'moon') {
        if (this.refs.statDistanceAU) {
          this.refs.statDistanceAU.textContent = '384,400 km (1.0026 AU)';
        }
        if (this.refs.statVelocity) {
          this.refs.statVelocity.textContent = '1.022 km/s';
        }
      } else {
        if (this.refs.statDistanceAU && this.selectedBodyKey !== 'sun') {
          const au = Number(metrics.heliocentricDistanceAU || 0);
          const mKm = (au * SCALE_CONSTANTS.AU_IN_KM) / 1e6;
          this.refs.statDistanceAU.textContent = `${au.toFixed(4)} AU (${mKm.toFixed(1)}M km)`;
        }
        if (this.refs.statVelocity && this.selectedBodyKey !== 'sun') {
          const v = Number(metrics.instantVelocityKms || 0);
          this.refs.statVelocity.textContent = `${v.toFixed(2)} km/s`;
        }
      }
    }
  }

  /**
   * Displays or hides WebGL Context Lost / Restored warning banner.
   * @param {{ status: 'lost'|'restored', message: string }} stateInfo
   */
  setWebGLContextBanner(stateInfo) {
    if (!this.refs.contextBanner || !stateInfo) return;
    const banner = this.refs.contextBanner;
    banner.textContent = stateInfo.message || '';
    banner.classList.remove('hidden', 'restored');

    if (stateInfo.status === 'restored') {
      banner.classList.add('restored');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 4000);
    }
  }
}
