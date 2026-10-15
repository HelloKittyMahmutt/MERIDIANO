import React from 'react';
import { Logo } from './Logo';
import { Language } from '../types';

interface FooterProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenLegal: (type: 'privacy' | 'cookie' | 'terms') => void;
  onOpenQuote: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentLang,
  onLanguageChange,
  onOpenLegal,
  onOpenQuote,
}) => {
  const navLinks = [
    { label: currentLang === 'bg' ? 'За нас' : 'About Us', href: '#about' },
    { label: currentLang === 'bg' ? 'Услуги' : 'Services', href: '#services' },
    { label: currentLang === 'bg' ? 'Какво доставяме' : 'What We Deliver', href: '#what-we-source' },
    { label: currentLang === 'bg' ? 'Как работим' : 'How We Work', href: '#how-it-works' },
    { label: currentLang === 'bg' ? 'Контакти' : 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#04070D] text-slate-400 text-xs border-t border-slate-800/90 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-8 border-b border-slate-800/80">
          
          {/* Left: Brand Identity */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Logo size="sm" layout="horizontal" variant="white" />
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-xs text-slate-400">
              {currentLang === 'bg'
                ? 'Глобално снабдяване и международна търговия.'
                : 'Global sourcing and international trade.'}
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-xs text-slate-300 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

        </div>

        {/* Bottom Legal Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('cookie')}
              className="hover:text-white transition-colors"
            >
              Cookie Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="hover:text-white transition-colors"
            >
              Terms & Conditions
            </button>
          </div>

          <div className="font-mono text-slate-400">
            © {new Date().getFullYear()} MERIDIANO. ALL RIGHTS RESERVED.
          </div>
        </div>

      </div>
    </footer>
  );
};
