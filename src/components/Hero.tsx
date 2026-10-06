import React from 'react';
import { Language } from '../types';
import { ArrowRight, ChevronDown, Compass, Ship, Globe, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const Hero: React.FC<HeroProps> = ({ currentLang, onOpenQuote }) => {
  const scrollToNext = () => {
    const el = document.querySelector('#about') || document.querySelector('#journey');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    const el = document.querySelector('#how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative min-h-[90vh] pt-32 pb-16 flex flex-col justify-between overflow-hidden bg-[#040711] text-white"
    >
      {/* Background Panoramic Ship & Twilight Port Fleet */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/src/assets/images/hero_epic_golden_ship_1791104796251.jpg"
          alt="International container vessel fleet at twilight"
          className="w-full h-full object-cover object-center filter brightness-[0.4] contrast-[1.12]"
          referrerPolicy="no-referrer"
        />
        {/* Soft atmospheric gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-[#040711]/70 to-[#040711]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:3rem_3rem] opacity-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto text-center flex flex-col items-center pt-4">
        
        {/* Section 01 Identifier Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 mb-6 backdrop-blur-md shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>{currentLang === 'bg' ? 'СЕКЦИЯ 01 · ГЛАВНА ЧАСТ (HERO)' : 'SECTION 01 · HERO'}</span>
        </div>

        {/* Brand Tagline */}
        <div className="text-xs font-mono uppercase tracking-[0.28em] text-slate-300 font-semibold mb-3">
          MERIDIANO
        </div>

        {/* Main Headline: Exactly matching user request */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.14] mb-6 max-w-4xl font-montserrat">
          <span className="block text-white">
            {currentLang === 'bg' ? 'Вашата стока,' : 'Your Cargo,'}
          </span>
          <span className="block text-white">
            {currentLang === 'bg' ? 'Нашата отговорност.' : 'Our Responsibility.'}
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200 mt-2">
            {currentLang === 'bg' ? 'От света до вас.' : 'From the World to You.'}
          </span>
        </h1>

        {/* Refined Subtitle Paragraph with Montserrat Bold */}
        <p className="font-montserrat font-bold text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mb-8">
          {currentLang === 'bg'
            ? 'Глобално снабдяване и международна търговия. Свързваме българския и европейския бизнес с проверени производители, координирайки процеса от завода до вашия склад.'
            : 'Global sourcing and international trade. Connecting European business directly with verified manufacturers from factory floor to warehouse door.'}
        </p>

        {/* Action CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <button
            type="button"
            onClick={onOpenQuote}
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-bold text-xs uppercase tracking-wider transition-all shadow-xl hover:shadow-white/20 active:scale-95"
          >
            <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#040711] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={scrollToHowItWorks}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-semibold text-xs uppercase tracking-wider transition-all backdrop-blur-md active:scale-95"
          >
            <span>{currentLang === 'bg' ? 'Как работим' : 'How We Work'}</span>
          </button>
        </div>

        {/* Explore scroll hint */}
        <button
          type="button"
          onClick={scrollToNext}
          className="group inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center group-hover:border-slate-500">
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <span className="font-jakarta">{currentLang === 'bg' ? 'Разгледайте сайта' : 'Explore website'}</span>
        </button>

      </div>

      {/* BOTTOM METRICS RIBBON: 3 Pillars without right-side confusion */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-left">
          
          {/* Metric 1 */}
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center gap-4 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-600/40 text-amber-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-montserrat">
                {currentLang === 'bg' ? 'Китай' : 'China'}
              </div>
              <div className="font-jakarta text-xs text-slate-400">
                {currentLang === 'bg' ? 'Основен пазар' : 'Primary Source Market'}
              </div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center gap-4 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-600/40 text-blue-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-montserrat">
                {currentLang === 'bg' ? 'Меридиано' : 'Meridiano'}
              </div>
              <div className="font-jakarta text-xs text-slate-400">
                {currentLang === 'bg' ? 'Вашият партньор' : 'Your Dedicated Partner'}
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center gap-4 hover:border-slate-700 transition-colors">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 shrink-0">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-montserrat">
                {currentLang === 'bg' ? 'България / Европа' : 'Bulgaria / Europe'}
              </div>
              <div className="font-jakarta text-xs text-slate-400">
                {currentLang === 'bg' ? 'Вашият бизнес' : 'Your Business'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
