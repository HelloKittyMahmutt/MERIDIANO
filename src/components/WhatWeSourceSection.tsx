import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { 
  Drill, 
  Layers, 
  Cog, 
  Landmark, 
  Tractor, 
  Boxes, 
  ArrowRight, 
  Check 
} from 'lucide-react';

interface WhatWeSourceSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const WhatWeSourceSection: React.FC<WhatWeSourceSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const w = t.whatWeSource;

  const [selectedCat, setSelectedCat] = useState<string>(w.categories[0]?.id || 'drilling');

  const categoryImages: Record<string, string> = {
    drilling: '/src/assets/images/machinery_agriculture_equipment_1791035095087.jpg',
    'construction-steel': '/src/assets/images/industrial_equipment_cnc_1791035105346.jpg',
    'industrial-machinery': '/src/assets/images/china_precision_manufacturing_1791035083477.jpg',
    municipal: '/src/assets/images/hero_china_trade_port_1791035070884.jpg',
    agriculture: '/src/assets/images/machinery_agriculture_equipment_1791035095087.jpg',
    retail: '/src/assets/images/china_precision_manufacturing_1791035083477.jpg',
  };

  const categoryIcons: Record<string, React.ElementType> = {
    drilling: Drill,
    'construction-steel': Layers,
    'industrial-machinery': Cog,
    municipal: Landmark,
    agriculture: Tractor,
    retail: Boxes,
  };

  const activeCategory = w.categories.find((c) => c.id === selectedCat) || w.categories[0];
  const ActiveIcon = categoryIcons[activeCategory.id] || Cog;

  return (
    <section id="what-we-source" className="py-16 sm:py-20 bg-[#080C15] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>{w.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            {w.headline}
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            {w.subheadline}
          </p>
        </div>

        {/* Minimalist Industrial Category Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-10">
          {w.categories.map((cat) => {
            const Icon = categoryIcons[cat.id] || Cog;
            const isSelected = selectedCat === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`p-3.5 rounded-sm text-left transition-all duration-200 border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-slate-400 text-white shadow-md'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono">{cat.number}</span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="text-xs font-bold leading-tight">
                  {cat.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Featured Category Spotlight Card */}
        <div className="steel-panel rounded-sm overflow-hidden border border-slate-800 shadow-2xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Category Visual */}
            <div className="lg:col-span-6 relative min-h-[300px] lg:min-h-[420px] overflow-hidden bg-slate-950">
              <img
                src={categoryImages[activeCategory.id] || categoryImages.drilling}
                alt={activeCategory.title}
                className="w-full h-full object-cover object-center filter brightness-90 hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C15] via-transparent to-transparent lg:hidden opacity-90" />
              <div className="absolute top-4 left-4 p-2 rounded bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-xs font-mono text-slate-300">
                CATEGORY {activeCategory.number} · {activeCategory.tag}
              </div>
            </div>

            {/* Category Details & Concrete Examples */}
            <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-white">
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                      {activeCategory.tag}
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {activeCategory.title}
                    </h3>
                  </div>
                </div>

                <p className="text-base text-slate-300 leading-relaxed font-normal">
                  {activeCategory.description}
                </p>

                {/* Example Product Bullets */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 font-mono">
                    {currentLang === 'bg' ? 'Примерни продукти и позиции:' : 'Representative items & positions:'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeCategory.examples.map((example, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded bg-slate-900/60 border border-slate-800/80"
                      >
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="capitalize">{example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs text-slate-400">
                  {currentLang === 'bg'
                    ? 'Изисква се специфичен стандарт, тонаж или параметър?'
                    : 'Do you require a specific standard, tonnage, or specification?'}
                </span>
                <button
                  type="button"
                  onClick={onOpenQuote}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-sm transition-colors whitespace-nowrap"
                >
                  <span>{currentLang === 'bg' ? 'Запитване за тази категория' : 'Inquire for this category'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Flexible Scope Notice */}
        <div className="p-4 sm:p-5 rounded bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 text-center">
          {w.notice}
        </div>
      </div>
    </section>
  );
};
