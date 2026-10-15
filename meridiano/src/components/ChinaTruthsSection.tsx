import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { AlertTriangle, ShieldCheck, XCircle, CheckCircle, ArrowRight, Zap, Flame } from 'lucide-react';

interface ChinaTruthsSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const ChinaTruthsSection: React.FC<ChinaTruthsSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const ct = t.chinaTruths;

  const [activeTab, setActiveTab] = useState<'compare' | 'facts'>('facts');

  return (
    <section id="truth" className="py-16 sm:py-20 bg-[#06090F] relative overflow-hidden border-t border-slate-800">
      {/* Subtle dramatic red-steel background energy */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-950/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Punchy Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{ct.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            {ct.headline}
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            {ct.subheadline}
          </p>
        </div>

        {/* 3 Dramatic Fact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {ct.items.map((item, idx) => {
            const isGuanxi = idx === 2;

            return (
              <div
                key={item.tag}
                className={`p-7 sm:p-8 rounded-sm relative flex flex-col justify-between transition-all duration-300 border ${
                  isGuanxi
                    ? 'steel-panel border-slate-500/80 bg-slate-900/80 shadow-2xl shadow-slate-900/60'
                    : 'bg-[#0A0E18] border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Index & Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-mono font-bold tracking-widest text-slate-400">
                      {item.tag}
                    </span>
                    {isGuanxi ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200">
                        НАШЕТО ПРЕДИМСТВО
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/40 border border-red-900/50 text-red-400">
                        СКРИТ КАПАН
                      </span>
                    )}
                  </div>

                  {/* Title & Dramatic Highlight */}
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <div className={`text-xs font-mono font-semibold uppercase tracking-wider mb-4 ${
                    isGuanxi ? 'text-slate-300' : 'text-red-400'
                  }`}>
                    {item.highlight}
                  </div>

                  {/* Story Description */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-6 font-normal">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Bottomline / Outcome */}
                <div className={`pt-4 border-t text-xs font-medium ${
                  isGuanxi 
                    ? 'border-slate-800 text-slate-200' 
                    : 'border-slate-900 text-red-300/90'
                }`}>
                  {item.warning}
                </div>
              </div>
            );
          })}
        </div>

        {/* The Direct Side-by-Side Comparison Matrix */}
        <div className="steel-panel p-6 sm:p-10 rounded-sm border border-slate-700/80 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-2">
              РЕАЛНОСТТА НА ПАЗАРА
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {ct.comparisonTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left: The Traditional Outsider Trap */}
            <div className="p-6 sm:p-8 rounded bg-red-950/15 border border-red-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-red-900/30">
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <h4 className="text-base sm:text-lg font-bold text-red-200">
                    {ct.traditionalLabel}
                  </h4>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-slate-300">
                  {ct.traditionalPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-2" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-red-900/30 text-xs font-mono text-red-400">
                ИЗХОД: Завишени цени, несигурно качество и висок финансов риск.
              </div>
            </div>

            {/* Right: The Meridiano Guanxi Route */}
            <div className="p-6 sm:p-8 rounded bg-slate-850 border border-slate-500/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-700">
                  <ShieldCheck className="w-5 h-5 text-white shrink-0" />
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    {ct.meridianoLabel}
                  </h4>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-slate-200">
                  {ct.meridianoPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs font-mono text-slate-300">
                  ИЗХОД: Чиста заводска цена и пълен контрол.
                </span>
                <button
                  type="button"
                  onClick={onOpenQuote}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#06090F] bg-white hover:bg-slate-100 rounded-sm transition-colors whitespace-nowrap shadow-md"
                >
                  {t.primaryCta}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
