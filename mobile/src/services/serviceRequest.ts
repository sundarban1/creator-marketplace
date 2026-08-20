import { request } from '@/lib/api';

export type ServiceRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface ApiServiceRequestReceived {
  id: string;
  message: string;
  budget: number | null;
  status: ServiceRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  service: { id: string; name: string; startingPrice: number | null; pricingModel: string };
  business: { id: string; businessName: string | null; logoUrl: string | null };
}

export interface ApiServiceRequestSent {
  id: string;
  message: string;
  budget: number | null;
  status: ServiceRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  service: { id: string; name: string; startingPrice: number | null; pricingModel: string };
  creator: { id: string; fullName: string | null; avatarUrl: string | null };
}

// §33/34 — a business directly asking a provider about one of their listed
// Services, distinct from the Opportunity/apply flow. See backend's
// service-request module comment for why this is deliberately lightweight
// (PENDING → ACCEPTED/DECLINED only, no deliverables/payment tracking).
export const serviceRequestService = {
  async create(serviceId: string, message: string, budget?: number): Promise<void> {
    await request('POST', '/api/service-requests', { serviceId, message, budget });
  },

  async listReceived(status?: ServiceRequestStatus): Promise<ApiServiceRequestReceived[]> {
    const res = await request<ApiServiceRequestReceived[]>('GET', '/api/service-requests/received', undefined, status ? { status } : undefined);
    return res.data;
  },

  async listSent(): Promise<ApiServiceRequestSent[]> {
    const res = await request<ApiServiceRequestSent[]>('GET', '/api/service-requests/sent');
    return res.data;
  },

  async respond(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
    await request('PUT', `/api/service-requests/${id}/respond`, { status });
  },
};
