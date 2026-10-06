import React from 'react';
import { Language } from '../types';
import { ArrowRight } from 'lucide-react';

interface CalloutBannerProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const CalloutBanner: React.FC<CalloutBannerProps> = ({ currentLang, onOpenQuote }) => {
  return (
    <section className="relative py-16 sm:py-20 bg-[#040711] overflow-hidden border-t border-slate-800/80">
      {/* Cinematic Panoramic Cargo Ship Background Photo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src="/src/assets/images/hero_calm_luxury_ship_1791105031300.jpg"
          alt="Container vessel in ocean at dusk"
          className="w-full h-full object-cover filter brightness-[0.4] contrast-[1.15]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040711] via-[#040711]/80 to-[#040711]/60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
          
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{currentLang === 'bg' ? 'СЕКЦИЯ 07 · ОКЕАНСКИ БАНЕР' : 'SECTION 07 · BANNER'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-montserrat tracking-tight">
              {currentLang === 'bg'
                ? 'Глобалната търговия не трябва да бъде сложна.'
                : 'Global Trade Does Not Have to Be Complex.'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {currentLang === 'bg'
                ? 'Вие казвате какво ви е необходимо. Ние организираме процеса.'
                : 'You state your requirements. We coordinate the entire process.'}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={onOpenQuote}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-bold text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#040711] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
