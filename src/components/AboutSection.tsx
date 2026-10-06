import React from 'react';
import { Language } from '../types';
import { ShieldCheck, Factory, Ship, ArrowRight } from 'lucide-react';

interface AboutSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ currentLang, onOpenQuote }) => {
  return (
    <section id="about" className="py-16 sm:py-20 bg-[#06090F] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT: Concise, Impactful Narrative */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{currentLang === 'bg' ? 'СЕКЦИЯ 02 · ЗА НАС' : 'SECTION 02 · ABOUT US'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-montserrat leading-tight">
              {currentLang === 'bg' ? 'Свързваме България със света.' : 'Connecting Bulgaria with the World.'}
            </h2>

            <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed font-montserrat font-bold">
              <p>
                {currentLang === 'bg'
                  ? 'MERIDIANO е компания за глобално снабдяване и международна търговия. Правим достъпа до китайските производители сигурен, предвидим и без излишни прекупвачи.'
                  : 'MERIDIANO is an international trade and sourcing firm. We deliver direct, reliable access to Chinese industrial manufacturers without middleman markups.'}
              </p>

              <p className="text-xs sm:text-sm text-slate-400 font-montserrat font-bold">
                {currentLang === 'bg'
                  ? 'Координираме целия процес — от фабричния под и контрола на качеството до морския транспорт и разтоварването на вашия обект.'
                  : 'We coordinate the entire lifecycle — from factory floor quality control to maritime passage and delivery to your warehouse.'}
              </p>

              <div className="pt-2 font-bold text-white text-base font-montserrat">
                {currentLang === 'bg' ? 'Вашата стока. Нашата отговорност.' : 'Your Cargo. Our Responsibility.'}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenQuote}
                className="group inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-blue-400 hover:text-white transition-colors"
              >
                <span>{currentLang === 'bg' ? 'Научете повече' : 'Learn More'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* RIGHT: 3 Clean, Lean Credibility Badges (No Video Bloat!) */}
          <div className="lg:col-span-5 space-y-3.5 text-left">
            
            <div className="p-4 sm:p-5 rounded-xl border border-slate-800/90 bg-[#080D1A] flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-blue-950/80 border border-blue-700/50 text-blue-400 shrink-0">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-montserrat uppercase mb-1">
                  {currentLang === 'bg' ? 'Директен контакт със завода' : 'Direct Factory Sourcing'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'bg'
                    ? 'Без външни търговски агенции и изкуствено завишени цени.'
                    : 'Zero third-party trading agencies. Pure manufacturer cost.'}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl border border-slate-800/90 bg-[#080D1A] flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-blue-950/80 border border-blue-700/50 text-blue-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-montserrat uppercase mb-1">
                  {currentLang === 'bg' ? 'Инспекция на фабричния под' : 'Factory Floor QC'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'bg'
                    ? 'Проверка на размери, дебелина и опаковка преди пломбиране.'
                    : 'Physical inspection and measurement before container seals are locked.'}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl border border-slate-800/90 bg-[#080D1A] flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-blue-950/80 border border-blue-700/50 text-blue-400 shrink-0">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-montserrat uppercase mb-1">
                  {currentLang === 'bg' ? 'Морски коридор към Черно море' : 'Direct Maritime Corridor'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentLang === 'bg'
                    ? 'Директни курсове Нинбо/Шанхай ➔ Варна и Бургас.'
                    : 'Scheduled maritime passages directly to Bulgarian Black Sea ports.'}
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
