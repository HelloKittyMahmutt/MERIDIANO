import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Language } from '../types';
import { translations } from '../content/translations';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenQuote: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onOpenQuote,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[currentLang];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Removed "Начало" per user instruction!
  const navLinks = [
    { label: currentLang === 'bg' ? 'За нас' : 'About Us', href: '#about' },
    { label: currentLang === 'bg' ? 'Път на стоката (3D)' : '3D Cargo Journey', href: '#journey' },
    { label: currentLang === 'bg' ? 'Услуги' : 'Services', href: '#services' },
    { label: currentLang === 'bg' ? 'Какво доставяме' : 'What We Deliver', href: '#what-we-source' },
    { label: currentLang === 'bg' ? 'Как работим' : 'How We Work', href: '#how-it-works' },
    { label: currentLang === 'bg' ? 'Контакти' : 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 backdrop-blur-xl border-b border-slate-200 py-3 shadow-md shadow-slate-200/50'
          : 'bg-[#F8FAFC]/95 backdrop-blur-md border-b border-slate-200/90 py-3.5 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[50px]">
          
          {/* LEFT: Official MERIDIANO Logo in original #0F2747 on the light top bar */}
          <div className="flex items-center">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, '#home')}
              className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-sm hover:opacity-90 transition-opacity"
              aria-label="Meridiano EOOD"
            >
              <Logo size="sm" layout="horizontal" color="#0F2747" />
            </a>
          </div>

          {/* RIGHT: Navigation Links, Language Switcher & Primary CTA */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Desktop Navigation Links on light bar */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-xs uppercase tracking-[0.12em] font-semibold text-slate-700 hover:text-[#0F2747] transition-colors duration-150 py-1"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Clean Language Selector (BG & EN - Symmetrical on light bar) */}
            <div className="flex items-center p-0.5 rounded-lg border border-slate-300 bg-slate-200/80 shadow-xs font-mono text-xs">
              <button
                type="button"
                onClick={() => onLanguageChange('bg')}
                className={`px-2.5 py-1 rounded transition-all font-bold ${
                  currentLang === 'bg'
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Превключи на Български"
              >
                BG
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2.5 py-1 rounded transition-all font-bold ${
                  currentLang === 'en'
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={onOpenQuote}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-widest uppercase text-white bg-[#0F2747] hover:bg-[#1a3f6f] transition-all duration-150 rounded-full shadow-md active:scale-95"
            >
              <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Trigger */}
            <div className="flex lg:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-[#0F2747] focus:outline-none"
                aria-label={mobileMenuOpen ? 'Затвори меню' : 'Отвори меню'}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown on light bar */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-semibold tracking-wider uppercase text-slate-800 hover:text-[#0F2747] py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {/* Mobile Language Switcher */}
            <div className="flex items-center p-0.5 rounded border border-slate-300 bg-slate-100 font-mono text-xs">
              <button
                type="button"
                onClick={() => onLanguageChange('bg')}
                className={`px-3 py-1 font-semibold ${
                  currentLang === 'bg' ? 'bg-[#0F2747] text-white' : 'text-slate-600'
                }`}
              >
                BG
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1 font-semibold ${
                  currentLang === 'en' ? 'bg-[#0F2747] text-white' : 'text-slate-600'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenQuote();
              }}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-widest uppercase bg-[#0F2747] text-white rounded-full"
            >
              <span>{currentLang === 'bg' ? 'Запитване' : 'Inquiry'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
