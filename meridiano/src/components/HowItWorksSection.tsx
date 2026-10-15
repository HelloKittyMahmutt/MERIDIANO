import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { FileSearch, Factory, Calculator, Cpu, Truck, CheckCircle2, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  const t = translations[currentLang];
  const hw = t.howItWorks;

  const stepIcons = [
    FileSearch,
    Factory,
    Calculator,
    Cpu,
    Truck,
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-[#090E1A] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>{hw.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            {hw.headline}
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            {hw.subheadline}
          </p>
        </div>

        {/* 5-Step Process Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative mb-16">
          {hw.steps.map((step, idx) => {
            const Icon = stepIcons[idx] || CheckCircle2;

            return (
              <div
                key={step.number}
                className="steel-panel p-6 rounded-sm relative flex flex-col justify-between border border-slate-800 hover:border-slate-600/70 transition-all duration-300"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      STEP {step.number}
                    </span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title & Core Description */}
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {step.description}
                  </p>
                </div>

                {/* Practical Detail */}
                <div className="pt-3 border-t border-slate-800/70 text-[11px] text-slate-400">
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coordination Workflow Schema */}
        <div className="steel-panel p-6 sm:p-8 rounded-sm border border-slate-800">
          <div className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-6 flex items-center justify-between">
            <span>{hw.schemaTitle}</span>
            <span className="text-slate-300 font-semibold">MERIDIANO WORKFLOW</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold">
            {hw.schemaNodes.map((node, i) => (
              <React.Fragment key={node}>
                <div
                  className={`px-4 py-2.5 rounded-sm border transition-colors ${
                    i === 1
                      ? 'bg-slate-800 text-white border-slate-500 shadow-sm font-bold tracking-wider'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800'
                  }`}
                >
                  {node}
                </div>
                {i < hw.schemaNodes.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
