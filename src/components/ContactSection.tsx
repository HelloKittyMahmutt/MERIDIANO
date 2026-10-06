import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { MapPin, Building, Clock, Globe, ArrowRight, Shield } from 'lucide-react';

interface ContactSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const c = t.contact;

  return (
    <section id="contact" className="py-16 sm:py-20 bg-[#090D18] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Corporate Information (Col 1-7) */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>{c.badge}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                {c.headline}
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                {c.subheadline}
              </p>
            </div>

            {/* Corporate Data List */}
            <div className="steel-panel p-6 sm:p-8 rounded-sm border border-slate-800 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-slate-200 mt-1">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                    {currentLang === 'bg' ? 'Търговско дружество' : 'Corporate Entity'}
                  </span>
                  <div className="text-lg font-bold text-white tracking-wide">
                    {c.companyName}
                  </div>
                  <span className="text-xs text-slate-400">
                    {c.registrationLocation}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-slate-800/80">
                <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-slate-200 mt-1">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                    {c.registeredAddressLabel}
                  </span>
                  <div className="text-sm font-semibold text-white">
                    {c.registeredAddress}
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentLang === 'bg' ? 'Област Кърджали, Република България' : 'Kardzhali Province, Republic of Bulgaria'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-slate-800/80">
                <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-slate-200 mt-1">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                    {currentLang === 'bg' ? 'Официален уебсайт' : 'Official Web Domain'}
                  </span>
                  <div className="text-sm font-semibold text-white font-mono">
                    {c.officialDomain}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-slate-800/80">
                <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-slate-200 mt-1">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                    {c.workHoursLabel}
                  </span>
                  <div className="text-sm font-semibold text-white">
                    {c.workHours}
                  </div>
                </div>
              </div>
            </div>

            {/* Factual Integrity & Placeholder Notice */}
            <div className="p-4 rounded-sm bg-slate-900/60 border border-slate-800/90 text-xs text-slate-400 flex items-start gap-3">
              <Shield className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300 block mb-0.5">
                  {c.noteTitle}
                </span>
                <p>{c.contactPlaceholderNotice}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Trade Inquiry Fast-Track (Col 8-12) */}
          <div className="lg:col-span-5">
            <div className="steel-panel p-8 sm:p-9 rounded-sm border border-slate-700/80 shadow-2xl space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  {currentLang === 'bg' ? 'ТЪРГОВСКИ ДИАЛОГ' : 'COMMERCIAL DIALOGUE'}
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {currentLang === 'bg' ? 'Започнете проект за снабдяване' : 'Initiate Sourcing Project'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {currentLang === 'bg'
                    ? 'Най-бързият и ефективен начин да обсъдим търговски условия, фабрични клъстери и наличност на производство е чрез директната форма за запитване.'
                    : 'The most direct and structured path to evaluating factory clusters, commercial terms, and production availability is through our primary inquiry form.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <span className="font-semibold text-white block">
                    {currentLang === 'bg' ? 'Стъпка 1: Спецификация' : 'Step 1: Specifications'}
                  </span>
                  <p className="text-slate-400">
                    {currentLang === 'bg'
                      ? 'Описвате търсените продукти, обеми и технически изисквания.'
                      : 'Define required products, volume, and technical standards.'}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <span className="font-semibold text-white block">
                    {currentLang === 'bg' ? 'Стъпка 2: Предварителен анализ' : 'Step 2: Preliminary Review'}
                  </span>
                  <p className="text-slate-400">
                    {currentLang === 'bg'
                      ? 'Проучваме производствения потенциал в съответния китайски клъстер.'
                      : 'We screen manufacturer potential across relevant Chinese industrial clusters.'}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <span className="font-semibold text-white block">
                    {currentLang === 'bg' ? 'Стъпка 3: Търговско предложение' : 'Step 3: Commercial Proposal'}
                  </span>
                  <p className="text-slate-400">
                    {currentLang === 'bg'
                      ? 'Предоставяме структуриран план за координация и следващи стъпки.'
                      : 'We provide an actionable sourcing roadmap and commercial terms.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenQuote}
                  className="w-full py-3.5 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#080C15] bg-slate-100 hover:bg-white rounded-sm transition-colors shadow-md"
                >
                  <span>{t.primaryCta}</span>
                  <ArrowRight className="w-4 h-4 text-[#080C15]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
