import { request } from '@/lib/api';

// Contracts only apply to paid campaigns — free/open events have no
// price/deliverable-for-payment exchange to put under agreement.

export type ContractTerms = {
  price: string;
  priceRaw: number;
  paymentType: string;
  deadline: string | null;
  timeline: string;
  deliverables: string;
  contentGuidelines: string[];
  platforms: string[];
  approvalRequirements: string | null;
  location: string | null;
  platformCommission: number | null;
};

export type ContractPreview = {
  title: string;
  filledBody: string;
  terms: ContractTerms;
};

export type Contract = {
  id: string;
  applicationId: string;
  title: string;
  filledBody: string;
  terms: ContractTerms;
  status: 'PENDING_BUSINESS' | 'EXECUTED' | 'VOID';
  creatorAgreedAt: string;
  businessAgreedAt: string | null;
  pdfUrl: string | null;
};

export const contractService = {
  async previewContract(campaignId: string, proposedRate: number, timeline: string): Promise<ContractPreview> {
    const res = await request<ContractPreview>('POST', '/api/contracts/preview', { campaignId, proposedRate, timeline });
    return res.data;
  },

  async getContractForApplication(applicationId: string): Promise<Contract> {
    const res = await request<Contract>('GET', `/api/contracts/application/${applicationId}`);
    return res.data;
  },

  async getContractPdfUrl(contractId: string): Promise<string> {
    const res = await request<{ pdfUrl: string }>('GET', `/api/contracts/${contractId}/pdf`);
    return res.data.pdfUrl;
  },
};
