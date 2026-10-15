import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { Check, ArrowRight } from 'lucide-react';

interface TrustSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const TrustSection: React.FC<TrustSectionProps> = ({ currentLang, onOpenQuote }) => {
  const t = translations[currentLang];
  const tr = t.trustSection;

  return (
    <section className="py-24 bg-[#090D18] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300">
            {currentLang === 'bg' ? 'ОТГОВОРНОСТ & ПРЕДВИДИМОСТ' : 'RESPONSIBILITY & CLARITY'}
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            {tr.headline}
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            {tr.p1}
          </p>

          {/* The 9 Stages Pill Grid */}
          <div className="pt-4 pb-2">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
              {currentLang === 'bg'
                ? 'Етапи, които координираме вместо вас:'
                : 'Stages we coordinate on your behalf:'}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
              {tr.stages.map((stage, idx) => (
                <div
                  key={stage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-900/80 border border-slate-800 text-xs text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-base sm:text-lg text-slate-200 font-medium max-w-2xl mx-auto">
            {tr.p2}
          </p>

          {/* High Impact Large Statement */}
          <div className="p-8 sm:p-12 rounded-sm bg-slate-900/60 border border-slate-700/80 my-8 shadow-2xl">
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
              <span className="block text-slate-300">{tr.largeStatement1}</span>
              <span className="block text-white mt-2">{tr.largeStatement2}</span>
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onOpenQuote}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-[#080C15] bg-slate-100 hover:bg-white rounded-sm transition-all shadow-lg hover:shadow-slate-100/10"
            >
              <span>{t.primaryCta}</span>
              <ArrowRight className="w-4 h-4 text-[#080C15]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
