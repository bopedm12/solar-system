/**
 * NASA NSSDCA (National Space Science Data Coordinated Archive) — Planetary & Lunar Fact Sheet
 * Standardized J2000 Ephemeris & Physical Telemetry for the Sun, 8 Major Planets,
 * First-Class Standalone Moon ('moon'), and Major Galilean/Kronian Moons.
 */

export const CELESTIAL_ORDER = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune'
];

export const SCALE_CONSTANTS = {
  AU_IN_KM: 149597870.7,
  EARTH_RADIUS_KM: 6371.0,
  CINEMATIC_AU_BASE: 46.0,
  TRUE_SCALE_AU_UNITS: 60.0,
  TRUE_SCALE_RADIUS_MULTIPLIER: 0.00028,
  TRUE_SCALE_SUN_RADIUS: 6.5
};

const STANDALONE_MOON_DATA = {
  id: 'moon',
  key: 'moon',
  parentId: 'earth',
  parentBodyKey: 'earth',
  standaloneEntity: true,
  name: 'The Moon',
  nameEn: 'The Moon (Luna)',
  nameVi: 'Mặt Trăng',
  type: 'terrestrial',
  classification: 'Natural Satellite / Vệ tinh Tự nhiên Trái Đất',
  color: '#cbd5e1',
  accentColor: '#94a3b8',
  orbitColor: '#94a3b8',
  radiusKm: 1737.4,
  cinematicRadius: 0.72,
  trueScaleRadius: 0.25,
  distanceToEarthKm: 384400,
  semiMajorAxisKm: 384400,
  semiMajorAxisAU: 1.00257,
  distanceAU: 1.00257,
  cinematicDistance: 4.8,
  cinematicOrbitRadius: 4.8,
  trueOrbitRadius: 3.2,
  trueScaleOrbitRadius: 3.2,
  trueScaleDistance: 3.2,
  eccentricity: 0.0549,
  inclinationDeg: 5.145,
  longitudeOfAscendingNodeDeg: 125.08,
  argumentOfPeriapsisDeg: 318.15,
  meanAnomalyAtEpochDeg: 135.27,
  axialTiltDeg: 6.68,
  obliquityDeg: 6.68,
  rotationPeriodHours: 655.68, // 27.32 Earth days — Synchronous Tidal Locking
  orbitalPeriodDays: 27.32,
  orbitalVelocityKms: 1.022,
  meanTempC: -23,
  temperatureK: 250,
  temperatureDisplay: '-173°C đến 127°C',
  surfaceGravityMs2: 1.62,
  escapeVelocityKms: 2.38,
  massKg: '7.342 × 10²² kg',
  earthMasses: 0.0123,
  densityGcm3: 3.344,
  moonCount: 0,
  atmosphereComposition: [
    'Exosphere cực loãng: Helium (He)',
    'Argon (Ar), Neon (Ne)',
    'Natri (Na), Kali (K)'
  ],
  hasRings: false,
  hasAtmosphere: false,
  moons: [],
  missions: [
    'Apollo 11, 12, 14, 15, 16, 17',
    'Lunar Reconnaissance Orbiter (LRO)',
    'Artemis Program',
    'GRAIL & LADEE'
  ],
  description:
    'Vệ tinh tự nhiên duy nhất của Trái Đất (bán kính 1.737,4 km, cách Trái Đất trung bình 384.400 km). Do hiện tượng khóa thủy triều (Tidal Locking), chu kỳ tự quay của Mặt Trăng bằng đúng chu kỳ quỹ đạo (27,32 ngày) nên luôn hướng một mặt về Trái Đất với các biển bazan tối màu (Lunar Maria như Mare Tranquillitatis, Mare Imbrium) và các hố va chạm có tia bắn rực sáng như Tycho và Copernicus.',
  nasaFacts: [
    'Khóa thủy triều đồng bộ (Tidal Locking): Mặt Trăng tự quay quanh trục đúng 27,32 ngày, luôn hướng vùng Biển Tĩnh Lặng (Mare Tranquillitatis) và Đại dương Bão tố (Oceanus Procellarum) về phía Trái Đất.',
    'Ngày 20/07/1969, tàu Apollo 11 của NASA đưa Neil Armstrong và Buzz Aldrin hạ cánh xuống Biển Tĩnh Lặng; hiện nay chương trình Artemis đang chuẩn bị đưa con người trở lại vùng cực Nam Mặt Trăng.',
    'Các hố va chạm trẻ nổi bật như Tycho (rộng 85 km ở bán cầu Nam) và Copernicus (rộng 93 km) có hệ thống tia sáng (Ejecta Rays) vươn dài hơn 1.500 km khắp bề mặt.'
  ]
};

