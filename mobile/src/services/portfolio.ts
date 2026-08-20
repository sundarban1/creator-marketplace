import { request } from '@/lib/api';

export type MediaType = 'IMAGE' | 'VIDEO';

export interface ApiPortfolioItem {
  id: string;
  creatorProfileId: string;
  title: string | null;
  description: string | null;
  category: string | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  externalUrl: string | null;
  createdAt: string;
}

export interface CreatePortfolioItemInput {
  title?: string;
  description?: string;
  category?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  externalUrl?: string;
}

export type UpdatePortfolioItemInput = CreatePortfolioItemInput;

// Structured portfolio entries (backed by the PortfolioItem table) — distinct
// from creatorService.addPortfolioLink/removePortfolioLink, which manage the
// older, simpler label+url list still used elsewhere. Both are valid; this is
// the richer one (media, category, description) for the provider marketplace work.
export const portfolioService = {
  async listMine(): Promise<ApiPortfolioItem[]> {
    const res = await request<ApiPortfolioItem[]>('GET', '/api/creator/portfolio-items');
    return res.data;
  },

  async create(data: CreatePortfolioItemInput): Promise<ApiPortfolioItem> {
    const res = await request<ApiPortfolioItem>('POST', '/api/creator/portfolio-items', data);
    return res.data;
  },

  async update(id: string, data: UpdatePortfolioItemInput): Promise<ApiPortfolioItem> {
    const res = await request<ApiPortfolioItem>('PUT', `/api/creator/portfolio-items/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await request('DELETE', `/api/creator/portfolio-items/${id}`);
  },
};
