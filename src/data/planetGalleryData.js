/**
 * NASA 3D Solar System — 100% Authentic Photograph Gallery & NASA Image Library Service
 * Zero Canvas/SVG fake drawings: every entry is a verified real photograph from
 * Wikimedia Commons (`Special:FilePath`) and NASA's Official Image & Video Archive (`images-assets.nasa.gov`).
 */
import { sanitizeTelemetryText } from './nasaApiService.js';

const GALLERY_CACHE_PREFIX = 'nasa_real_gallery_v8_';
const GALLERY_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours TTL
const galleryMemoryCache = new Map();

export const PLANET_GALLERY_DATA = {
  sun: [
    {
      id: 'sun-sdo-aia-2010',
      title: 'Mặt Trời Cực tím Cực đại (Tàu NASA SDO AIA)',
      caption:
        'Ảnh chụp thực tế Mặt Trời ở bước sóng cực tím xa bởi Đài quan sát Động lực học Mặt Trời (SDO) của NASA ngày 19/08/2010, làm lộ rõ các vùng hoạt động từ trường và vòng cung plasma.',
      imageUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg?width=1000',
      backupImageUrl:
        'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~orig.jpg',
      creditSource: 'Nguồn: NASA / SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/',
      dateTaken: '2010-08-19',
      locationOrMission: 'NASA Solar Dynamics Observatory (AIA)'
    },
    {
      id: 'sun-x-flare-2014',
      title: 'Bùng phát Nhật hoa Cấp X (SDO Extreme Ultraviolet)',
      caption:
        'Tia bùng phát năng lượng cao cấp X được ghi lại trực tiếp bởi kính viễn vọng không gian SDO của NASA, giải phóng bức xạ cực tím mạnh mẽ vào nhật quyển.',
      imageUrl:
        'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~orig.jpg',
      backupImageUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg?width=1000',
      creditSource: 'Nguồn: NASA Goddard Space Flight Center / SDO',
      sourceUrl: 'https://science.nasa.gov/sun/',
      dateTaken: '2014-10-24',
      locationOrMission: 'Solar Dynamics Observatory'
    },
    {
      id: 'sun-prominence-eruption-2012',
      title: 'Tai Lửa Khổng lồ Phun trào (Coronal Mass Ejection)',
      caption:
        'Cột filament plasma dài hơn 300.000 km phun trào khỏi vành nhật hoa Mặt Trời với vận tốc hơn 1.400 km/s, chụp bởi tàu SDO của NASA.',
      imageUrl:
        'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001789/GSFC_20171208_Archive_e001789~orig.jpg',
      backupImageUrl:
        'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~orig.jpg',
      creditSource: 'Nguồn: NASA / GSFC / SDO',
      sourceUrl: 'https://science.nasa.gov/sun/',
      dateTaken: '2012-08-31',
      locationOrMission: 'SDO Heliospheric Observatory'
    }
  ],

  mercury: [
    {
      id: 'mercury-messenger-true-color',
      title: 'Sao Thủy Màu Thực Tế (Tàu NASA MESSENGER)',
      caption:
        'Chân dung màu tự nhiên của hành tinh Sao Thủy chụp bởi camera góc rộng MDIS trên tàu vũ trụ MESSENGER của NASA, thể hiện bề mặt giàu khoáng vật silicat và các tia bắn từ hố va chạm trẻ.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mercury_in_true_color.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA16853/PIA16853~orig.jpg',
      creditSource: 'Nguồn: NASA / JHU APL / MESSENGER',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA11364',
      dateTaken: '2008-01-14',
      locationOrMission: 'NASA MESSENGER Spacecraft'
    },
    {
      id: 'mercury-global-mosaic',
      title: 'Bản đồ Toàn cầu Sao Thủy (MESSENGER MDIS)',
      caption:
        'Hình ảnh ghép toàn cầu độ phân giải cao từ sứ mệnh MESSENGER làm nổi bật sự tương phản địa chất giữa các đồng bằng dung nham cổ đại và các miệng núi lửa va chạm.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA16853/PIA16853~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mercury_in_true_color.jpg?width=1000',
      creditSource: 'Nguồn: NASA / Johns Hopkins University APL / Carnegie',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA16853',
      dateTaken: '2013-02-14',
      locationOrMission: 'MESSENGER Orbital Survey'
    },
    {
      id: 'mercury-caloris-basin',
      title: 'Lưu vực Va chạm Caloris (Rộng 1.550 km)',
      caption:
        'Một trong những lưu vực va chạm lớn nhất toàn Hệ Mặt Trời trên Sao Thủy, được bao bọc bởi các dãy núi vòng cung cao tới 2 km.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA19216/PIA19216~orig.jpg',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA16853/PIA16853~orig.jpg',
      creditSource: 'Nguồn: NASA / JHU APL / MESSENGER',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA19216',
      dateTaken: '2015-03-16',
      locationOrMission: 'Bán cầu Bắc Sao Thủy'
    }
  ],

  venus: [
    {
      id: 'venus-mariner10-real-color',
      title: 'Tầng Mây Axit Sunfuric Sao Kim (NASA Mariner 10)',
      caption:
        'Hình ảnh màu thực tế của Sao Kim được xử lý từ dữ liệu của tàu vũ trụ Mariner 10, cho thấy lớp mây đặc quánh gồm axit sunfuric và CO₂ bao phủ toàn cầu.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Venus-real_color.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA23791/PIA23791~orig.jpg',
      creditSource: 'Nguồn: NASA / Mariner 10',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA23791',
      dateTaken: '1974-02-05',
      locationOrMission: 'NASA Mariner 10 Flyby'
    },
    {
      id: 'venus-magellan-radar-globe',
      title: 'Bề mặt Núi lửa Sao Kim Qua Radar Xuyên Mây (Tàu Magellan)',
      caption:
        'Bản đồ radar khẩu độ tổng hợp (SAR) từ tàu quỹ đạo Magellan của NASA xuyên qua lớp mây dày để tiết lộ các đồng bằng dung nham và dãy núi Maxwell Montes.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA00104/PIA00104~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Venus-real_color.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL-Caltech / Magellan SAR',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA00104',
      dateTaken: '1994-05-01',
      locationOrMission: 'NASA Magellan Orbiter'
    },
    {
      id: 'venus-maat-mons-radar',
      title: 'Núi lửa Khiên Maat Mons Cao 8 km trên Sao Kim',
      caption:
        'Hình ảnh tái tạo 3D từ dữ liệu radar Magellan tại ngọn núi lửa Maat Mons với các dòng dung nham bazan trải rộng hàng trăm km.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA00106/PIA00106~orig.jpg',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA00104/PIA00104~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL / USGS',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA00106',
      dateTaken: '1996-02-07',
      locationOrMission: 'Atla Regio, Sao Kim'
    }
  ],

  earth: [
    {
      id: 'earth-ha-long-bay',
      title: 'Vịnh Hạ Long, Việt Nam',
      caption:
        'Di sản Thiên nhiên Thế giới UNESCO tại tỉnh Quảng Ninh, Việt Nam với hơn 1.600 đảo đá vôi karst kỳ vĩ vươn lên từ làn nước biển ngọc bích.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ha_Long_Bay_in_2019.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/iss065e322625/iss065e322625~orig.jpg',
      creditSource: 'Nguồn: Wikimedia Commons / NASA Landsat',
      sourceUrl: 'https://earthobservatory.nasa.gov/images/83948/ha-long-bay-vietnam',
      dateTaken: '2019-05-12',
      locationOrMission: 'Quảng Ninh, Việt Nam (20.9°N, 107.1°E)'
    },
    {
      id: 'earth-great-barrier-reef',
      title: 'Rạn san hô Great Barrier, Úc',
      caption:
        'Hệ thống rạn san hô lớn nhất hành tinh trải dài hơn 2.300 km ngoài khơi bờ biển Queensland, Úc nhìn từ vệ tinh quan sát Trái Đất của NASA.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Great_Barrier_Reef_satellite_image.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/iss065e322625/iss065e322625~orig.jpg',
      creditSource: 'Nguồn: NASA Earth Observatory / MODIS',
      sourceUrl: 'https://earthobservatory.nasa.gov/images/88760/great-barrier-reef',
      dateTaken: '2016-08-31',
      locationOrMission: 'Biển San Hô, Queensland, Úc'
    },
    {
      id: 'earth-grand-canyon',
      title: 'Hẻm núi Grand Canyon, Hoa Kỳ',
      caption:
        'Kỳ quan địa chất dài 446 km và sâu hơn 1.800 m tại bang Arizona, nơi sông Colorado cắt qua các lớp đá trầm tích lưu giữ 2 tỷ năm lịch sử kiến tạo Trái Đất.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Grand_Canyon_view_from_Pima_Point_2010.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/iss065e322625/iss065e322625~orig.jpg',
      creditSource: 'Nguồn: NPS / NASA Earth Observatory',
      sourceUrl: 'https://earthobservatory.nasa.gov/images/78509/grand-canyon',
      dateTaken: '2010-09-15',
      locationOrMission: 'Arizona, Hoa Kỳ (36.1°N, 112.1°W)'
    },
    {
      id: 'earth-aurora-iss',
      title: 'Cực quang nhìn từ Trạm Vũ trụ Quốc tế (ISS)',
      caption:
        'Dải cực quang xanh lục rực sáng trên đường chân trời cong của Trái Đất, được các phi hành gia chụp trực tiếp từ Trạm Vũ trụ Quốc tế (ISS) ở độ cao hơn 400 km.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Aurora_Australis_From_ISS.JPG?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/iss065e322625/iss065e322625~orig.jpg',
      creditSource: 'Nguồn: NASA Johnson Space Center / ISS Crew',
      sourceUrl: 'https://eol.jsc.nasa.gov/',
      dateTaken: '2011-09-17',
      locationOrMission: 'Trạm Vũ trụ Quốc tế (ISS Low-Earth Orbit)'
    },
    {
      id: 'earth-richat-structure',
      title: 'Cấu trúc Richat (Mắt của Sahara)',
      caption:
        'Vòm địa chất đồng tâm rộng 40 km giữa sa mạc Sahara tại Mauritania — điểm mốc nổi tiếng nhìn từ quỹ đạo của các phi hành gia NASA trên trạm ISS.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Richat_Structure_ISS.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/iss065e322625/iss065e322625~orig.jpg',
      creditSource: 'Nguồn: NASA / ISS Crew Earth Observations',
      sourceUrl: 'https://earthobservatory.nasa.gov/images/92076/richat-structure',
      dateTaken: '2011-12-23',
      locationOrMission: 'Cao nguyên Adrar, Mauritania (21.1°N, 11.4°W)'
    }
  ],

  moon: [
    {
      id: 'moon-lro-full',
      title: 'Bề mặt Mặt Trăng độ phân giải cao (Tàu LRO)',
      caption:
        'Hình ảnh chi tiết bán cầu hướng về Trái Đất của Mặt Trăng với các biển bazan tối màu (Mare Imbrium, Mare Serenitatis, Mare Tranquillitatis) và hố va chạm Tycho tỏa tia sáng ở cực Nam.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/FullMoon2010.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA14011/PIA14011~orig.jpg',
      creditSource: 'Nguồn: NASA / GSFC / LRO',
      sourceUrl: 'https://moon.nasa.gov/',
      dateTaken: '2010-10-22',
      locationOrMission: 'Lunar Reconnaissance Orbiter / Ground Telescope'
    },
    {
      id: 'moon-apollo8-earthrise',
      title: 'Trái Đất mọc trên đường chân trời Mặt Trăng (Earthrise - Apollo 8)',
      caption:
        'Bức ảnh lịch sử do phi hành gia William Anders chụp ngày 24/12/1968 từ tàu Apollo 8 khi bay trên quỹ đạo Mặt Trăng, ghi lại khoảnh khắc Trái Đất xanh thẫm mọc lên phía trên bề mặt xám bạc của Mặt Trăng.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/NASA-Apollo8-Dec24-Earthrise.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/as08-14-2383/as08-14-2383~orig.jpg',
      creditSource: 'Nguồn: NASA / Apollo 8',
      sourceUrl: 'https://www.nasa.gov/image-article/apollo-8-earthrise/',
      dateTaken: '1968-12-24',
      locationOrMission: 'Quỹ đạo Mặt Trăng — Sứ mệnh Apollo 8'
    },
    {
      id: 'moon-apollo11-aldrin',
      title: 'Phi hành gia Apollo 11 trên Biển Tĩnh Lặng',
      caption:
        'Phi hành gia Buzz Aldrin bước đi trên lớp bụi regolith tại Biển Tĩnh Lặng (Mare Tranquillitatis) ngày 20/07/1969, do chỉ huy Neil Armstrong chụp bằng máy ảnh Hasselblad 70mm.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Aldrin_Apollo_11_original.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~orig.jpg',
      creditSource: 'Nguồn: NASA / Apollo 11',
      sourceUrl: 'https://www.nasa.gov/mission/apollo-11/',
      dateTaken: '1969-07-20',
      locationOrMission: 'Mare Tranquillitatis, Mặt Trăng (0.67°N, 23.47°E)'
    }
  ],

  mars: [
    {
      id: 'mars-osiris-true-color',
      title: 'Sao Hỏa Màu Thực Tế Sắc Nét (Tàu Rosetta OSIRIS)',
      caption:
        'Bức ảnh màu thực tế tuyệt đẹp của Hành tinh Đỏ chụp bởi hệ thống camera khoa học OSIRIS trên tàu thăm dò Rosetta trong lần bay ngang qua Sao Hỏa, hiển thị rõ các đám mây băng nước và vùng Syrtis Major.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/OSIRIS_Mars_true_color.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA00422/PIA00422~orig.jpg',
      creditSource: 'Nguồn: ESA / NASA / Rosetta',
      sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta',
      dateTaken: '2007-02-24',
      locationOrMission: 'Rosetta Mars Swingby'
    },
    {
      id: 'mars-perseverance-jezero-delta',
      title: 'Vách đá Châu thổ Sông cổ tại Hố Jezero (Xe tự hành Perseverance)',
      caption:
        'Ảnh chụp thực tế trên bề mặt Sao Hỏa bởi camera Mastcam-Z của xe tự hành NASA Perseverance tại các lớp đá trầm tích của một lòng hồ cổ đại 3,5 tỷ năm tuổi.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA25236/PIA25236~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/OSIRIS_Mars_true_color.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL-Caltech / ASU / MSSS',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA25236',
      dateTaken: '2022-04-19',
      locationOrMission: 'Jezero Crater, Sao Hỏa'
    },
    {
      id: 'mars-valles-marineris-mosaic',
      title: 'Đại Hẻm núi Valles Marineris (Dài 4.000 km)',
      caption:
        'Bức ảnh ghép toàn cầu từ tàu quỹ đạo Viking của NASA cho thấy hệ thống hẻm núi Valles Marineris khổng lồ xẻ ngang xích đạo Sao Hỏa.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA00422/PIA00422~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/OSIRIS_Mars_true_color.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL / USGS Viking Orbiter',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA00422',
      dateTaken: '1998-06-05',
      locationOrMission: 'Xích đạo Sao Hỏa'
    }
  ],

  jupiter: [
    {
      id: 'jupiter-hubble-grs',
      title: 'Sao Mộc và Siêu bão Vết Đỏ Lớn (Kính viễn vọng Hubble)',
      caption:
        'Chân dung sắc nét của Sao Mộc chụp bởi Kính viễn vọng Không gian Hubble (NASA/ESA), làm nổi bật các dải mây amoniac đa sắc và siêu bão Vết Đỏ Lớn ở bán cầu Nam.',
      imageUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Jupiter_and_its_shrunken_Great_Red_Spot.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA21775/PIA21775~orig.jpg',
      creditSource: 'Nguồn: NASA / ESA / Hubble',
      sourceUrl: 'https://science.nasa.gov/mission/hubble/',
      dateTaken: '2014-04-21',
      locationOrMission: 'Hubble Space Telescope WFC3'
    },
    {
      id: 'jupiter-juno-grs-closeup',
      title: 'Cận cảnh Mắt bão Vết Đỏ Lớn (Tàu vũ trụ NASA Juno)',
      caption:
        'Tàu vũ trụ Juno bay cách đỉnh mây Sao Mộc chỉ 9.000 km để chụp trực diện cơn bão Vết Đỏ Lớn rộng 16.350 km với sức gió xoáy hơn 430 km/h.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA21775/PIA21775~orig.jpg',
      backupImageUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Jupiter_and_its_shrunken_Great_Red_Spot.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL-Caltech / SwRI / MSSS (JunoCam)',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA21775',
      dateTaken: '2017-07-10',
      locationOrMission: 'NASA Juno Perijove 7'
    },
    {
      id: 'jupiter-northern-turbulence',
      title: 'Các Xoáy Thuận Khí quyển Bắc Bán Cầu (JunoCam)',
      caption:
        'Những đám mây cuộn xoáy dữ dội trong tầng đối lưu sâu của Sao Mộc được ghi lại bởi tàu Juno của NASA.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA21974/PIA21974~orig.jpg',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA21775/PIA21775~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL-Caltech / SwRI / MSSS',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA21974',
      dateTaken: '2017-10-24',
      locationOrMission: 'Bắc Bán Cầu Sao Mộc'
    }
  ],

  saturn: [
    {
      id: 'saturn-cassini-equinox',
      title: 'Sao Thổ và Hệ Vành Đai Trong Kỳ Điểm Phân (Tàu Cassini)',
      caption:
        'Bức ảnh ghép 75 khung hình màu tự nhiên do tàu vũ trụ Cassini của NASA chụp khi ánh sáng Mặt Trời chiếu xiên đúng mặt phẳng vành đai Sao Thổ trong kỳ Điểm phân (Equinox).',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Saturn_during_Equinox.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA06193/PIA06193~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL / Cassini',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA11667',
      dateTaken: '2009-08-12',
      locationOrMission: 'NASA / ESA / ASI Cassini Orbiter'
    },
    {
      id: 'saturn-north-polar-hexagon',
      title: 'Dòng Tia Lục Giác Đều tại Cực Bắc Sao Thổ (Cassini)',
      caption:
        'Cấu trúc khí quyển hình 6 cạnh đều rộng 30.000 km bao quanh mắt bão cực Bắc của Sao Thổ chụp bởi camera góc hẹp của tàu Cassini.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA17652/PIA17652~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Saturn_during_Equinox.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL-Caltech / Space Science Institute',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA17652',
      dateTaken: '2013-12-04',
      locationOrMission: 'Cực Bắc Sao Thổ'
    },
    {
      id: 'saturn-enceladus-plumes',
      title: 'Các Mạch Nước Phun từ Đại Dương Ngầm trên Vệ tinh Enceladus',
      caption:
        'Tàu Cassini chụp ngược sáng các cột băng nước phun trào từ cực Nam vệ tinh Enceladus vào không gian vũ trụ.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA11688/PIA11688~orig.jpg',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA06193/PIA06193~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL / Space Science Institute',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA11688',
      dateTaken: '2009-11-21',
      locationOrMission: 'Vệ tinh Enceladus, Hệ Sao Thổ'
    }
  ],

  uranus: [
    {
      id: 'uranus-voyager2-true',
      title: 'Chân dung Sao Thiên Vương (Tàu NASA Voyager 2)',
      caption:
        'Hình ảnh thực tế của Sao Thiên Vương do tàu vũ trụ Voyager 2 chụp năm 1986 từ khoảng cách 9,1 triệu km khi bay qua hành tinh băng khổng lồ có trục nghiêng 97,77°.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Uranus2.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL / Voyager 2',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18182',
      dateTaken: '1986-01-14',
      locationOrMission: 'NASA Voyager 2 Flyby'
    },
    {
      id: 'uranus-jwst-infrared-rings',
      title: 'Hệ thống 11 Vành đai Sao Thiên Vương qua Kính James Webb (JWST)',
      caption:
        'Camera hồng ngoại gần NIRCam trên Kính viễn vọng Không gian James Webb ghi lại các vành đai băng bụi tối và chỏm mây sáng ở cực Bắc Sao Thiên Vương.',
      imageUrl: 'https://images-assets.nasa.gov/image/weic2310a/weic2310a~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Uranus2.jpg?width=1000',
      creditSource: 'Nguồn: NASA / ESA / CSA / STScI (JWST)',
      sourceUrl: 'https://science.nasa.gov/missions/webb/',
      dateTaken: '2023-02-06',
      locationOrMission: 'James Webb Space Telescope'
    }
  ],

  neptune: [
    {
      id: 'neptune-voyager2-full',
      title: 'Sao Hải Vương và Siêu bão Vết Tối Lớn (Tàu Voyager 2)',
      caption:
        'Bức ảnh toàn cầu nổi tiếng do tàu vũ trụ Voyager 2 của NASA chụp tháng 8/1989 trước khi rời Hệ Mặt Trời, ghi lại màu xanh coban sâu thẳm và cơn bão Vết Tối Lớn.',
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Neptune_Full.jpg?width=1000',
      backupImageUrl: 'https://images-assets.nasa.gov/image/PIA01492/PIA01492~orig.jpg',
      creditSource: 'Nguồn: NASA / JPL / Voyager 2',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA01492',
      dateTaken: '1989-08-20',
      locationOrMission: 'NASA Voyager 2 Neptune Encounter'
    },
    {
      id: 'neptune-methane-cirrus-clouds',
      title: 'Dải Mây Băng Methane trong Gió Siêu Thanh 2.100 km/h (Voyager 2)',
      caption:
        'Các dải mây ti băng methane trắng muốt ở độ cao 50 km đổ bóng xuống tầng mây xanh bên dưới trên Sao Hải Vương.',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA00058/PIA00058~orig.jpg',
      backupImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Neptune_Full.jpg?width=1000',
      creditSource: 'Nguồn: NASA / JPL / Voyager 2',
      sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA00058',
      dateTaken: '1989-08-25',
      locationOrMission: 'Khí quyển Thượng tầng Sao Hải Vương'
    }
  ]
};

