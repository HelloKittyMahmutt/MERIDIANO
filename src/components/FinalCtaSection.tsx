import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { ArrowRight } from 'lucide-react';

interface FinalCtaSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const f = t.finalCta;

  return (
    <section className="py-24 bg-[#080C15] relative overflow-hidden border-t border-slate-800">
      {/* Background Subtle Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090E1A] to-[#080C15] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="steel-panel p-10 sm:p-16 rounded-sm border border-slate-700/80 shadow-2xl relative overflow-hidden">
          {/* Subtle top edge steel highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />

          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-4">
            MERIDIANO EOOD · CHINA SOURCING
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            {f.headline}
          </h2>

          <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-6">
            {f.statement}
          </p>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
            {f.substatement}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenQuote}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-[#080C15] bg-slate-100 hover:bg-white rounded-sm transition-all shadow-lg hover:shadow-slate-100/10 active:scale-[0.99]"
            >
              <span>{f.buttonText}</span>
              <ArrowRight className="w-4 h-4 text-[#080C15]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
