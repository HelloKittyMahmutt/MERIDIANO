import React, { useState } from 'react';
import { Language } from '../types';
import { 
  Globe, 
  Search, 
  Handshake, 
  FileCheck, 
  Cog, 
  Tag, 
  ShieldCheck, 
  Truck, 
  FileText,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface ServicesSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ currentLang, onOpenQuote }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const services = [
    {
      number: '01',
      title: currentLang === 'bg' ? 'Глобално снабдяване' : 'Global Sourcing',
      desc: currentLang === 'bg'
        ? 'Намиране на подходящи производители и доставчици.'
        : 'Identifying and vetting qualified manufacturers and suppliers.',
      icon: Globe,
    },
    {
      number: '02',
      title: currentLang === 'bg' ? 'China Supplier Sourcing' : 'China Supplier Sourcing',
      desc: currentLang === 'bg'
        ? 'Търсене и оценяване на китайски производители и доставчици.'
        : 'Targeted sourcing and verification of verified Chinese industrial plants.',
      icon: Search,
    },
    {
      number: '03',
      title: currentLang === 'bg' ? 'Оферти и договаряне' : 'Quotations & Negotiation',
      desc: currentLang === 'bg'
        ? 'Комуникираме и договаряме цени, количества и условия.'
        : 'Direct manufacturer communication securing wholesale volume terms.',
      icon: Handshake,
    },
    {
      number: '04',
      title: currentLang === 'bg' ? 'Мостри и спецификации' : 'Samples & Specifications',
      desc: currentLang === 'bg'
        ? 'Координираме мостри и уточняваме продуктови изисквания.'
        : 'Coordinating pre-production test samples and technical blueprints.',
      icon: FileCheck,
    },
    {
      number: '05',
      title: currentLang === 'bg' ? 'Custom Manufacturing' : 'Custom Manufacturing',
      desc: currentLang === 'bg'
        ? 'Производство по индивидуални спецификации и бранд.'
        : 'Tailored production runs according to custom engineering blueprints.',
      icon: Cog,
    },
    {
      number: '06',
      title: currentLang === 'bg' ? 'Private Label' : 'Private Label',
      desc: currentLang === 'bg'
        ? 'Координираме производство под собствен бранд.'
        : 'Manufacturing custom packaging and branding under your proprietary trademark.',
      icon: Tag,
    },
    {
      number: '07',
      title: currentLang === 'bg' ? 'Производство и контрол' : 'Production & QC',
      desc: currentLang === 'bg'
        ? 'Проследяваме процеса и контрола на качеството.'
        : 'On-site factory floor inspection and strict metallurgical compliance.',
      icon: ShieldCheck,
    },
    {
      number: '08',
      title: currentLang === 'bg' ? 'Логистика и доставка' : 'Logistics & Freight',
      desc: currentLang === 'bg'
        ? 'Организираме международния транспорт и доставка.'
        : 'Full ocean container logistics and multimodal freight coordination.',
      icon: Truck,
    },
    {
      number: '09',
      title: currentLang === 'bg' ? 'Импорт и документация' : 'Import & Customs Documentation',
      desc: currentLang === 'bg'
        ? 'Съдействие при необходимата митническа и карго документация.'
        : 'Comprehensive support with bills of lading, CE certifications, and customs.',
      icon: FileText,
    },
  ];

  return (
    <section id="services" className="py-20 bg-[#070A12] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <div className="text-xs font-mono tracking-[0.24em] uppercase text-blue-400 font-semibold mb-2">
              {currentLang === 'bg' ? 'Услуги' : 'Services'}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat">
              {currentLang === 'bg' ? 'Пълна подкрепа по целия процес на снабдяване.' : 'End-to-End Support Across the Sourcing Pipeline.'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenQuote}
            className="group inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-slate-300 hover:text-white transition-colors"
          >
            <span>{currentLang === 'bg' ? 'Всички услуги' : 'All Services'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 9-Box Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {services.map((item, idx) => {
            const Icon = item.icon;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.number}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={onOpenQuote}
                className={`relative p-6 sm:p-7 rounded-xl border transition-all duration-300 flex flex-col justify-between cursor-pointer group text-left ${
                  isHovered
                    ? 'bg-slate-900 border-blue-500/80 shadow-2xl shadow-blue-950/40 -translate-y-1'
                    : 'bg-[#0A0E1A]/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Bar with Number & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
                      {item.number}
                    </span>
                    <div className={`p-2 rounded-lg border transition-colors ${
                      isHovered
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Service Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white font-montserrat mb-2 group-hover:text-blue-200 transition-colors">
                    {item.title}
                  </h3>

                  {/* Service Description */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                {/* Subtle Interactive Arrow indicator on hover */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="group-hover:text-blue-400 transition-colors">
                    {currentLang === 'bg' ? 'Запитване за услуга' : 'Inquire'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