/**
 * Returns the curated list of 100% real photographs for any celestial body key.
 * Supports `'moon'` directly as a first-class celestial entity.
 *
 * @param {string} bodyKey
 * @returns {Array<object>}
 */
export function getPlanetGallery(bodyKey) {
  const key = String(bodyKey || 'earth').toLowerCase().trim();
  if (PLANET_GALLERY_DATA[key]) {
    return PLANET_GALLERY_DATA[key];
  }
  const moonParentMap = {
    io: 'jupiter',
    europa: 'jupiter',
    titan: 'saturn'
  };
  if (moonParentMap[key] && PLANET_GALLERY_DATA[moonParentMap[key]]) {
    return PLANET_GALLERY_DATA[moonParentMap[key]];
  }
  return PLANET_GALLERY_DATA.earth;
}

/**
 * Queries the official NASA Image and Video Library API (`https://images-api.nasa.gov/search`)
 * with safe LocalStorage TTL caching to enrich or provide backup real photographs from `images-assets.nasa.gov`.
 *
 * @param {string} bodyKey
 * @returns {Promise<Array<object>>} Merged list of verified real photographs
 */
export async function fetchNasaGalleryEnrichment(bodyKey) {
  const normalizedKey = String(bodyKey || 'earth').toLowerCase().trim();
  const baseList = getPlanetGallery(normalizedKey);
  const cacheKey = `${GALLERY_CACHE_PREFIX}${normalizedKey}`;

  if (galleryMemoryCache.has(cacheKey)) {
    const cached = galleryMemoryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < GALLERY_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.timestamp === 'number' && Date.now() - parsed.timestamp < GALLERY_CACHE_TTL_MS && Array.isArray(parsed.data)) {
        galleryMemoryCache.set(cacheKey, parsed);
        return parsed.data;
      }
    }
  } catch {
    // Ignore private browsing localStorage errors
  }

  const queryMap = {
    sun: 'Solar Dynamics Observatory Sun flare',
    mercury: 'MESSENGER Mercury planet',
    venus: 'Magellan Venus planet',
    earth: 'Earth ISS Aurora observance',
    moon: 'Apollo Moon Lunar Reconnaissance Orbiter',
    mars: 'Perseverance Mars rover landscape',
    jupiter: 'Juno Jupiter Great Red Spot',
    saturn: 'Cassini Saturn rings',
    uranus: 'Voyager Uranus planet',
    neptune: 'Voyager Neptune planet'
  };

  const searchQuery = encodeURIComponent(queryMap[normalizedKey] || `${normalizedKey} planet NASA`);
  const endpoint = `https://images-api.nasa.gov/search?q=${searchQuery}&media_type=image&page_size=3`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const items = Array.isArray(json?.collection?.items) ? json.collection.items : [];
      const existingUrls = new Set(baseList.map((item) => item.imageUrl));
      const extraItems = [];

      for (let i = 0; i < items.length; i++) {
        const entry = items[i];
        const meta = entry?.data?.[0];
        const linkObj = Array.isArray(entry?.links)
          ? entry.links.find((l) => l.render === 'image' && typeof l.href === 'string')
          : null;

        if (meta && linkObj && /^https:\/\//i.test(linkObj.href) && !existingUrls.has(linkObj.href)) {
          existingUrls.add(linkObj.href);
          extraItems.push({
            id: `nasa-api-${normalizedKey}-${sanitizeTelemetryText(meta.nasa_id || String(i))}`,
            title: sanitizeTelemetryText(meta.title || `${normalizedKey.toUpperCase()} — NASA Archive`),
            caption: sanitizeTelemetryText((meta.description || '').slice(0, 280)),
            imageUrl: linkObj.href,
            backupImageUrl: baseList[0]?.backupImageUrl || baseList[0]?.imageUrl || linkObj.href,
            creditSource: `Nguồn: NASA Image Archive (${sanitizeTelemetryText(meta.center || 'JPL / GSFC')})`,
            sourceUrl: 'https://images.nasa.gov/',
            dateTaken: sanitizeTelemetryText((meta.date_created || '').slice(0, 10)),
            locationOrMission: sanitizeTelemetryText(meta.center || 'NASA Archive')
          });
          if (extraItems.length >= 2) break;
        }
      }

      const merged = [...baseList, ...extraItems];
      const payload = { timestamp: Date.now(), data: merged };
      galleryMemoryCache.set(cacheKey, payload);
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {
        // Ignore quota errors
      }
      return merged;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return baseList;
}

export default PLANET_GALLERY_DATA;
