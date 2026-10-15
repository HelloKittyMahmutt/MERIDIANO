import React from 'react';
import { Language } from '../types';
import { translations } from '../content/translations';
import { X, ShieldAlert } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'cookie' | 'terms' | null;
  currentLang: Language;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  type,
  currentLang,
  onClose,
}) => {
  if (!isOpen || !type) return null;

  const t = translations[currentLang];
  const l = t.legal;

  const contentMap = {
    privacy: {
      title: l.privacyTitle,
      body: l.privacyPlaceholder,
    },
    cookie: {
      title: l.cookieTitle,
      body: l.cookiePlaceholder,
    },
    terms: {
      title: l.termsTitle,
      body: l.termsPlaceholder,
    },
  };

  const activeContent = contentMap[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B101D] border border-slate-700 rounded-sm p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              {activeContent.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p className="font-medium text-slate-200">
            {l.privacyIntro}
          </p>
          <div className="p-4 rounded bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-400 leading-relaxed">
            {activeContent.body}
          </div>
          <p className="text-xs text-slate-500">
            MERIDIANO EOOD · Krumovgrad, Bulgaria · meridianoco.com
          </p>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm transition-colors"
          >
            {l.close}
          </button>
        </div>
      </div>
    </div>
  );
};
