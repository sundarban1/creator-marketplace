import { request } from '@/lib/api';

export interface LegalSection {
  id:        string;
  type:      'PRIVACY_POLICY' | 'TERMS' | 'GUIDELINES';
  title:     string;
  body:      string;
  icon:      string | null;
  order:     number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocument {
  sections:    LegalSection[];
  lastUpdated: string | null;
}

export type LegalSlug = 'terms' | 'privacy-policy';

export const legalService = {
  async getDocument(slug: LegalSlug): Promise<LegalDocument> {
    const res = await request<LegalDocument>('GET', `/api/legal/${slug}`);
    return res.data;
  },
};
