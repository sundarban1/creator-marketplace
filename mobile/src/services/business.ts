import { request } from '@/lib/api';

export type BusinessListItem = {
  id:           string;
  businessName: string;
  description:  string | null;
  logoUrl:      string | null;
  website:      string | null;
  categories:   string[];
  isVerified:   boolean;
  _count:       { campaigns: number };
};

export type BusinessActiveCampaign = {
  id:          string;
  title:       string;
  platform:    string;
  category:    string;
  budgetMin:   number;
  budgetMax:   number;
  deadline:    string;
  contentType: string;
  isFeatured:  boolean;
  location:    string | null;
  _count:      { applications: number };
};

export type BusinessDetail = BusinessListItem & {
  createdAt:           string;
  userId:              string;
  campaigns:           BusinessActiveCampaign[];
  showPublicProfile:   boolean;
  hideContactDetails:  boolean;
  allowDirectMessages: boolean;
};

export const businessService = {
  async listBusinesses(params?: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[]; // city labels, OR-matched
    page?:      number;
    limit?:     number;
  }) {
    const res = await request<{ businesses: BusinessListItem[]; total: number }>(
      'GET',
      '/api/creator/businesses',
      undefined,
      {
        search:    params?.search,
        category:  params?.category,
        platform:  params?.platform,
        locations: params?.locations && params.locations.length > 0
                     ? params.locations.join(',')
                     : undefined,
        page:      params?.page ?? 1,
        limit:     params?.limit ?? 20,
      },
    );
    return res.data;
  },

  async getBusinessById(id: string) {
    const res = await request<BusinessDetail>('GET', `/api/creator/businesses/${id}`);
    return res.data;
  },

  async getMyProfile(): Promise<{ showPublicProfile: boolean; hideContactDetails: boolean; allowDirectMessages: boolean }> {
    const res = await request<{ showPublicProfile: boolean; hideContactDetails: boolean; allowDirectMessages: boolean }>(
      'GET', '/api/business/profile'
    );
    return {
      showPublicProfile:   res.data.showPublicProfile   ?? true,
      hideContactDetails:  res.data.hideContactDetails  ?? false,
      allowDirectMessages: res.data.allowDirectMessages ?? true,
    };
  },

  async updatePrivacy(data: { showPublicProfile?: boolean; hideContactDetails?: boolean; allowDirectMessages?: boolean }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },
};
