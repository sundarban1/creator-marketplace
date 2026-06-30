export declare function sendOtpEmail(email: string, code: string): Promise<void>;
export declare function sendWelcomeEmail(email: string, name: string, role: 'CREATOR' | 'BUSINESS'): Promise<void>;
export declare function sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
export declare function sendSupportNotification(opts: {
    adminEmail: string;
    userEmail: string;
    topic: string;
    message: string;
}): Promise<void>;
export declare function sendReportNotification(opts: {
    adminEmail: string;
    userEmail: string;
    type: string;
    description: string;
}): Promise<void>;
export declare function sendPaymentSecuredEmail(creatorEmail: string, creatorName: string, campaignTitle: string, businessName: string, amount: number): Promise<void>;
export declare function sendWorkStartedEmail(businessEmail: string, businessName: string, campaignTitle: string, creatorName: string): Promise<void>;
export declare function sendWorkSubmittedEmail(businessEmail: string, businessName: string, campaignTitle: string, creatorName: string, deliverableUrls?: string | null): Promise<void>;
export declare function sendWorkApprovedEmail(creatorEmail: string, creatorName: string, campaignTitle: string, amount: number): Promise<void>;
export declare function sendRevisionRequestEmail(creatorEmail: string, creatorName: string, campaignTitle: string, note: string): Promise<void>;
export declare function sendEventAcceptedEmail(creatorEmail: string, creatorName: string, eventTitle: string, businessName: string, eventDate?: Date | null, venue?: string | null, benefits?: string[]): Promise<void>;
export declare function sendCampaignCancelledEmail(recipientEmail: string, recipientName: string, campaignTitle: string, isCreator: boolean, refundNote?: string): Promise<void>;
//# sourceMappingURL=email.d.ts.map