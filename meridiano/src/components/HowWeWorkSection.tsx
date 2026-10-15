import React, { useState } from 'react';
import { Language } from '../types';
import { 
  FileText, 
  Users, 
  Scale, 
  Boxes, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';

interface HowWeWorkSectionProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const HowWeWorkSection: React.FC<HowWeWorkSectionProps> = ({ currentLang, onOpenQuote }) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      number: '01',
      title: currentLang === 'bg' ? 'Вашето запитване' : 'Your Inquiry',
      desc: currentLang === 'bg'
        ? 'Казвате ни какво търсите и къде трябва да бъде доставено.'
        : 'Specify your product requirements, volume, and destination warehouse.',
      icon: FileText,
    },
    {
      number: '02',
      title: currentLang === 'bg' ? 'Търсим доставчик' : 'Supplier Search',
      desc: currentLang === 'bg'
        ? 'Проучваме китайския пазар и намираме подходящи производители.'
        : 'Auditing verified Chinese plants with verified production capabilities.',
      icon: Users,
    },
    {
      number: '03',
      title: currentLang === 'bg' ? 'Сравняваме и договаряме' : 'Negotiation',
      desc: currentLang === 'bg'
        ? 'Събираме предложения и договаряме най-добрите условия.'
        : 'Comparing direct bids and negotiating wholesale factory prices.',
      icon: Scale,
    },
    {
      number: '04',
      title: currentLang === 'bg' ? 'Координираме' : 'Coordination & QC',
      desc: currentLang === 'bg'
        ? 'Организираме производство, контрол и логистика.'
        : 'Supervising manufacturing, physical inspection, and container loading.',
      icon: Boxes,
    },
    {
      number: '05',
      title: currentLang === 'bg' ? 'Доставяме' : 'Direct Delivery',
      desc: currentLang === 'bg'
        ? 'Стоката достига до крайната точка на доставка.'
        : 'The sealed container arrives smoothly at your destination facility.',
      icon: Truck,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#070A12] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-left mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{currentLang === 'bg' ? 'СЕКЦИЯ 05 · КАК РАБОТИМ' : 'SECTION 05 · HOW WE WORK'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat mb-2">
            {currentLang === 'bg' ? 'Как работим?' : 'How We Work'}
          </h2>
          <p className="font-montserrat font-bold text-xs sm:text-sm text-slate-300">
            {currentLang === 'bg' ? '5 стъпки от вашето запитване до доставката.' : '5 steps from your initial request to final delivery.'}
          </p>
        </div>

        {/* 5-Step Connected Nodes Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;

            return (
              <div
                key={step.number}
                onClick={() => setActiveStep(idx)}
                className={`p-5 rounded-xl border transition-all duration-300 flex flex-col justify-between cursor-pointer text-left relative group ${
                  isActive
                    ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-950/50 ring-1 ring-blue-500/50'
                    : 'bg-[#090D1A]/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div>
                  {/* Step Top: Icon & Arrow */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Connecting Chevron on desktop except last item */}
                    {idx < steps.length - 1 && (
                      <ChevronRight className="hidden lg:block w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>

                  {/* Step Number Tag */}
                  <div className={`text-[10px] font-mono tracking-widest font-bold uppercase mb-1.5 ${
                    isActive ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    {step.number}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white font-montserrat mb-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed font-montserrat font-bold">
                    {step.desc}
                  </p>
                </div>

                {/* Bottom Active Glow Accent */}
                <div className={`h-1 w-full mt-4 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-blue-500' : 'bg-transparent'
                }`} />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
