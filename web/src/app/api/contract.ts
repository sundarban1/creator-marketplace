/**
 * Proposal contracts — same backend contract as mobile's `contractService`.
 * Contracts only apply to paid campaigns; free/open events have none.
 */

import { apiRequest } from '../lib/apiClient';

export interface ContractTerms {
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
  role: string | null;
  deliveryFormat: string[];
}

export interface ContractPreview {
  title: string;
  filledBody: string;
  terms: ContractTerms;
}

export interface Contract extends ContractPreview {
  id: string;
  applicationId: string;
  status: 'PENDING_BUSINESS' | 'EXECUTED' | 'VOID';
  creatorAgreedAt: string;
  businessAgreedAt: string | null;
  pdfUrl: string | null;
}

/** Renders the contract from in-progress proposal values (creator only, no DB write). */
export function previewContract(input: {
  campaignId: string;
  proposedRate: number;
  timeline: string;
  requirementId?: string;
}): Promise<ContractPreview> {
  return apiRequest<ContractPreview>('POST', '/api/contracts/preview', input).then((r) => r.data);
}

/** The persisted contract for an application — lazily created by the backend if missing. */
export function fetchContractForApplication(applicationId: string): Promise<Contract> {
  return apiRequest<Contract>('GET', `/api/contracts/application/${applicationId}`).then((r) => r.data);
}

export function fetchContractPdfUrl(contractId: string): Promise<string> {
  return apiRequest<{ pdfUrl: string }>('GET', `/api/contracts/${contractId}/pdf`).then((r) => r.data.pdfUrl);
}
