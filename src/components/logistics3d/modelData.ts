export interface Model3DSpec {
  id: string;
  nameEn: string;
  nameBg: string;
  categoryEn: string;
  categoryBg: string;
  modelPath: string;
  scaleMultiplier: number;
  rotationOffset: [number, number, number]; // Radians [x, y, z]
  positionOffset: [number, number, number]; // [x, y, z]
  specs: {
    labelBg: string;
    labelEn: string;
    value: string;
  }[];
  descriptionBg: string;
  descriptionEn: string;
  meridianoRoleBg: string;
  meridianoRoleEn: string;
}

export const MODELS_DATA: Model3DSpec[] = [
  {
    id: 'forklift',
    nameEn: 'Industrial Forklift 3.5T',
    nameBg: 'Индустриален мотокар 3.5T',
    categoryEn: 'Factory & Terminal Handling',
    categoryBg: 'Заводско и терминално товарене',
    modelPath: '/models/forklift.glb',
    scaleMultiplier: 0.045,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Товароподемност', labelEn: 'Rated Capacity', value: '3,500 kg (3.5 t)' },
      { labelBg: 'Височина на мачтата', labelEn: 'Lift Height', value: '4.80 m (Triplex)' },
      { labelBg: 'Задвижване', labelEn: 'Powertrain', value: 'Heavy-Duty Diesel / Li-Ion' },
      { labelBg: 'Гуми', labelEn: 'Tires', value: 'Pneumatic all-terrain industrial' },
      { labelBg: 'Оборудване', labelEn: 'Attachment', value: 'Side-shifter & ISO fork positioner' },
    ],
    descriptionBg: 'Специализиран тежкотоварен мотокар за маневриране и товарене на фабрични палети и контейнери на терминалните рампи в Нинбо и Иу.',
    descriptionEn: 'Heavy-duty pneumatic tire forklift engineered for rapid factory ramp loading and container stuffing in Ningbo and Yiwu.',
    meridianoRoleBg: 'Начална точка: Инспекция на фабричната площадка и сигурно товарене преди запечатване.',
    meridianoRoleEn: 'Origin checkpoint: On-site factory loading inspection and cargo securement prior to bolt seal.'
  },
  {
    id: 'container',
    nameEn: '40ft High Cube ISO Container',
    nameBg: '40ft High Cube Морски контейнер',
    categoryEn: 'Intermodal Freight Unit',
    categoryBg: 'Интермодална товарна единица',
    modelPath: '/models/container.glb',
    scaleMultiplier: 0.05,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Полезен обем', labelEn: 'Internal Volume', value: '76.4 m³ (2,700 cu ft)' },
      { labelBg: 'Макс. полезен товар', labelEn: 'Max Payload', value: '28,600 kg' },
      { labelBg: 'Собствено тегло (Tara)', labelEn: 'Tare Weight', value: '3,900 kg' },
      { labelBg: 'Размери (Д×Ш×В)', labelEn: 'Dimensions (L×W×H)', value: '12.19m × 2.44m × 2.89m' },
      { labelBg: 'Пломба и Сигурност', labelEn: 'Security Seal', value: 'ISO 17712 High-Security Bolt' },
    ],
    descriptionBg: 'Глобален стандарт за морски и комбиниран превоз с повишена височина (+30 cm спрямо стандартен 40ft), идеален за обемни палетизирани пратки.',
    descriptionEn: 'Intermodal high-cube freight container offering 30cm extra vertical clearance, optimized for high-volume palletized factory exports.',
    meridianoRoleBg: 'Защита на стоката: Водонепроницаема стоманена Corten конструкция с уникален сериен номер и пломба Meridiano.',
    meridianoRoleEn: 'Cargo protection: Weatherproof Corten steel construction tracking under dedicated Meridiano bill of lading.'
  },
  {
    id: 'truck',
    nameEn: 'MAN TGX V8 Semi-Truck',
    nameBg: 'MAN TGX V8 Тежкотоварен влекач',
    categoryEn: 'Overland Highway Haulage',
    categoryBg: 'Сухопътен магистрален транспорт',
    modelPath: '/models/truck.glb',
    scaleMultiplier: 0.038,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Мощност на двигателя', labelEn: 'Engine Output', value: '680 HP (500 kW) V8' },
      { labelBg: 'Макс. бруто тегло', labelEn: 'Gross Combination Weight', value: '44,000 kg' },
      { labelBg: 'Трансмисия', labelEn: 'Transmission', value: '12-Speed TipMatic automated' },
      { labelBg: 'Еко стандарт', labelEn: 'Emissions Standard', value: 'Euro 6 / China VI' },
      { labelBg: 'Телеметрия', labelEn: 'Tracking Telemetry', value: 'Live 4G GPS, OBD-II Speed/Fuel' },
    ],
    descriptionBg: 'Флагмански тежкотоварен влекач за високоскоростни контейнерни трансфери по крайбрежните магистрали между индустриалните зони и пристанищата.',
    descriptionEn: 'Flagship long-haul prime mover executing express container transport on coastal expressways between factories and deep-water ports.',
    meridianoRoleBg: 'Първа и последна миля: Точно спазване на тайминга за влизане в пристанищния терминал без престой.',
    meridianoRoleEn: 'First & last mile: Pinpoint delivery scheduling to port gates avoiding demurrage fees.'
  },
  {
    id: 'chassis',
    nameEn: '40ft Skeletal Container Chassis',
    nameBg: '40ft Скелетно полуремарке / шаси',
    categoryEn: 'Heavy Trailer Coupling',
    categoryBg: 'Тежкотоварно ремарке / шаси',
    modelPath: '/models/chassis.glb',
    scaleMultiplier: 0.65,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Конфигурация на оси', labelEn: 'Axle Configuration', value: '3-Axle Tri-Axle Air Ride' },
      { labelBg: 'Товароносимост', labelEn: 'Carrying Capacity', value: '34,000 kg' },
      { labelBg: 'Заключване', labelEn: 'Locking System', value: '4× Forged Twistlocks' },
      { labelBg: 'Спирачна система', labelEn: 'Braking System', value: 'Dual line EBS with Roll Stability' },
      { labelBg: 'Материал', labelEn: 'Chassis Material', value: 'High-tensile structural steel Q345' },
    ],
    descriptionBg: 'Олекотено стоманено скелетно полуремарке с интегрирани туистлокове за стабилно и безопасно фиксиране на 40-футови контейнери при всякакви пътни условия.',
    descriptionEn: 'High-tensile skeletal container trailer equipped with heavy-duty twistlocks, delivering maximum stability and road safety.',
    meridianoRoleBg: 'Здрава свръзка: Механично фиксиране на контейнера Meridiano върху влекача за сигурно пътуване.',
    meridianoRoleEn: 'Secure bond: Rock-solid intermodal coupling locking the container to the road fleet.'
  },
  {
    id: 'container-ship',
    nameEn: 'Deep Sea Container Vessel',
    nameBg: 'Океански контейнеровоз',
    categoryEn: 'Maritime Ocean Freight',
    categoryBg: 'Морски превоз на товари',
    modelPath: '/models/container-ship.glb',
    scaleMultiplier: 0.12,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Капацитет (TEU)', labelEn: 'Nominal Capacity', value: '14,500 - 20,000 TEU' },
      { labelBg: 'Дължина (LOA)', labelEn: 'Length Overall', value: '366 - 400 m' },
      { labelBg: 'Крейсерска скорост', labelEn: 'Cruising Speed', value: '19 - 22 Knots (~40 km/h)' },
      { labelBg: 'Транзитно време', labelEn: 'Transit Time', value: '28 - 34 дни (Китай -> Черно Море)' },
      { labelBg: 'Навигация', labelEn: 'Navigational Route', value: 'Ningbo/Shanghai -> Suez -> Варна/Бургас' },
    ],
    descriptionBg: 'Огромен океански кораб за междуконтинентален транспорт, пренасящ хиляди запечатани контейнери през Малакския проток, Суецкия канал и Средиземно море към България.',
    descriptionEn: 'Mega container carrier bridging East Asia and Europe through the Malacca Strait and Suez Canal directly to Black Sea terminals.',
    meridianoRoleBg: 'Главен транспортен коридор: Оптимална себестойност на кубичен метър с резервирани квоти при COSCO, Maersk и Evergreen.',
    meridianoRoleEn: 'Core trade corridor: Best-in-class shipping cost per CBM with guaranteed vessel space allocations.'
  },
  {
    id: 'cargo-plane',
    nameEn: 'Intercontinental Cargo Jet',
    nameBg: 'Товарен самолет за експресен карго транспорт',
    categoryEn: 'Express Air Freight',
    categoryBg: 'Въздушен експресен карго транспорт',
    modelPath: '/models/cargo-plane.glb',
    scaleMultiplier: 0.0035,
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0, 0],
    specs: [
      { labelBg: 'Товароносимост', labelEn: 'Max Net Payload', value: '104,000 kg (104 t)' },
      { labelBg: 'Крейсерска скорост', labelEn: 'Cruise Speed', value: 'Mach 0.84 (~910 km/h)' },
      { labelBg: 'Крейсерска височина', labelEn: 'Cruising Altitude', value: '35,000 - 41,000 ft' },
      { labelBg: 'Транзитно време', labelEn: 'Transit Time', value: '3 - 6 Дни (Експрес врата-до-врата)' },
      { labelBg: 'Карго дек', labelEn: 'Cargo Volume', value: '650 m³ (Main & Lower Decks)' },
    ],
    descriptionBg: 'Дългомагистрален товарен авиолайнер за спешни фабрични мостри, компоненти с висока стойност, електроника и експресни пратки.',
    descriptionEn: 'Widebody intercontinental freighter built for expedited cargo, high-value components, urgent machinery spares, and electronics.',
    meridianoRoleBg: 'Скоростен коридор: Директен карго чартър и редовни авиолинии за пратки, изискващи доставка за броени дни.',
    meridianoRoleEn: 'Expedited corridor: Direct air cargo routes for time-critical components and priority shipments.'
  }
];