export const MOONS_DATA = {
  moon: STANDALONE_MOON_DATA,
  io: {
    id: 'io',
    key: 'io',
    parentId: 'jupiter',
    name: 'Io',
    nameEn: 'Io',
    nameVi: 'Vệ tinh Io',
    classification: 'Galilean Moon / Vệ tinh núi lửa',
    color: '#facc15',
    accentColor: '#eab308',
    radiusKm: 1821.6,
    cinematicRadius: 0.52,
    trueScaleRadius: 0.28,
    semiMajorAxisKm: 421700,
    semiMajorAxisAU: 0.002819,
    cinematicDistance: 8.2,
    cinematicOrbitRadius: 8.2,
    trueScaleOrbitRadius: 5.8,
    eccentricity: 0.0041,
    inclinationDeg: 0.05,
    longitudeOfAscendingNodeDeg: 43.977,
    argumentOfPeriapsisDeg: 84.129,
    meanAnomalyAtEpochDeg: 342.02,
    axialTiltDeg: 0.0,
    rotationPeriodHours: 42.459,
    orbitalPeriodDays: 1.769138,
    orbitalVelocityKms: 17.334,
    meanTempC: -163,
    temperatureDisplay: '-163 °C (Miệng núi lửa > 1.300 °C)',
    surfaceGravityMs2: 1.796,
    escapeVelocityKms: 2.558,
    atmosphereComposition: ['SO2 (Sulfur Dioxide ~90%)', 'SO', 'NaCl'],
    description:
      'Thiên thể có hoạt động địa chất núi lửa mạnh nhất trong Hệ Mặt Trời, với hơn 400 núi lửa đang hoạt động do lực gia nhiệt thủy triều khổng lồ từ Sao Mộc.',
    nasaFacts: [
      'Cột phun trào lưu huỳnh từ núi lửa Pele và Tvashtar có thể bốc cao tới 300–500 km vào không gian.',
      'Quỹ đạo cộng hưởng Laplace 4:2:1 với Europa và Ganymede duy trì độ lệch tâm làm nóng chảy lõi Io.'
    ]
  },
  europa: {
    id: 'europa',
    key: 'europa',
    parentId: 'jupiter',
    name: 'Europa',
    nameEn: 'Europa',
    nameVi: 'Vệ tinh Europa',
    classification: 'Galilean Ocean Moon / Vệ tinh băng đại dương',
    color: '#bae6fd',
    accentColor: '#38bdf8',
    radiusKm: 1560.8,
    cinematicRadius: 0.46,
    trueScaleRadius: 0.25,
    semiMajorAxisKm: 671034,
    semiMajorAxisAU: 0.004486,
    cinematicDistance: 10.6,
    cinematicOrbitRadius: 10.6,
    trueScaleOrbitRadius: 7.4,
    eccentricity: 0.009,
    inclinationDeg: 0.47,
    longitudeOfAscendingNodeDeg: 219.106,
    argumentOfPeriapsisDeg: 88.97,
    meanAnomalyAtEpochDeg: 171.016,
    axialTiltDeg: 0.1,
    rotationPeriodHours: 85.228,
    orbitalPeriodDays: 3.551181,
    orbitalVelocityKms: 13.74,
    meanTempC: -171,
    temperatureDisplay: '-171 °C',
    surfaceGravityMs2: 1.314,
    escapeVelocityKms: 2.025,
    atmosphereComposition: ['O2 phân tử cực loãng (do bức xạ tách nước băng)'],
    description:
      'Vệ tinh băng phẳng mịn nhất Hệ Mặt Trời, ẩn chứa một đại dương nước lỏng toàn cầu sâu tới 100 km bên dưới lớp vỏ băng dày 15–25 km.',
    nasaFacts: [
      'Tàu vũ trụ NASA Europa Clipper được phóng nhằm khảo sát khả năng tồn tại sự sống trong đại dương ngầm của Europa.',
      'Đại dương ngầm của Europa ước tính chứa lượng nước lỏng gấp đôi toàn bộ các đại dương trên Trái Đất cộng lại.'
    ]
  },
  titan: {
    id: 'titan',
    key: 'titan',
    parentId: 'saturn',
    name: 'Titan',
    nameEn: 'Titan',
    nameVi: 'Vệ tinh Titan',
    classification: 'Cryogenic Moon / Vệ tinh khí quyển đặc',
    color: '#f59e0b',
    accentColor: '#d97706',
    radiusKm: 2574.7,
    cinematicRadius: 0.65,
    trueScaleRadius: 0.36,
    semiMajorAxisKm: 1221870,
    semiMajorAxisAU: 0.008168,
    cinematicDistance: 11.8,
    cinematicOrbitRadius: 11.8,
    trueScaleOrbitRadius: 8.6,
    eccentricity: 0.0288,
    inclinationDeg: 0.3485,
    longitudeOfAscendingNodeDeg: 28.06,
    argumentOfPeriapsisDeg: 180.53,
    meanAnomalyAtEpochDeg: 163.31,
    axialTiltDeg: 0.3,
    rotationPeriodHours: 382.68,
    orbitalPeriodDays: 15.945,
    orbitalVelocityKms: 5.57,
    meanTempC: -179,
    temperatureDisplay: '-179.5 °C (93.7 K)',
    surfaceGravityMs2: 1.352,
    escapeVelocityKms: 2.639,
    atmosphereComposition: ['N2 (Nitơ ~97%)', 'CH4 (Methane ~2.7%)', 'H2 (~0.1–0.2%)'],
    description:
      'Vệ tinh lớn nhất của Sao Thổ và lớn hơn cả hành tinh Sao Thủy. Titan là vệ tinh duy nhất trong Hệ Mặt Trời có bầu khí quyển dày đặc cùng sông, hồ và biển hydrocarbon lỏng trên bề mặt.',
    nasaFacts: [
      'Tàu đổ bộ Huygens (Cassini-Huygens) đã hạ cánh thành công xuống bề mặt Titan năm 2005.',
      'Sứ mệnh trực thăng hạt nhân Dragonfly của NASA sẽ bay khảo sát các đồi cát hữu cơ trên Titan.'
    ]
  }
};

