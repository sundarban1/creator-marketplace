import { request } from '@/lib/api';

// ─── Points (creator) ───────────────────────────────────────────────────────

export interface ApiPointsBalance {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  earnedThisMonth: number;
}

export type PointsTransactionType = 'PROMO_REDEMPTION_DEBIT' | 'ADJUSTMENT';

export interface ApiPointsLedgerRow {
  id: string;
  type: PointsTransactionType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  /** The business's name for a PROMO_REDEMPTION_DEBIT row; null otherwise. */
  businessName: string | null;
  createdAt: string;
}

export const pointsService = {
  async getBalance(): Promise<ApiPointsBalance> {
    const res = await request<ApiPointsBalance>('GET', '/api/creator/points');
    return res.data;
  },
  async getHistory(): Promise<ApiPointsLedgerRow[]> {
    const res = await request<ApiPointsLedgerRow[]>('GET', '/api/creator/points/history');
    return res.data;
  },
};

// ─── Promotions ─────────────────────────────────────────────────────────────

export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED';
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export interface ApiPromotion {
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

/** Business-management view — same fields as ApiPromotion plus this promotion's own stats. */
export interface ApiPromotionManage extends ApiPromotion {
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

export const promotionService = {
  /** Creator discovery — ACTIVE promotions inside their current date window. */
  async listDiscoverable(): Promise<ApiPromotion[]> {
    const res = await request<ApiPromotion[]>('GET', '/api/promotions');
    return res.data;
  },
  async getById(id: string): Promise<ApiPromotion> {
    const res = await request<ApiPromotion>('GET', `/api/promotions/${id}`);
    return res.data;
  },
  /** Business — this business's own promotions, each with redemption stats. */
  async listMine(): Promise<ApiPromotionManage[]> {
    const res = await request<ApiPromotionManage[]>('GET', '/api/promotions/mine');
    return res.data;
  },
  async create(input: PromotionInput): Promise<ApiPromotion> {
    const res = await request<ApiPromotion>('POST', '/api/promotions', input);
    return res.data;
  },
  async update(id: string, input: Partial<PromotionInput>): Promise<ApiPromotion> {
    const res = await request<ApiPromotion>('PUT', `/api/promotions/${id}`, input);
    return res.data;
  },
  async publish(id: string): Promise<ApiPromotion> {
    const res = await request<ApiPromotion>('POST', `/api/promotions/${id}/publish`);
    return res.data;
  },
  async pause(id: string): Promise<ApiPromotion> {
    const res = await request<ApiPromotion>('POST', `/api/promotions/${id}/pause`);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await request('DELETE', `/api/promotions/${id}`);
  },
};

// ─── Redemptions ────────────────────────────────────────────────────────────

export type RedemptionSessionStatus = 'ISSUED' | 'SCANNED' | 'BILL_ENTERED' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface ApiPromotionSnapshot {
  title: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minSpend: number;
  maxDiscountCap: number | null;
}

export interface ApiRedemptionSession {
  id: string;
  promotionId: string;
  promotionTitle: string;
  creatorName: string | null;
  businessName: string | null;
  status: RedemptionSessionStatus;
  promotionSnapshot: ApiPromotionSnapshot;
  billAmount: number | null;
  discountAmount: number | null;
  pointsCost: number | null;
  creditsEarned: number | null;
  issuedAt: string;
  expiresAt: string;
  scannedAt: string | null;
  billEnteredAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export const redemptionService = {
  // Creator side
  async issue(promotionId: string): Promise<{ session: ApiRedemptionSession; qrCodeDataUrl: string }> {
    const res = await request<{ session: ApiRedemptionSession; qrCodeDataUrl: string }>(
      'POST', '/api/redemptions', { promotionId },
    );
    return res.data;
  },
  async confirm(sessionId: string): Promise<ApiRedemptionSession> {
    const res = await request<ApiRedemptionSession>('POST', `/api/redemptions/${sessionId}/confirm`);
    return res.data;
  },
  // Business side — scan is keyed by the QR's opaque token, not the session id
  // (the business doesn't know the session id until after it scans).
  async scan(token: string): Promise<ApiRedemptionSession> {
    const res = await request<ApiRedemptionSession>('POST', `/api/redemptions/scan/${token}`);
    return res.data;
  },
  async enterBill(sessionId: string, billAmount: number): Promise<ApiRedemptionSession> {
    const res = await request<ApiRedemptionSession>('POST', `/api/redemptions/${sessionId}/bill`, { billAmount });
    return res.data;
  },
  // Either role
  async cancel(sessionId: string, reason?: string): Promise<ApiRedemptionSession> {
    const res = await request<ApiRedemptionSession>('POST', `/api/redemptions/${sessionId}/cancel`, { reason });
    return res.data;
  },
};

// ─── Business Credits ───────────────────────────────────────────────────────

export interface ApiCreditsBalance {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export type CreditsTransactionType = 'PROMO_REDEMPTION_CREDIT' | 'CAMPAIGN_BUDGET_SPEND' | 'ADJUSTMENT';

export interface ApiCreditsLedgerRow {
  id: string;
  type: CreditsTransactionType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
}

export const creditsService = {
  async getBalance(): Promise<ApiCreditsBalance> {
    const res = await request<ApiCreditsBalance>('GET', '/api/business/credits');
    return res.data;
  },
  async getHistory(): Promise<ApiCreditsLedgerRow[]> {
    const res = await request<ApiCreditsLedgerRow[]>('GET', '/api/business/credits/history');
    return res.data;
  },
};
