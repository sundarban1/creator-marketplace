/**
 * Business promotion management — mirrors the mobile business app's contract
 * (mobile/src/services/rewards.ts's `promotionService`).
 */

import { apiRequest } from '../lib/apiClient';

export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED';
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export interface Promotion {
  id: string;
  businessId: string;
  businessName: string | null;
  businessLogoUrl: string | null;
  businessLocation: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  minSpend: number;
  maxDiscountCap: number | null;
  dailyRedemptionLimit: number | null;
  totalRedemptionLimit: number | null;
  validFrom: string;
  validUntil: string;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Business-management view — same fields as {@link Promotion} plus this promotion's own stats. */
export interface ManagedPromotion extends Promotion {
  redemptions: number;
  creditsEarned: number;
}

export interface PromotionInput {
  title: string;
  description?: string;
  imageUrl?: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minSpend?: number;
  maxDiscountCap?: number;
  dailyRedemptionLimit?: number;
  totalRedemptionLimit?: number;
  /** ISO date-time strings. */
  validFrom: string;
  validUntil: string;
}

export function fetchMyPromotions(signal?: AbortSignal): Promise<ManagedPromotion[]> {
  return apiRequest<ManagedPromotion[]>('GET', '/api/promotions/mine', undefined, { signal }).then((r) => r.data);
}

export function fetchPromotion(id: string, signal?: AbortSignal): Promise<ManagedPromotion> {
  return apiRequest<ManagedPromotion>('GET', `/api/promotions/${id}`, undefined, { signal }).then((r) => r.data);
}

export function createPromotion(input: PromotionInput): Promise<Promotion> {
  return apiRequest<Promotion>('POST', '/api/promotions', input).then((r) => r.data);
}

export function updatePromotion(id: string, input: Partial<PromotionInput>): Promise<Promotion> {
  return apiRequest<Promotion>('PUT', `/api/promotions/${id}`, input).then((r) => r.data);
}

export function publishPromotion(id: string): Promise<Promotion> {
  return apiRequest<Promotion>('POST', `/api/promotions/${id}/publish`).then((r) => r.data);
}

export function pausePromotion(id: string): Promise<Promotion> {
  return apiRequest<Promotion>('POST', `/api/promotions/${id}/pause`).then((r) => r.data);
}

export function deletePromotion(id: string): Promise<void> {
  return apiRequest('DELETE', `/api/promotions/${id}`).then(() => undefined);
}
