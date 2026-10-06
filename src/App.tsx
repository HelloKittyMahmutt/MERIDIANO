import React, { useState } from 'react';
import { Language } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { InteractiveLogisticsJourney } from './components/InteractiveLogisticsJourney';
import { WhatWeDeliverSection } from './components/WhatWeDeliverSection';
import { HowWeWorkSection } from './components/HowWeWorkSection';
import { WhyMeridianoSection } from './components/WhyMeridianoSection';
import { InquiryAndContactSection } from './components/InquiryAndContactSection';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { CargoPlaneCalibrationStudio } from './components/CargoPlaneCalibrationStudio';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('bg');
  // Temporarily display ONLY the cargo plane calibration studio
  const [activeView, setActiveView] = useState<'plane-calibration' | 'full-website'>('plane-calibration');
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    type: 'privacy' | 'cookie' | 'terms' | null;
  }>({
    isOpen: false,
    type: null,
  });

  const handleOpenQuote = () => {
    const el = document.querySelector('#contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenLegal = (type: 'privacy' | 'cookie' | 'terms') => {
    setLegalModal({ isOpen: true, type });
  };

  const handleCloseLegal = () => {
    setLegalModal({ isOpen: false, type: null });
  };

  // STEP 8: Temporarily display ONLY the cargo plane
  if (activeView === 'plane-calibration') {
    return (
      <CargoPlaneCalibrationStudio 
        onContinueToSite={() => setActiveView('full-website')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Banner to easily return to Calibration Studio */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between z-50">
        <span className="text-slate-300 font-mono">
          MERIDIANO Production Preview
        </span>
        <button
          type="button"
          onClick={() => setActiveView('plane-calibration')}
          className="text-cyan-400 hover:text-cyan-300 font-mono font-bold uppercase underline"
        >
          Return to 3D Cargo Plane Calibration Studio ➔
        </button>
      </div>

      {/* 1. Light Elegant Top Bar with Visible #0F2747 Logo (No "Начало") */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenQuote={handleOpenQuote}
      />

      {/* Main Lean Architecture: Focused, No Clutter, Direct & Powerful */}
      <main className="flex-1">
        {/* 2. Hero: Вашата стока, Нашата отговорност. От Китай до вас. */}
        <Hero
          currentLang={currentLang}
          onOpenQuote={handleOpenQuote}
        />

        {/* 3. За нас: Свързваме България със света (Чисто, без видеото) */}
        <AboutSection
          currentLang={currentLang}
          onOpenQuote={handleOpenQuote}
        />

        {/* 4. Контейнери & Камион: Жива телеметрия с писане в реално време */}
        <InteractiveLogisticsJourney
          currentLang={currentLang}
          onOpenQuote={handleOpenQuote}
        />

        {/* 5. Какво можем да доставим: 6 Фотографски категории */}
        <WhatWeDeliverSection
          currentLang={currentLang}
          onOpenQuote={handleOpenQuote}
        />

        {/* 6. Как работим: 5-те ясни стъпки */}
        <HowWeWorkSection
          currentLang={currentLang}
          onOpenQuote={handleOpenQuote}
        />

        {/* 6. Защо Meridiano? Нашите 5 принципа */}
        <WhyMeridianoSection
          currentLang={currentLang}
        />

        {/* 7. Какво търсите? - Форма за запитване & Фирмени контакти */}
        <InquiryAndContactSection
          currentLang={currentLang}
        />
      </main>

      {/* 8. Минималистичен Футър */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenLegal={handleOpenLegal}
        onOpenQuote={handleOpenQuote}
      />

      {/* Правни условия модал */}
      <LegalModal
        isOpen={legalModal.isOpen}
        type={legalModal.type}
        currentLang={currentLang}
        onClose={handleCloseLegal}
      />
    </div>
  );
}
