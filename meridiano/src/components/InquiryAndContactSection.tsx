import React, { useState } from 'react';
import { Language } from '../types';
import { 
  Building, 
  MapPin, 
  Mail, 
  Phone, 
  CheckCircle2, 
  UploadCloud, 
  ArrowRight, 
  FileText,
  X,
  ExternalLink
} from 'lucide-react';

interface InquiryAndContactSectionProps {
  currentLang: Language;
}

export const InquiryAndContactSection: React.FC<InquiryAndContactSectionProps> = ({ currentLang }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    product: '',
    quantity: '',
    country: currentLang === 'bg' ? 'България' : 'Bulgaria',
    budget: '',
    file: null as File | null,
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'Required';
    if (!formData.phone.trim()) errs.phone = 'Required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email required';
    if (!formData.product.trim()) errs.product = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitted(true);
  };

  return (
    <section id="contact" className="py-20 bg-[#06090F] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start text-left">
          
          {/* LEFT: Inquiry Form (Col 1-8) */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{currentLang === 'bg' ? 'СЕКЦИЯ 07 · ЗАПИТВАНЕ И КОНТАКТИ' : 'SECTION 07 · INQUIRY & CONTACT'}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat mb-2">
                {currentLang === 'bg' ? 'Какво търсите?' : 'What Are You Sourcing?'}
              </h2>
              <p className="font-montserrat font-bold text-xs sm:text-sm text-slate-300">
                {currentLang === 'bg'
                  ? 'Въведете вашите изисквания и ще се свържем с вас с конкретно предложение.'
                  : 'Submit your specifications and our team will get in touch with direct factory terms.'}
              </p>
            </div>

            {isSubmitted ? (
              <div className="p-8 rounded-2xl border border-blue-500/50 bg-slate-900/90 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-montserrat">
                  {currentLang === 'bg' ? 'Запитването е прието успешно!' : 'Inquiry Submitted Successfully!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  {currentLang === 'bg'
                    ? 'Нашият екип ще прегледа спецификациите ви и ще се свърже с вас с предварителна оферта.'
                    : 'Our sourcing team will audit your requirements and get back to you with manufacturer pricing.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors"
                >
                  {currentLang === 'bg' ? 'Ново запитване' : 'Submit Another'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl border border-slate-800/90 bg-[#080D1A]/80 shadow-2xl space-y-4">
                
                {/* Row 1: Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Име *' : 'First Name *'}
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder={currentLang === 'bg' ? 'Иван' : 'John'}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                        errors.firstName ? 'border-red-500' : 'border-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Фамилия *' : 'Last Name *'}
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder={currentLang === 'bg' ? 'Иванов' : 'Doe'}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Телефон *' : 'Phone *'}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+359 88 123 4567"
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                        errors.phone ? 'border-red-500' : 'border-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Имейл *' : 'Email *'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="office@company.com"
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                        errors.email ? 'border-red-500' : 'border-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Row 3: Product Description & Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Какъв продукт търсите? *' : 'Product Type *'}
                    </label>
                    <input
                      type="text"
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      placeholder={currentLang === 'bg' ? 'напр. Безшевни сондажни тръби' : 'e.g., Seamless Casing Pipes'}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                        errors.product ? 'border-red-500' : 'border-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Количество *' : 'Quantity / Volume *'}
                    </label>
                    <input
                      type="text"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder={currentLang === 'bg' ? 'напр. 2 x 40ft HQ контейнера' : 'e.g., 2 x 40ft containers'}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Row 4: Country & Target Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Държава за доставка *' : 'Destination Country *'}
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Bulgaria"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                      {currentLang === 'bg' ? 'Таргет бюджет' : 'Target Budget'}
                    </label>
                    <input
                      type="text"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder={currentLang === 'bg' ? 'напр. EUR / USD' : 'e.g., EUR / USD'}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* File Upload Box */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                    {currentLang === 'bg' ? 'Прикачете файл (чертеж, мостра, спецификация)' : 'Attach Blueprint / Specification'}
                  </label>
                  <label className="border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition-colors">
                    <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-300">
                      {formData.file ? formData.file.name : (currentLang === 'bg' ? 'Кликнете за качване (PDF, Excel, JPG)' : 'Click to upload (PDF, Excel, JPG)')}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData({ ...formData, file: e.target.files[0] });
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-bold text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95"
                  >
                    <span>{currentLang === 'bg' ? 'Изпратете запитване' : 'Send Inquiry'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#040711]" />
                  </button>
                </div>

              </form>
            )}
          </div>

          {/* RIGHT: Corporate Contact Panel (Col 9-12) */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-montserrat mb-2">
                {currentLang === 'bg' ? 'Контакти' : 'Contact'}
              </h3>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800/90 bg-[#080D1A]/80 shadow-2xl space-y-6">
              
              <div className="space-y-1">
                <span className="text-xs font-montserrat font-bold uppercase tracking-widest text-slate-400 block">
                  {currentLang === 'bg' ? 'ТЪРГОВСКО ДРУЖЕСТВО' : 'CORPORATE ENTITY'}
                </span>
                <div className="text-lg sm:text-xl font-montserrat font-bold text-white tracking-wide">
                  MERIDIANO EOOD
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-800">
                <span className="text-xs font-montserrat font-bold uppercase tracking-widest text-slate-400 block">
                  {currentLang === 'bg' ? 'ДЕЙНОСТ' : 'OPERATIONAL SCOPE'}
                </span>
                <div className="text-xs sm:text-sm text-slate-200 font-montserrat font-bold">
                  {currentLang === 'bg'
                    ? 'Глобално снабдяване и директен морски внос от Китай'
                    : 'Global sourcing and direct maritime import from China'}
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-800">
                <span className="text-xs font-montserrat font-bold uppercase tracking-widest text-slate-400 block">
                  {currentLang === 'bg' ? 'КООРДИНАЦИЯ' : 'COORDINATION'}
                </span>
                <div className="text-xs sm:text-sm text-slate-200 font-montserrat font-bold">
                  {currentLang === 'bg'
                    ? 'Европейски & Азиатски часови зони (24/7 мониторинг)'
                    : 'European & Asian time zones (24/7 corridor monitoring)'}
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-800">
                <span className="text-xs font-montserrat font-bold uppercase tracking-widest text-slate-400 block">
                  {currentLang === 'bg' ? 'ОНЛАЙН ПОРТАЛ' : 'OFFICIAL DOMAIN'}
                </span>
                <div className="text-xs text-blue-400 font-mono font-bold">
                  meridianoco.com
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