export const SOLAR_SYSTEM_DATA = {
  sun: {
    id: 'sun',
    key: 'sun',
    name: 'Sun',
    nameEn: 'The Sun (Sol)',
    nameVi: 'Mặt Trời',
    type: 'star',
    classification: 'G2V Main-Sequence Star / Sao lùn vàng chuỗi chính G2V',
    color: '#fbbf24',
    accentColor: '#f59e0b',
    orbitColor: '#f59e0b',
    radiusKm: 696340,
    cinematicRadius: 12.5,
    trueScaleRadius: 6.5,
    semiMajorAxisAU: 0.0,
    distanceAU: 0.0,
    cinematicDistance: 0.0,
    trueScaleDistance: 0.0,
    eccentricity: 0.0,
    inclinationDeg: 0.0,
    longitudeOfAscendingNodeDeg: 0.0,
    argumentOfPeriapsisDeg: 0.0,
    meanAnomalyAtEpochDeg: 0.0,
    axialTiltDeg: 7.25,
    obliquityDeg: 7.25,
    rotationPeriodHours: 609.12,
    orbitalPeriodDays: 0,
    orbitalVelocityKms: 220.0,
    meanTempC: 5505,
    temperatureK: 5778,
    temperatureDisplay: '5.505 °C (Quang cầu) / 15.000.000 °C (Lõi)',
    surfaceGravityMs2: 274.0,
    escapeVelocityKms: 617.7,
    massKg: '1.9885 × 10³⁰ kg',
    earthMasses: 332946,
    densityGcm3: 1.408,
    moonCount: 0,
    atmosphereComposition: [
      'Hydrogen (H₂ — 73.46% khối lượng)',
      'Helium (He — 24.85% khối lượng)',
      'Oxygen, Carbon, Neon, Iron (~1.69%)'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#ff7b00',
      coronaColor: '#fde047',
      intensity: 1.4
    },
    moons: [],
    missions: ['Parker Solar Probe', 'Solar Orbiter', 'SOHO', 'SDO'],
    description:
      'Ngôi sao trung tâm chiếm 99,86% tổng khối lượng toàn Hệ Mặt Trời. Lõi Mặt Trời dung hợp 600 triệu tấn Hydro thành Heli mỗi giây, giải phóng năng lượng bức xạ điện từ và gió Mặt Trời định hình toàn bộ nhật quyển.',
    nasaFacts: [
      'Tàu Parker Solar Probe của NASA đã bay xuyên qua vành nhật hoa (Corona) ở vận tốc kỷ lục 692.000 km/h.',
      'Ánh sáng từ bề mặt quang cầu Mặt Trời mất trung bình 8 phút 19 giây để truyền tới Trái Đất (1 AU).',
      'Nhiệt độ vành nhật hoa đạt tới 1–3 triệu độ C, nóng gấp hàng trăm lần bề mặt quang cầu bên dưới.'
    ]
  },

  mercury: {
    id: 'mercury',
    key: 'mercury',
    name: 'Mercury',
    nameEn: 'Mercury',
    nameVi: 'Sao Thủy',
    type: 'terrestrial',
    classification: 'Terrestrial Planet / Hành tinh đất đá',
    color: '#94a3b8',
    accentColor: '#cbd5e1',
    orbitColor: '#94a3b8',
    radiusKm: 2439.7,
    cinematicRadius: 0.95,
    trueScaleRadius: 0.34,
    semiMajorAxisAU: 0.387098,
    distanceAU: 0.387,
    cinematicDistance: 24.0,
    trueScaleDistance: 0.387098 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.20563,
    inclinationDeg: 7.005,
    longitudeOfAscendingNodeDeg: 48.331,
    argumentOfPeriapsisDeg: 29.124,
    meanAnomalyAtEpochDeg: 174.796,
    axialTiltDeg: 0.03,
    obliquityDeg: 0.03,
    rotationPeriodHours: 1407.6,
    orbitalPeriodDays: 87.969,
    orbitalVelocityKms: 47.36,
    meanTempC: 167,
    temperatureK: 440,
    temperatureDisplay: '167 °C (Biên độ: -180 °C đến +430 °C)',
    surfaceGravityMs2: 3.7,
    escapeVelocityKms: 4.25,
    massKg: '3.3011 × 10²³ kg',
    earthMasses: 0.0553,
    densityGcm3: 5.427,
    moonCount: 0,
    atmosphereComposition: [
      'Exosphere cực mỏng: O₂ (42%)',
      'Natri — Na (29%)',
      'Hydro — H₂ (22%), Heli — He (6%)'
    ],
    hasRings: false,
    hasAtmosphere: false,
    moons: [],
    missions: ['Mariner 10', 'MESSENGER', 'BepiColombo'],
    description:
      'Hành tinh nhỏ nhất và gần Mặt Trời nhất, có quỹ đạo elip lệch tâm lớn nhất (e = 0.2056) cùng vận tốc quỹ đạo nhanh nhất Hệ Mặt Trời (47,36 km/s). Lõi sắt-niken khổng lồ chiếm tới 85% bán kính hành tinh.',
    nasaFacts: [
      'Cộng hưởng quay–quỹ đạo 3:2 độc nhất: Sao Thủy tự quay đúng 3 vòng quanh trục sau mỗi 2 vòng quay quanh Mặt Trời.',
      'Dù gần Mặt Trời nhất, tàu MESSENGER của NASA đã phát hiện băng nước vĩnh cửu dưới đáy các hố sâu vùng cực Bắc và cực Nam.',
      'Lưu vực va chạm Caloris rộng 1.550 km được bao quanh bởi các dãy núi cao tới 2 km.'
    ]
  },

  venus: {
    id: 'venus',
    key: 'venus',
    name: 'Venus',
    nameEn: 'Venus',
    nameVi: 'Sao Kim',
    type: 'terrestrial',
    classification: 'Terrestrial Planet / Hành tinh đất đá',
    color: '#fbbf24',
    accentColor: '#f59e0b',
    orbitColor: '#f59e0b',
    radiusKm: 6051.8,
    cinematicRadius: 1.72,
    trueScaleRadius: 0.85,
    semiMajorAxisAU: 0.723332,
    distanceAU: 0.723,
    cinematicDistance: 34.0,
    trueScaleDistance: 0.723332 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.006772,
    inclinationDeg: 3.39458,
    longitudeOfAscendingNodeDeg: 76.68,
    argumentOfPeriapsisDeg: 54.884,
    meanAnomalyAtEpochDeg: 50.115,
    axialTiltDeg: 177.36,
    obliquityDeg: 177.36,
    rotationPeriodHours: -5832.5,
    orbitalPeriodDays: 224.701,
    orbitalVelocityKms: 35.02,
    meanTempC: 464,
    temperatureK: 737,
    temperatureDisplay: '464 °C (Hiệu ứng nhà kính cực đoan)',
    surfaceGravityMs2: 8.87,
    escapeVelocityKms: 10.36,
    massKg: '4.8675 × 10²⁴ kg',
    earthMasses: 0.815,
    densityGcm3: 5.243,
    moonCount: 0,
    atmosphereComposition: [
      'Carbon Dioxide — CO₂ (96.5%)',
      'Nitrogen — N₂ (3.5%)',
      'Mây Axit Sunfuric (H₂SO₄) & SO₂ (150 ppm)'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#fde68a',
      intensity: 0.85,
      scale: 1.045,
      hasClouds: true
    },
    moons: [],
    missions: ['Magellan', 'Venera 13', 'Akatsuki', 'VERITAS & DAVINCI (Upcoming)'],
    description:
      'Hành tinh nóng nhất Hệ Mặt Trời (464 °C) do hiệu ứng nhà kính mất kiểm soát với áp suất bề mặt gấp 92 lần Trái Đất. Sao Kim tự quay nghịch chiều (Retrograde, độ nghiêng trục 177,36°) nên Mặt Trời mọc ở hướng Tây và lặn ở hướng Đông.',
    nasaFacts: [
      'Một ngày sao (Sidereal day: 243 ngày Trái Đất) trên Sao Kim dài hơn cả một năm quỹ đạo của chính nó (224,7 ngày).',
      'Tàu Magellan của NASA đã lập bản đồ radar xuyên mây 98% bề mặt Sao Kim, phát hiện núi Maxwell Montes cao 11 km.',
      'Tầng mây axit sunfuric phản xạ tới 75% ánh sáng Mặt Trời, khiến Sao Kim là thiên thể sáng nhất trên bầu trời đêm sau Mặt Trăng.'
    ]
  },

  earth: {
    id: 'earth',
    key: 'earth',
    name: 'Earth',
    nameEn: 'Earth (Terra)',
    nameVi: 'Trái Đất',
    type: 'terrestrial',
    classification: 'Terrestrial Ocean World / Hành tinh đại dương sống',
    color: '#38bdf8',
    accentColor: '#0284c7',
    orbitColor: '#38bdf8',
    radiusKm: 6371.0,
    cinematicRadius: 1.85,
    trueScaleRadius: 0.9,
    semiMajorAxisAU: 1.0,
    distanceAU: 1.0,
    cinematicDistance: 46.0,
    trueScaleDistance: 1.0 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.0167086,
    inclinationDeg: 0.00005,
    longitudeOfAscendingNodeDeg: -11.26064,
    argumentOfPeriapsisDeg: 114.20783,
    meanAnomalyAtEpochDeg: 358.617,
    axialTiltDeg: 23.44,
    obliquityDeg: 23.44,
    rotationPeriodHours: 23.9345,
    orbitalPeriodDays: 365.256,
    orbitalVelocityKms: 29.78,
    meanTempC: 15,
    temperatureK: 288,
    temperatureDisplay: '15 °C (-89.2 °C đến +56.7 °C)',
    surfaceGravityMs2: 9.80665,
    escapeVelocityKms: 11.186,
    massKg: '5.9722 × 10²⁴ kg',
    earthMasses: 1.0,
    densityGcm3: 5.514,
    moonCount: 1,
    atmosphereComposition: [
      'Nitrogen — N₂ (78.08%)',
      'Oxygen — O₂ (20.95%)',
      'Argon — Ar (0.93%), CO₂ (0.042%), Hơi nước (~1%)'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#38bdf8',
      intensity: 1.15,
      scale: 1.04,
      hasClouds: true,
      hasNightLights: true
    },
    moons: [], // Standalone 'moon' is rendered directly via CELESTIAL_ORDER
    missions: ['ISS', 'Terra & Aqua', 'Landsat 9', 'SWOT', 'PACE'],
    description:
      'Hành tinh thứ ba tính từ Mặt Trời, có mật độ khối lượng riêng lớn nhất Hệ Mặt Trời (5,514 g/cm³) và là thế giới duy nhất được biết đến có đại dương nước lỏng bề mặt (71%), kiến tạo mảng hoạt động và sự sống phát triển.',
    nasaFacts: [
      'Độ nghiêng trục 23,44° kết hợp với lực ổn định từ Mặt Trăng tạo nên chu kỳ 4 mùa ổn định suốt hàng tỷ năm.',
      'Từ quyển Trái Đất sinh ra từ lõi sắt-niken lỏng đối lưu bảo vệ khí quyển khỏi sự bào mòn của gió Mặt Trời.',
      'Khoảng cách trung bình Trái Đất – Mặt Trời định nghĩa 1 Đơn vị Thiên văn chuẩn (1 AU = 149.597.870,7 km).'
    ]
  },

  moon: STANDALONE_MOON_DATA,

  mars: {
    id: 'mars',
    key: 'mars',
    name: 'Mars',
    nameEn: 'Mars',
    nameVi: 'Sao Hỏa',
    type: 'terrestrial',
    classification: 'Terrestrial Planet / Hành tinh đất đá đỏ',
    color: '#ef4444',
    accentColor: '#f97316',
    orbitColor: '#ef4444',
    radiusKm: 3389.5,
    cinematicRadius: 1.25,
    trueScaleRadius: 0.48,
    semiMajorAxisAU: 1.523679,
    distanceAU: 1.524,
    cinematicDistance: 60.0,
    trueScaleDistance: 1.523679 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    longitudeOfAscendingNodeDeg: 49.558,
    argumentOfPeriapsisDeg: 286.502,
    meanAnomalyAtEpochDeg: 19.412,
    axialTiltDeg: 25.19,
    obliquityDeg: 25.19,
    rotationPeriodHours: 24.6229,
    orbitalPeriodDays: 686.98,
    orbitalVelocityKms: 24.07,
    meanTempC: -65,
    temperatureK: 208,
    temperatureDisplay: '-65 °C (-140 °C đến +20 °C)',
    surfaceGravityMs2: 3.721,
    escapeVelocityKms: 5.027,
    massKg: '6.4171 × 10²³ kg',
    earthMasses: 0.107,
    densityGcm3: 3.933,
    moonCount: 2,
    atmosphereComposition: [
      'Carbon Dioxide — CO₂ (95.32%)',
      'Nitrogen — N₂ (2.7%)',
      'Argon — Ar (1.6%), O₂ (0.13%)'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#fb923c',
      intensity: 0.45,
      scale: 1.028,
      hasClouds: false
    },
    moons: [],
    missions: ['Perseverance & Ingenuity', 'Curiosity', 'MRO', 'MAVEN', 'InSight', 'Viking 1 & 2'],
    description:
      'Hành tinh Đỏ có màu sắc đặc trưng từ khoáng vật Sắt(III) Oxit (Hematite) phủ khắp bề mặt. Sao Hỏa sở hữu ngọn núi lửa lớn nhất Hệ Mặt Trời (Olympus Mons cao 21,9 km) và hệ thống hẻm núi Valles Marineris dài 4.000 km.',
    nasaFacts: [
      'Một ngày trên Sao Hỏa (gọi là 1 Sol) dài 24 giờ 37 phút, cùng độ nghiêng trục 25,19° rất giống với Trái Đất.',
      'Xe tự hành Perseverance của NASA đang thu thập mẫu đá tại hố Jezero — nơi từng là một hồ nước cổ đại và châu thổ sông.',
      'Trực thăng Ingenuity của NASA đã thực hiện 72 chuyến bay lịch sử trong bầu khí quyển loãng chỉ bằng 1% áp suất Trái Đất.'
    ]
  },

  jupiter: {
    id: 'jupiter',
    key: 'jupiter',
    name: 'Jupiter',
    nameEn: 'Jupiter',
    nameVi: 'Sao Mộc',
    type: 'gas_giant',
    classification: 'Gas Giant / Hành tinh khí khổng lồ',
    color: '#f59e0b',
    accentColor: '#d97706',
    orbitColor: '#f59e0b',
    radiusKm: 69911.0,
    cinematicRadius: 5.2,
    trueScaleRadius: 2.85,
    semiMajorAxisAU: 5.2044,
    distanceAU: 5.204,
    cinematicDistance: 92.0,
    trueScaleDistance: 5.2044 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.0489,
    inclinationDeg: 1.303,
    longitudeOfAscendingNodeDeg: 100.464,
    argumentOfPeriapsisDeg: 273.867,
    meanAnomalyAtEpochDeg: 20.02,
    axialTiltDeg: 3.13,
    obliquityDeg: 3.13,
    rotationPeriodHours: 9.925,
    orbitalPeriodDays: 4332.589,
    orbitalVelocityKms: 13.07,
    meanTempC: -110,
    temperatureK: 165,
    temperatureDisplay: '-110 °C (Tại mức áp suất 1 bar)',
    surfaceGravityMs2: 24.79,
    escapeVelocityKms: 59.5,
    massKg: '1.8982 × 10²⁷ kg',
    earthMasses: 317.8,
    densityGcm3: 1.326,
    moonCount: 95,
    atmosphereComposition: [
      'Hydrogen phân tử — H₂ (89.8%)',
      'Helium — He (10.2%)',
      'Methane (CH₄), Ammonia (NH₃), Hơi nước'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#fdba74',
      intensity: 0.55,
      scale: 1.025
    },
    moons: [MOONS_DATA.io, MOONS_DATA.europa],
    missions: ['Juno', 'Europa Clipper', 'Galileo', 'Voyager 1 & 2', 'Cassini'],
    description:
      'Hành tinh lớn nhất Hệ Mặt Trời với khối lượng gấp 2,5 lần tổng khối lượng của cả 7 hành tinh còn lại cộng lại. Sao Mộc tự quay quanh trục cực nhanh (chỉ 9 giờ 55 phút), tạo nên các dải mây amoniac xoáy dữ dội và Vết Đỏ Lớn (Great Red Spot).',
    nasaFacts: [
      'Vết Đỏ Lớn là siêu bão анти-cyclone khổng lồ rộng hơn cả Trái Đất, đã tồn tại liên tục ít nhất hơn 350 năm với sức gió > 430 km/h.',
      'Bên dưới tầng mây khí là đại dương Hydro kim loại lỏng khổng lồ tạo ra từ trường mạnh gấp 20.000 lần từ trường Trái Đất.',
      'Tàu vũ trụ Juno của NASA đang bay trên quỹ đạo cực để giải mã cấu trúc lõi và các xoáy thuận đa giác vùng cực Sao Mộc.'
    ]
  },

  saturn: {
    id: 'saturn',
    key: 'saturn',
    name: 'Saturn',
    nameEn: 'Saturn',
    nameVi: 'Sao Thổ',
    type: 'gas_giant',
    classification: 'Ringed Gas Giant / Hành tinh khí có vành đai',
    color: '#eab308',
    accentColor: '#fde047',
    orbitColor: '#eab308',
    radiusKm: 58232.0,
    cinematicRadius: 4.4,
    trueScaleRadius: 2.4,
    semiMajorAxisAU: 9.5826,
    distanceAU: 9.582,
    cinematicDistance: 128.0,
    trueScaleDistance: 9.5826 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.0565,
    inclinationDeg: 2.485,
    longitudeOfAscendingNodeDeg: 113.665,
    argumentOfPeriapsisDeg: 339.392,
    meanAnomalyAtEpochDeg: 317.02,
    axialTiltDeg: 26.73,
    obliquityDeg: 26.73,
    rotationPeriodHours: 10.656,
    orbitalPeriodDays: 10759.22,
    orbitalVelocityKms: 9.68,
    meanTempC: -140,
    temperatureK: 134,
    temperatureDisplay: '-140 °C (Tại mức áp suất 1 bar)',
    surfaceGravityMs2: 10.44,
    escapeVelocityKms: 35.5,
    massKg: '5.6834 × 10²⁶ kg',
    earthMasses: 95.16,
    densityGcm3: 0.687,
    moonCount: 146,
    atmosphereComposition: [
      'Hydrogen phân tử — H₂ (96.3%)',
      'Helium — He (3.25%)',
      'Methane (CH₄ — 0.45%), Ammonia (NH₃)'
    ],
    hasRings: true,
    ringSystem: {
      innerRadiusMultiplier: 1.28,
      outerRadiusMultiplier: 2.38,
      innerRadiusKm: 66900,
      outerRadiusKm: 140220,
      tiltDeg: 26.73,
      opacity: 0.92,
      color: '#fde68a'
    },
    hasAtmosphere: true,
    atmosphere: {
      color: '#fef08a',
      intensity: 0.48,
      scale: 1.022
    },
    moons: [MOONS_DATA.titan],
    missions: ['Cassini-Huygens', 'Dragonfly (Upcoming)', 'Voyager 1 & 2', 'Pioneer 11'],
    description:
      'Nổi tiếng với hệ thống vành đai băng giá tráng lệ trải rộng hơn 282.000 km nhưng chỉ dày trung bình 10–30 mét. Sao Thổ là hành tinh duy nhất trong Hệ Mặt Trời có khối lượng riêng trung bình (0,687 g/cm³) nhỏ hơn nước lỏng.',
    nasaFacts: [
      'Tại Bắc cực Sao Thổ có một dòng tia khí quyển hình Lục giác đều (Saturn Hexagon) rộng 30.000 km với tâm bão xoáy ở giữa.',
      'Vành đai Sao Thổ cấu tạo từ 99% băng nước tinh khiết, phân tách bởi Khe Cassini rộng 4.800 km do lực cộng hưởng từ vệ tinh Mimas.',
      'Sứ mệnh Cassini của NASA đã bay 13 năm quanh Sao Thổ và phát hiện các mạch nước phun từ đại dương ngầm trên vệ tinh Enceladus.'
    ]
  },

  uranus: {
    id: 'uranus',
    key: 'uranus',
    name: 'Uranus',
    nameEn: 'Uranus',
    nameVi: 'Sao Thiên Vương',
    type: 'ice_giant',
    classification: 'Ice Giant / Hành tinh băng khổng lồ',
    color: '#22d3ee',
    accentColor: '#06b6d4',
    orbitColor: '#22d3ee',
    radiusKm: 25362.0,
    cinematicRadius: 3.1,
    trueScaleRadius: 1.35,
    semiMajorAxisAU: 19.2184,
    distanceAU: 19.201,
    cinematicDistance: 164.0,
    trueScaleDistance: 19.2184 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.04717,
    inclinationDeg: 0.773,
    longitudeOfAscendingNodeDeg: 74.006,
    argumentOfPeriapsisDeg: 96.998857,
    meanAnomalyAtEpochDeg: 142.2386,
    axialTiltDeg: 97.77,
    obliquityDeg: 97.77,
    rotationPeriodHours: -17.24,
    orbitalPeriodDays: 30685.4,
    orbitalVelocityKms: 6.8,
    meanTempC: -195,
    temperatureK: 76,
    temperatureDisplay: '-195 °C (Đỉnh mây lạnh nhất: -224 °C)',
    surfaceGravityMs2: 8.87,
    escapeVelocityKms: 21.3,
    massKg: '8.6810 × 10²⁵ kg',
    earthMasses: 14.54,
    densityGcm3: 1.27,
    moonCount: 28,
    atmosphereComposition: [
      'Hydrogen phân tử — H₂ (82.5%)',
      'Helium — He (15.2%)',
      'Methane — CH₄ (2.3% — hấp thụ ánh sáng đỏ tạo sắc xanh lơ)'
    ],
    hasRings: true,
    ringSystem: {
      innerRadiusMultiplier: 1.52,
      outerRadiusMultiplier: 1.92,
      innerRadiusKm: 38000,
      outerRadiusKm: 98000,
      tiltDeg: 97.77,
      opacity: 0.42,
      color: '#67e8f9'
    },
    hasAtmosphere: true,
    atmosphere: {
      color: '#67e8f9',
      intensity: 0.55,
      scale: 1.03
    },
    moons: [],
    missions: ['Voyager 2'],
    description:
      'Hành tinh băng khổng lồ có trục tự quay nghiêng tới 97,77° — gần như nằm ngang lăn trên mặt phẳng quỹ đạo và quay nghịch chiều. Lớp phủ bên trong chứa hỗn hợp băng nước, amoniac và methane dưới áp suất siêu cao.',
    nasaFacts: [
      'Do trục nghiêng 97,77°, mỗi cực của Sao Thiên Vương đón ánh sáng Mặt Trời liên tục 42 năm rồi chìm vào bóng đêm suốt 42 năm tiếp theo.',
      'Sao Thiên Vương giữ kỷ lục nhiệt độ khí quyển thấp nhất Hệ Mặt Trời (-224 °C / 49 K), lạnh hơn cả Sao Hải Vương ở xa hơn.',
      'Voyager 2 của NASA (tháng 1/1986) là tàu vũ trụ duy nhất trong lịch sử từng bay qua khảo sát trực tiếp Sao Thiên Vương.'
    ]
  },

  neptune: {
    id: 'neptune',
    key: 'neptune',
    name: 'Neptune',
    nameEn: 'Neptune',
    nameVi: 'Sao Hải Vương',
    type: 'ice_giant',
    classification: 'Ice Giant / Hành tinh băng khổng lồ',
    color: '#3b82f6',
    accentColor: '#2563eb',
    orbitColor: '#3b82f6',
    radiusKm: 24622.0,
    cinematicRadius: 3.0,
    trueScaleRadius: 1.32,
    semiMajorAxisAU: 30.1104,
    distanceAU: 30.047,
    cinematicDistance: 198.0,
    trueScaleDistance: 30.1104 * SCALE_CONSTANTS.TRUE_SCALE_AU_UNITS,
    eccentricity: 0.00859,
    inclinationDeg: 1.77,
    longitudeOfAscendingNodeDeg: 131.784,
    argumentOfPeriapsisDeg: 273.187,
    meanAnomalyAtEpochDeg: 256.228,
    axialTiltDeg: 28.32,
    obliquityDeg: 28.32,
    rotationPeriodHours: 16.11,
    orbitalPeriodDays: 60189.0,
    orbitalVelocityKms: 5.43,
    meanTempC: -200,
    temperatureK: 72,
    temperatureDisplay: '-200 °C (72 K)',
    surfaceGravityMs2: 11.15,
    escapeVelocityKms: 23.5,
    massKg: '1.02413 × 10²⁶ kg',
    earthMasses: 17.15,
    densityGcm3: 1.638,
    moonCount: 16,
    atmosphereComposition: [
      'Hydrogen phân tử — H₂ (80.0%)',
      'Helium — He (19.0%)',
      'Methane — CH₄ (1.5%)'
    ],
    hasRings: false,
    hasAtmosphere: true,
    atmosphere: {
      color: '#3b82f6',
      intensity: 0.65,
      scale: 1.032
    },
    moons: [],
    missions: ['Voyager 2'],
    description:
      'Hành tinh xa nhất tính từ Mặt Trời (30,05 AU) và là hành tinh đầu tiên được tìm ra bằng tính toán toán học nhiễu loạn quỹ đạo trước khi quan sát qua kính thiên văn. Sao Hải Vương có những cơn gió siêu thanh mạnh nhất Hệ Mặt Trời.',
    nasaFacts: [
      'Tốc độ gió trong khí quyển Sao Hải Vương đạt tới 2.100 km/h — vượt ngưỡng tốc độ âm thanh do ma sát khí quyển cực thấp.',
      'Kể từ khi được phát hiện năm 1846, Sao Hải Vương mới chỉ hoàn thành đúng 1 vòng quỹ đạo quanh Mặt Trời vào năm 2011 (chu kỳ 164,8 năm).',
      'Vệ tinh lớn nhất Triton quay ngược chiều (Retrograde) quanh Sao Hải Vương và có các mạch phun Nitơ lỏng cao 8 km.'
    ]
  }
};

/**
 * Helper to look up any celestial body (Sun, Planet, or Moon) by key/id.
 * @param {string} bodyKey
 * @returns {object|null}
 */
export function getCelestialBodyData(bodyKey) {
  if (!bodyKey) return null;
  const normalized = String(bodyKey).toLowerCase().trim();
  if (SOLAR_SYSTEM_DATA[normalized]) {
    return SOLAR_SYSTEM_DATA[normalized];
  }
  if (MOONS_DATA[normalized]) {
    return MOONS_DATA[normalized];
  }
  return null;
}

export default SOLAR_SYSTEM_DATA;
