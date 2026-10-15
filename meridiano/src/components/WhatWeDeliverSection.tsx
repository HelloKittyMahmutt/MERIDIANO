import React from 'react';
import { Language } from '../types';
import { ArrowRight, Sparkles, Layers } from 'lucide-react';

interface WhatWeDeliverSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const WhatWeDeliverSection: React.FC<WhatWeDeliverSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const categories = [
    {
      number: '01',
      title: currentLang === 'bg' ? 'Селскостопанска техника' : 'Agricultural Machinery',
      image: '/src/assets/images/machinery_agriculture_equipment_1791035095087.jpg',
      alt: 'Tractors and agricultural harvesters',
    },
    {
      number: '02',
      title: currentLang === 'bg' ? 'Индустриално оборудване' : 'Industrial Equipment',
      image: '/src/assets/images/industrial_equipment_cnc_1791035105346.jpg',
      alt: 'CNC machinery and laser cutting plants',
    },
    {
      number: '03',
      title: currentLang === 'bg' ? 'Строителство' : 'Heavy Construction',
      image: '/src/assets/images/construction_excavator_site_1791107490749.jpg',
      alt: 'Heavy excavators and cranes on construction site',
    },
    {
      number: '04',
      title: currentLang === 'bg' ? 'Бизнес оборудване' : 'Manufacturing & Processing',
      image: '/src/assets/images/china_precision_manufacturing_1791035083477.jpg',
      alt: 'Automated factory packaging and sorting line',
    },
    {
      number: '05',
      title: currentLang === 'bg' ? 'Производство по поръчка' : 'Custom OEM & Tooling',
      image: '/src/assets/images/quality_inspection_laboratory_1791035117367.jpg',
      alt: 'Precision manufactured parts and metallurgy',
    },
    {
      number: '06',
      title: currentLang === 'bg' ? 'По заявка' : 'On-Demand Custom Sourcing',
      image: '/src/assets/images/global_sourcing_network_1791107509068.jpg',
      alt: 'Global network for custom product inquiries',
    },
  ];

  return (
    <section id="what-we-source" className="py-20 bg-[#06090F] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 text-left">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{currentLang === 'bg' ? 'СЕКЦИЯ 04 · КАКВО МОЖЕМ ДА ДОСТАВИМ' : 'SECTION 04 · WHAT WE DELIVER'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat mb-3">
              {currentLang === 'bg' ? 'Какво можем да доставим?' : 'What Can We Deliver?'}
            </h2>
            <p className="font-montserrat font-bold text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentLang === 'bg'
                ? 'Работим с широк спектър от продукти и индустрии. Ако не намирате конкретния продукт тук, изпратете ни запитване.'
                : 'We operate across a wide industrial and retail scope. If your required item is not listed here, submit a custom inquiry.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenQuote}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 whitespace-nowrap self-start md:self-auto"
          >
            <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#040711] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 6 Photo Cards Grid matching the mockup */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.number}
              onClick={onOpenQuote}
              className="group relative rounded-xl overflow-hidden border border-slate-800/90 bg-slate-950/80 h-56 sm:h-64 flex flex-col justify-between p-3.5 cursor-pointer shadow-xl hover:border-slate-500 transition-all duration-300 -translate-y-0 hover:-translate-y-1.5"
            >
              {/* Background Photo with Dark Gradient Overlay */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={cat.image}
                  alt={cat.alt}
                  className="w-full h-full object-cover filter brightness-[0.75] contrast-[1.1] group-hover:scale-110 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-[#040711]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
              </div>

              {/* Top Tag */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 px-2 py-0.5 rounded bg-black/60 border border-slate-700/80 backdrop-blur-md">
                  {cat.number}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Bottom Caption */}
              <div className="relative z-10 text-left">
                <h3 className="text-xs sm:text-sm font-bold text-white font-montserrat leading-snug drop-shadow-md group-hover:text-blue-300 transition-colors">
                  {cat.title}
                </h3>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
