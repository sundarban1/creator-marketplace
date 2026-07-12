import { request } from '@/lib/api';

export interface ApiPlatform {
  id: string;
  icon: string;
  iconBg: string;
  color: string;
  name: string;
  key: string;
}

export const platformService = {
  async getPlatforms(): Promise<ApiPlatform[]> {
    const res = await request<ApiPlatform[]>('GET', '/api/platforms');
    return res.data;
  },
};
