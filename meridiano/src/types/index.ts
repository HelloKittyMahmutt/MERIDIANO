export type Language = 'bg' | 'en';

export interface ServiceItem {
  number: string;
  title: string;
  description: string;
  focus: string;
}

export interface SourcingCategory {
  id: string;
  number: string;
  title: string;
  description: string;
  examples: string[];
  image?: string;
  tag: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  detail: string;
}

export interface PrincipleItem {
  number: string;
  title: string;
  description: string;
}

export interface InquiryFormData {
  fullName: string;
  company: string;
  phone: string;
  email: string;
  productDescription: string;
  quantity: string;
  specifications: string;
  deliveryCountry: string;
  targetBudget: string;
  additionalNotes: string;
  files: Array<{ name: string; size: number; type: string }>;
}
