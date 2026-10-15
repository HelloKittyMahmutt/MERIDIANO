import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { ArrowRight, Factory, Search, CheckCircle2, Shield, Layers, PackageCheck, Anchor, ArrowUpRight } from 'lucide-react';

interface ChinaSourcingSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const ChinaSourcingSection: React.FC<ChinaSourcingSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const cs = t.chinaSourcing;

  const pipelineIcons = [
    Factory,
    Search,
    Layers,
    PackageCheck,
    Shield,
    Anchor,
    CheckCircle2,
  ];

  return (
    <section id="china-sourcing" className="py-24 bg-[#090E1A] relative overflow-hidden border-t border-slate-800/80">
      {/* Decorative subtle background radial glow */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-slate-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>{cs.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            {cs.headline}
          </h2>
          <div className="space-y-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            <p>{cs.paragraph1}</p>
            <p className="text-slate-200 font-medium">{cs.paragraph2}</p>
          </div>
        </div>

        {/* Visual Sourcing Pipeline: CHINA → BULGARIA / EUROPE */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-300">
              {cs.flowTitle}
            </h3>
            <span className="text-xs text-slate-300 font-mono">END-TO-END CORRIDOR</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
            {cs.steps.map((step, idx) => {
              const Icon = pipelineIcons[idx] || Factory;
              const isFirst = idx === 0;
              const isLast = idx === cs.steps.length - 1;

              return (
                <div
                  key={step.label}
                  className={`steel-panel p-4 rounded-sm relative flex flex-col justify-between transition-all duration-200 hover:border-slate-500/50 ${
                    isFirst || isLast
                      ? 'bg-slate-800/80 border-slate-600/70 shadow-md'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  {/* Top Index & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono text-slate-300">
                      0{idx + 1}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isFirst || isLast ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Step Label & Short Description */}
                  <div>
                    <h4
                      className={`text-xs font-bold tracking-wide uppercase mb-1.5 ${
                        isFirst || isLast ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {/* Horizontal flow arrow on desktop */}
                  {idx < cs.steps.length - 1 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-600">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Industrial Hubs & Manufacturing Plant Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Spotlight Image Card (Col 1-7) */}
          <div className="lg:col-span-7 steel-panel rounded-sm overflow-hidden flex flex-col border border-slate-800">
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src="/src/assets/images/china_precision_manufacturing_1791035083477.jpg"
                alt="High-tech automated precision industrial manufacturing facility in China"
                className="w-full h-full object-cover object-center filter brightness-90 hover:scale-[1.02] transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090E1A] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                <span className="font-semibold tracking-wider uppercase text-slate-200">
                  {currentLang === 'bg' ? 'Прецизно фабрично производство' : 'Precision Factory Manufacturing'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">OEM / ODM / MACHINERY</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-white tracking-tight">
                  {cs.coordinationAdvantageTitle}
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  {cs.coordinationAdvantageBody}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {currentLang === 'bg'
                    ? 'Координация според вашите спецификации'
                    : 'Coordinated to your technical requirements'}
                </div>
                <button
                  type="button"
                  onClick={onOpenQuote}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:text-white"
                >
                  <span>{t.primaryCta}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Regional Hubs Bento (Col 8-12) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="text-xs font-semibold tracking-wider uppercase text-slate-300 mb-1">
              {cs.hubsTitle}
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {cs.hubs.map((hub) => (
                <div
                  key={hub.name}
                  className="steel-panel p-4 sm:p-5 rounded-sm border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="text-sm font-bold text-white tracking-wide">
                      {hub.name}
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400">CLUSTER</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {hub.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
