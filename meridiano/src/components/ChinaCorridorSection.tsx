import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { 
  Ship, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  Boxes, 
  Truck, 
  FileText,
  Search,
  Handshake,
  Layers
} from 'lucide-react';

interface ChinaCorridorSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const ChinaCorridorSection: React.FC<ChinaCorridorSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const [activeMilestone, setActiveMilestone] = useState<number>(0);
  const [shipPosition, setShipPosition] = useState<number>(15);

  const milestones = [
    {
      id: 'supplier',
      name: currentLang === 'bg' ? 'Доставчик' : 'Supplier',
      icon: Search,
      tag: '01 · Одит',
      desc: currentLang === 'bg'
        ? 'Проверка на завода на място в Нинбо/Шанхай.'
        : 'On-site factory verification in Ningbo/Shanghai.',
      coord: '29°53\'N 121°32\'E',
      percent: 15,
    },
    {
      id: 'quote',
      name: currentLang === 'bg' ? 'Оферти' : 'Offers',
      icon: Handshake,
      tag: '02 · Договаряне',
      desc: currentLang === 'bg'
        ? 'Договаряне на чиста фабрична цена без прекупвачи.'
        : 'Direct manufacturer cost negotiation with zero middlemen.',
      coord: 'DIRECT FACTORY RATE',
      percent: 30,
    },
    {
      id: 'production',
      name: currentLang === 'bg' ? 'Производство' : 'Production',
      icon: Boxes,
      tag: '03 · Изпълнение',
      desc: currentLang === 'bg'
        ? 'Производство според точните технически изисквания.'
        : 'Precision production under strict engineering specs.',
      coord: 'ISO 9001 COMPLIANT',
      percent: 48,
    },
    {
      id: 'qc',
      name: currentLang === 'bg' ? 'Контрол' : 'QC',
      icon: ShieldCheck,
      tag: '04 · Инспекция',
      desc: currentLang === 'bg'
        ? 'Физически контрол и лазерно измерване преди пломбиране.'
        : 'Dimensional and metallurgical inspection before seal.',
      coord: '100% INSPECTED',
      percent: 64,
    },
    {
      id: 'logistics',
      name: currentLang === 'bg' ? 'Логистика' : 'Logistics',
      icon: Ship,
      tag: '05 · Океански курс',
      desc: currentLang === 'bg'
        ? 'Морски коридор Нинбо ➔ Суец ➔ Черно море.'
        : 'Ocean corridor Ningbo ➔ Suez ➔ Black Sea.',
      coord: 'DIRECT MARITIME LINE',
      percent: 82,
    },
    {
      id: 'delivery',
      name: currentLang === 'bg' ? 'Доставка' : 'Delivery',
      icon: Truck,
      tag: '06 · Приемане',
      desc: currentLang === 'bg'
        ? 'Разтоварване на пломбирания контейнер на вашата рампа.'
        : 'Final container unloading at your destination warehouse.',
      coord: 'VARNA / BURGAS / BULGARIA',
      percent: 96,
    },
  ];

  // Auto-animating ship position along corridor
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMilestone((prev) => (prev + 1) % milestones.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [milestones.length]);

  const current = milestones[activeMilestone];

  return (
    <section id="china" className="py-20 bg-[#050811] text-white relative overflow-hidden border-t border-slate-800/80">
      {/* Background World Map Route Blueprint */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Narrative Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-14 text-left">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-blue-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentLang === 'bg' ? 'ГЛОБАЛЕН КОРЕДОР' : 'GLOBAL CORRIDOR'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-montserrat leading-tight">
              {currentLang === 'bg' ? 'Китай. Достъп до световно производство.' : 'China. Access to Global Manufacturing.'}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
              {currentLang === 'bg'
                ? 'Китай е основният sourcing пазар на Meridiano. Работим с производители и доставчици от различни индустрии, за да помогнем на бизнеса да достигне до подходящите продукти и производствени възможности.'
                : 'China is Meridiano’s primary sourcing territory. We partner directly with qualified industrial manufacturers to secure wholesale capabilities for European businesses.'}
            </p>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              {currentLang === 'bg'
                ? 'Вместо да търсите сами, да комуникирате с множество фабрики и да управлявате всеки етап поотделно, можете да разчитате на един партньор за цялостната координация.'
                : 'Instead of searching alone, navigating time zones, and juggling multiple vendors, you rely on a single accountable partner managing the entire route.'}
            </p>
          </div>

          <div className="lg:col-span-5 flex lg:justify-end">
            <button
              type="button"
              onClick={onOpenQuote}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-bold text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95"
            >
              <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#040711] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

        {/* UNITED CARRIERS STYLE ANIMATED MARITIME TRADE CORRIDOR */}
        <div className="relative rounded-2xl border border-slate-800/90 bg-[#070B16] p-6 sm:p-10 shadow-2xl overflow-hidden">
          
          {/* Top Corridor HUD */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                {currentLang === 'bg' ? 'АКТИВЕН МАРШРУТ: КИТАЙ ➔ БЪЛГАРИЯ' : 'ACTIVE CORRIDOR: CHINA ➔ BULGARIA'}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-blue-300">
                HUB: NINGBO / SHANGHAI
              </span>
              <span className="text-slate-600">➔</span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-300">
                DESTINATION: VARNA / BURGAS
              </span>
            </div>
          </div>

          {/* SVG ANIMATED CURVED CORRIDOR MAP (United Carriers Style) */}
          <div className="relative my-8 py-6">
            <div className="w-full relative">
              <svg className="w-full h-32 sm:h-40 overflow-visible" viewBox="0 0 800 120" fill="none">
                
                {/* Background faint route */}
                <path
                  d="M 50 85 C 250 15, 550 15, 750 85"
                  stroke="#1e293b"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />

                {/* Animated glowing neon path with flowing stroke-dashoffset */}
                <path
                  d="M 50 85 C 250 15, 550 15, 750 85"
                  stroke="url(#oceanGlow)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="14 16"
                  className="animate-pulse"
                />

                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="oceanGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Moving Vessel Indicator Marker (United Carriers style animated radar) */}
                <g style={{ 
                  transform: `translate(${(current.percent / 100) * 700 + 40}px, ${Math.sin((current.percent / 100) * Math.PI) * -65 + 85}px)`,
                  transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  <circle cx="0" cy="0" r="10" fill="#38bdf8" fillOpacity="0.2" className="animate-ping" />
                  <circle cx="0" cy="0" r="6" fill="#38bdf8" />
                  <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>

                {/* Start Terminal Node: CHINA */}
                <g transform="translate(50, 85)">
                  <circle cx="0" cy="0" r="8" fill="#f59e0b" fillOpacity="0.3" className="animate-ping" />
                  <circle cx="0" cy="0" r="5" fill="#f59e0b" />
                  <text x="-10" y="24" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold">CHINA</text>
                  <text x="-15" y="36" fill="#94a3b8" fontSize="9" fontFamily="monospace">NINGBO / SHANGHAI</text>
                </g>

                {/* Center Node: MERIDIANO COORDINATION */}
                <g transform="translate(400, 30)">
                  <circle cx="0" cy="0" r="7" fill="#38bdf8" fillOpacity="0.3" className="animate-pulse" />
                  <circle cx="0" cy="0" r="4" fill="#38bdf8" />
                  <text x="-32" y="-12" fill="#e2e8f0" fontSize="11" fontFamily="Montserrat" fontWeight="bold">MERIDIANO</text>
                </g>

                {/* End Terminal Node: BULGARIA / EUROPE */}
                <g transform="translate(750, 85)">
                  <circle cx="0" cy="0" r="8" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
                  <circle cx="0" cy="0" r="5" fill="#10b981" />
                  <text x="-60" y="24" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">BULGARIA / EUROPE</text>
                  <text x="-50" y="36" fill="#94a3b8" fontSize="9" fontFamily="monospace">VARNA / BURGAS</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Active Milestone Status Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 shrink-0">
                <current.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold uppercase">
                    {current.tag}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white font-montserrat">
                    {current.name}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {current.desc}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-[11px] text-slate-400">
              <span className="text-blue-400 font-semibold">{current.coord}</span>
            </div>
          </div>

          {/* 6 Interactive Milestone Selector Buttons (with micro-click animations) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
            {milestones.map((m, idx) => {
              const Icon = m.icon;
              const isSelected = activeMilestone === idx;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMilestone(idx)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      0{idx + 1}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-xs font-bold font-montserrat truncate">
                    {m.name}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
