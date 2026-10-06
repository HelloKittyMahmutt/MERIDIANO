import React from 'react';
import { Language } from '../types';

interface WhyMeridianoSectionProps {
  currentLang: Language;
}

export const WhyMeridianoSection: React.FC<WhyMeridianoSectionProps> = ({ currentLang }) => {
  const principles = [
    {
      number: '01',
      title: currentLang === 'bg' ? 'Достъп до Китай' : 'Access to China',
      desc: currentLang === 'bg'
        ? 'Достъп до производители и доставчици на един от най-големите пазари.'
        : 'Direct access to verified industrial plants across the world’s largest manufacturing base.',
    },
    {
      number: '02',
      title: currentLang === 'bg' ? 'Един партньор' : 'Single Partner',
      desc: currentLang === 'bg'
        ? 'Вместо множество доставчици, получавате един централен партньор.'
        : 'Instead of managing fragmented vendors, you have one point of accountability.',
    },
    {
      number: '03',
      title: currentLang === 'bg' ? 'Прозрачност' : 'Transparency',
      desc: currentLang === 'bg'
        ? 'Ясна комуникация и ясно разбиране на процеса.'
        : 'Honest pricing breakdowns, real-time shipment updates, and full visibility.',
    },
    {
      number: '04',
      title: currentLang === 'bg' ? 'Прецизност' : 'Precision',
      desc: currentLang === 'bg'
        ? 'Работим според конкретните изисквания на клиента.'
        : 'Rigorous adherence to technical blueprints, standards, and strict packaging tolerances.',
    },
    {
      number: '05',
      title: currentLang === 'bg' ? 'Отговорност' : 'Responsibility',
      desc: currentLang === 'bg'
        ? 'Поемаме координацията на процеса с фокус върху надеждното изпълнение.'
        : 'End-to-end execution backed by our commitment from factory floor to your warehouse.',
    },
  ];

  return (
    <section className="py-20 bg-[#06090F] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-left mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{currentLang === 'bg' ? 'СЕКЦИЯ 06 · ЗАЩО MERIDIANO (ПРИНЦИПИ)' : 'SECTION 06 · WHY MERIDIANO'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat mb-2">
            {currentLang === 'bg' ? 'Защо Meridiano?' : 'Why Meridiano?'}
          </h2>
          <p className="font-montserrat font-bold text-xs sm:text-sm text-slate-300">
            {currentLang === 'bg' ? 'Нашите принципи.' : 'Our Core Operating Principles.'}
          </p>
        </div>

        {/* 5 Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {principles.map((p) => (
            <div
              key={p.number}
              className="p-6 rounded-xl border border-slate-800/90 bg-[#080D1A]/70 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between text-left group"
            >
              <div>
                <div className="text-xs font-mono font-bold tracking-widest text-slate-400 group-hover:text-blue-400 transition-colors mb-4">
                  {p.number}
                </div>

                <h3 className="text-base font-bold text-white font-montserrat mb-2">
                  {p.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed font-montserrat font-bold">
                  {p.desc}
                </p>
              </div>

              <div className="w-8 h-0.5 bg-slate-800 group-hover:bg-blue-500 transition-colors mt-6 rounded-full" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
