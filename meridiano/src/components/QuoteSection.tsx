import React, { useState } from 'react';
import { Language, InquiryFormData } from '../types';
import { translations } from '../content/translations';
import { UploadCloud, CheckCircle2, FileText, X, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface QuoteSectionProps {
  currentLang: Language;
}

export const QuoteSection: React.FC<QuoteSectionProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const q = t.quote;

  const [formData, setFormData] = useState<InquiryFormData>({
    fullName: '',
    company: '',
    phone: '',
    email: '',
    productDescription: '',
    quantity: '',
    specifications: '',
    deliveryCountry: 'Bulgaria',
    targetBudget: '',
    additionalNotes: '',
    files: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = currentLang === 'bg' ? 'Моля, въведете име и фамилия.' : 'Please enter your full name.';
    }
    if (!formData.company.trim()) {
      errs.company = currentLang === 'bg' ? 'Моля, въведете име на фирмата.' : 'Please enter your company name.';
    }
    if (!formData.phone.trim()) {
      errs.phone = currentLang === 'bg' ? 'Моля, въведете телефон за връзка.' : 'Please enter a contact phone number.';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = currentLang === 'bg' ? 'Моля, въведете валиден имейл адрес.' : 'Please enter a valid email address.';
    }
    if (!formData.productDescription.trim()) {
      errs.productDescription = currentLang === 'bg' ? 'Моля, опишете търсения продукт.' : 'Please describe the product you wish to source.';
    }
    if (!formData.quantity.trim()) {
      errs.quantity = currentLang === 'bg' ? 'Моля, посочете търсено количество.' : 'Please specify the required quantity.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate real local processing time without making fake API calls
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      company: '',
      phone: '',
      email: '',
      productDescription: '',
      quantity: '',
      specifications: '',
      deliveryCountry: 'Bulgaria',
      targetBudget: '',
      additionalNotes: '',
      files: [],
    });
    setErrors({});
    setIsSubmitted(false);
  };

  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: Array<{ name: string; size: number; type: string }> = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size <= 15 * 1024 * 1024) {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type || 'document',
        });
      }
    }
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  return (
    <section id="quote" className="py-16 sm:py-20 bg-[#080C15] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300 mb-3 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>{q.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            {q.headline}
          </h2>
          <p className="text-base text-slate-300 leading-relaxed font-normal">
            {q.subheadline}
          </p>
        </div>

        {/* Main Inquiry Card */}
        <div className="steel-panel p-6 sm:p-10 rounded-sm border border-slate-700/80 shadow-2xl relative">
          {isSubmitted ? (
            /* Success Confirmation State */
            <div className="py-10 text-center space-y-6">
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mx-auto text-slate-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-3 max-w-lg mx-auto">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {q.successTitle}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  {q.successMessage}
                </p>
              </div>

              {/* Inquiry Summary Preview */}
              <div className="p-4 rounded bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="font-mono text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-800">
                  {currentLang === 'bg' ? 'ОБОБЩЕНИЕ НА ЗАПИТВАНЕТО' : 'INQUIRY SUMMARY'}
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{q.fields.company}:</span>
                  <span className="font-semibold text-white">{formData.company}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{q.fields.productDescription}:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">{formData.productDescription}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{q.fields.quantity}:</span>
                  <span className="font-semibold text-white">{formData.quantity}</span>
                </div>
                {formData.files.length > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>{currentLang === 'bg' ? 'Прикачени файлове:' : 'Attached files:'}</span>
                    <span className="font-mono text-slate-200">{formData.files.length}</span>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{q.resetButton}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Inquiry Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.fullName} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder={q.placeholders.fullName}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.fullName ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.company} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={q.placeholders.company}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.company ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.company && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.company}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.phone} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={q.placeholders.phone}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.phone ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.email} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={q.placeholders.email}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.email ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Product Description & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.productDescription} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.productDescription}
                    onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                    placeholder={q.placeholders.productDescription}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.productDescription ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.productDescription && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.productDescription}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.quantity} <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder={q.placeholders.quantity}
                    className={`w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                      errors.quantity ? 'border-rose-500/80' : 'border-slate-800 focus:border-slate-600'
                    }`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.quantity}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: Specifications & Delivery Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.specifications}
                  </label>
                  <input
                    type="text"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    placeholder={q.placeholders.specifications}
                    className="w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border border-slate-800 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.deliveryCountry}
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryCountry}
                    onChange={(e) => setFormData({ ...formData, deliveryCountry: e.target.value })}
                    placeholder={q.placeholders.deliveryCountry}
                    className="w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border border-slate-800 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Row 5: Target Budget & Additional Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.targetBudget}
                  </label>
                  <input
                    type="text"
                    value={formData.targetBudget}
                    onChange={(e) => setFormData({ ...formData, targetBudget: e.target.value })}
                    placeholder={q.placeholders.targetBudget}
                    className="w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border border-slate-800 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    {q.fields.additionalNotes}
                  </label>
                  <input
                    type="text"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    placeholder={q.placeholders.additionalNotes}
                    className="w-full px-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-sm border border-slate-800 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Drag & Drop File Upload Area */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  {q.fields.filesLabel}
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className={`p-6 rounded-sm border-2 border-dashed text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-slate-400 bg-slate-800/60'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">
                    {currentLang === 'bg'
                      ? 'Кликнете тук или пуснете файлове (чертежи, спецификации, снимки)'
                      : 'Click to select or drag and drop files (drawings, specs, photos)'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    {q.fields.filesHint}
                  </p>
                </div>

                {/* Uploaded Files Chips List */}
                {formData.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-800 border border-slate-700 text-xs text-slate-200"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[160px]">{file.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-400 hover:text-white ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit CTA & Privacy Note */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-[11px] text-slate-400 max-w-sm">
                  {q.privacyNotice}
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-[#080C15] bg-slate-100 hover:bg-white disabled:opacity-50 rounded-sm transition-colors shadow-lg whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span>{q.submitting}</span>
                  ) : (
                    <>
                      <span>{q.submitButton}</span>
                      <ArrowRight className="w-4 h-4 text-[#080C15]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
