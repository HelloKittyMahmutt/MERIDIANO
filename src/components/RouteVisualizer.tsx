import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { MapPin, Navigation, Compass, Layers } from 'lucide-react';

interface RouteVisualizerProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const RouteVisualizer: React.FC<RouteVisualizerProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const [activeHub, setActiveHub] = useState<'china' | 'meridiano' | 'europe'>('meridiano');
  const t = translations[currentLang];

  const hubsData = {
    china: {
      title: currentLang === 'bg' ? 'Китай · Производствен център' : 'China · Manufacturing Center',
      coords: '29.8683° N, 121.5440° E',
      role: currentLang === 'bg' ? 'Основен sourcing пазар' : 'Primary sourcing market',
      desc: currentLang === 'bg'
        ? 'Индустриални центрове за машиностроене, агротехника, компоненти и прецизно производство в провинциите Джъдзян, Дзянсу, Гуандун и Шандун.'
        : 'Industrial centers for machinery, agricultural equipment, precision components, and OEM fabrication across Zhejiang, Jiangsu, Guangdong, and Shandong.',
    },
    meridiano: {
      title: 'MERIDIANO EOOD · Krumovgrad, Bulgaria',
      coords: '41.4414° N, 25.6542° E',
      role: currentLang === 'bg' ? 'Централен търговски координатор' : 'Central procurement coordinator',
      desc: currentLang === 'bg'
        ? 'Свързваме българския и европейския бизнес с проверени китайски производители. Управляваме договарянето, спецификациите, контрола на качеството и логистичната верига.'
        : 'Connecting Bulgarian and European business with verified Chinese factories. Managing commercial negotiation, technical specifications, QC inspections, and maritime transit.',
    },
    europe: {
      title: currentLang === 'bg' ? 'България & Европа · Крайна дестинация' : 'Bulgaria & Europe · Final Destination',
      coords: '42.6977° N, 23.3219° E',
      role: currentLang === 'bg' ? 'Клиентски пазар' : 'Customer market',
      desc: currentLang === 'bg'
        ? 'Доставка на готовата и проверена продукция директно до вашия склад, фабрика или строителен обект в България и ЕС.'
        : 'Delivering inspected, verified equipment and products directly to your warehouse, plant, or project site across Bulgaria and the European Union.',
    },
  };

  return (
    <section className="py-20 bg-[#070B14] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-slate-300" />
              <span>{currentLang === 'bg' ? 'ГЕОГРАФИЯ НА СНАБДЯВАНЕТО' : 'GEOGRAPHY OF SOURCING'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              {currentLang === 'bg' ? 'Търговският коридор: Китай → Европа' : 'The Sourcing Corridor: China → Europe'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-3 md:mt-0 tracking-wider">
            {currentLang === 'bg' ? 'КООРДИНИРАН ОТ MERIDIANO' : 'COORDINATED BY MERIDIANO'}
          </p>
        </div>

        {/* Sophisticated Map & Corridor Box */}
        <div className="steel-panel p-6 sm:p-10 rounded-sm relative overflow-hidden border border-slate-800 shadow-2xl">
          {/* Subtle Meridian Lines SVG Backdrop */}
          <div className="relative w-full h-80 sm:h-96 rounded-sm bg-[#0A0F1D] border border-slate-800/90 overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 1000 480"
              className="w-full h-full object-cover"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Latitude & Longitude Meridian Grid Lines */}
              <defs>
                <linearGradient id="routeGradient" x1="820" y1="260" x2="340" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#E2E8F0" stopOpacity="1" />
                  <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.9" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Meridian Curvature Grid */}
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
                <path
                  key={`meridian-${x}`}
                  d={`M ${x} 0 Q ${x + 20} 240 ${x} 480`}
                  stroke="#1E293B"
                  strokeWidth="0.8"
                  strokeDasharray="3 4"
                  fill="none"
                />
              ))}

              {[80, 160, 240, 320, 400].map((y) => (
                <line
                  key={`lat-${y}`}
                  x1="0"
                  y1={y}
                  x2="1000"
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="0.8"
                  strokeDasharray="2 4"
                />
              ))}

              {/* Stylized Continents / Landmass Outlines (Eurasian & Maritime Corridor) */}
              {/* Europe & Balkans Area */}
              <path
                d="M 280 130 Q 340 120 380 140 T 420 190 Q 370 230 330 220 T 270 190 Z"
                fill="#131B2E"
                stroke="#334155"
                strokeWidth="1"
              />
              {/* Central Asia Step */}
              <path
                d="M 440 160 Q 560 140 650 170 T 700 240 Q 590 270 480 230 Z"
                fill="#101726"
                stroke="#1E293B"
                strokeWidth="0.8"
              />
              {/* China & Coastal Manufacturing Belt */}
              <path
                d="M 700 180 Q 820 160 880 220 T 890 320 Q 800 350 720 300 T 680 220 Z"
                fill="#141E34"
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* Main Meridian Trade Route Arc: Ningbo/Shanghai (830, 240) -> Krumovgrad/Sofia (360, 185) */}
              <path
                d="M 830 250 Q 580 90 360 185"
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                filter="url(#glow)"
              />

              {/* Maritime Alternative Arc: South China Sea -> Suez -> Mediterranean/Black Sea */}
              <path
                d="M 830 270 Q 640 400 370 210"
                fill="none"
                stroke="#475569"
                strokeWidth="1.2"
                strokeDasharray="3 5"
                strokeOpacity="0.6"
              />

              {/* Node 1: China (Ningbo / Shanghai / Shenzhen) */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveHub('china')}
              >
                <circle cx="830" cy="250" r="14" fill="#94A3B8" fillOpacity="0.2" />
                <circle cx="830" cy="250" r="7" fill="#E2E8F0" />
                <circle cx="830" cy="250" r="2.5" fill="#0F172A" />
                <text x="830" y="285" textAnchor="middle" fill="#CBD5E1" fontSize="11" fontWeight="700" letterSpacing="1">
                  CHINA (ORIGIN)
                </text>
                <text x="830" y="300" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                  NINGBO / SHENZHEN
                </text>
              </g>

              {/* Node 2: Central Hub: MERIDIANO (Krumovgrad / Bulgaria) */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveHub('meridiano')}
              >
                <circle cx="480" cy="140" r="16" fill="#CBD5E1" fillOpacity="0.25" />
                <circle cx="480" cy="140" r="8" fill="#FFFFFF" />
                <circle cx="480" cy="140" r="3" fill="#0B132B" />
                <text x="480" y="115" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800" letterSpacing="1.2">
                  MERIDIANO
                </text>
                <text x="480" y="130" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                  COORDINATION BRIDGE
                </text>
              </g>

              {/* Node 3: Europe / Bulgaria Destination */}
              <g
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setActiveHub('europe')}
              >
                <circle cx="360" cy="185" r="14" fill="#94A3B8" fillOpacity="0.2" />
                <circle cx="360" cy="185" r="7" fill="#CBD5E1" />
                <circle cx="360" cy="185" r="2.5" fill="#0F172A" />
                <text x="360" y="215" textAnchor="middle" fill="#CBD5E1" fontSize="11" fontWeight="700" letterSpacing="1">
                  BULGARIA / EUROPE
                </text>
                <text x="360" y="230" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                  FINAL DESTINATION
                </text>
              </g>
            </svg>
          </div>

          {/* Hub Data Selector & Detail View */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setActiveHub('china')}
              className={`p-4 rounded-sm text-left transition-all border ${
                activeHub === 'china'
                  ? 'bg-slate-800/90 border-slate-400/80 shadow-md'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-slate-300">HUB 01 · SOURCING</span>
                <span className="text-[10px] text-slate-300 font-mono">CHINA</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">
                {currentLang === 'bg' ? 'Китайски фабрики' : 'Chinese Factories'}
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                {hubsData.china.desc}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveHub('meridiano')}
              className={`p-4 rounded-sm text-left transition-all border ${
                activeHub === 'meridiano'
                  ? 'bg-slate-800/90 border-slate-400/80 shadow-md'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-slate-300">CENTRAL BRIDGE</span>
                <span className="text-[10px] text-slate-300 font-mono">MERIDIANO</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">
                MERIDIANO EOOD
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                {hubsData.meridiano.desc}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveHub('europe')}
              className={`p-4 rounded-sm text-left transition-all border ${
                activeHub === 'europe'
                  ? 'bg-slate-800/90 border-slate-400/80 shadow-md'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono text-slate-300">HUB 02 · CLIENT</span>
                <span className="text-[10px] text-slate-300 font-mono">EUROPE</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">
                {currentLang === 'bg' ? 'България & Европа' : 'Bulgaria & Europe'}
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                {hubsData.europe.desc}
              </p>
            </button>
          </div>

          {/* Active Hub Detailed Drawer Banner */}
          <div className="mt-6 p-4 rounded bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded bg-slate-800 text-slate-200 mt-1 sm:mt-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{hubsData[activeHub].title}</h4>
                  <span className="text-[11px] font-mono text-slate-400">[{hubsData[activeHub].coords}]</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{hubsData[activeHub].desc}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenQuote}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm shrink-0 whitespace-nowrap"
            >
              {t.primaryCta}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
