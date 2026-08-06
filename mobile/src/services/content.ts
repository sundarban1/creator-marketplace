import { request } from '@/lib/api';

export interface HelpArticle {
  id:       string;
  question: string;
  answer:   string;
  category: string;
}

export const contentService = {
  async getHelpArticles(): Promise<HelpArticle[]> {
    const res = await request<HelpArticle[]>('GET', '/api/help');
    return res.data;
  },

  async getFaqArticles(): Promise<HelpArticle[]> {
    const res = await request<HelpArticle[]>('GET', '/api/faq');
    return res.data;
  },
};
