"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCampaignDto = toCampaignDto;
exports.toApplicationDto = toApplicationDto;
function toCampaignDto(c) {
    const dto = {
        id: c.id,
        title: c.title,
        description: c.description,
        template: c.template,
        category: c.category,
        goals: (c.goals ?? []),
        platform: c.platform,
        minFollowers: c.minFollowers,
        contentType: c.contentType,
        deliverables: c.deliverables,
        paymentType: c.paymentType,
        deadline: c.deadline.toISOString(),
        eventDate: c.eventDate ? c.eventDate.toISOString() : null,
        location: c.location,
        budgetMin: c.budgetMin,
        budgetMax: c.budgetMax,
        status: c.status,
        isFeatured: c.isFeatured,
        creatorsNeeded: c.creatorsNeeded,
        campaignType: c.campaignType,
        capacity: c.capacity,
        venue: c.venue,
        benefits: (c.benefits ?? []),
        eventStatus: c.eventStatus,
        paymentStatus: c.paymentStatus,
        paidAt: c.paidAt ? c.paidAt.toISOString() : null,
        paymentMethod: c.paymentMethod,
        createdAt: c.createdAt.toISOString(),
    };
    if (c.business != null)
        dto.business = c.business;
    if (c._count != null)
        dto._count = c._count;
    return dto;
}
function toApplicationDto(a) {
    const dto = {
        id: a.id,
        campaignId: a.campaignId,
        coverLetter: a.coverLetter,
        proposedRate: a.proposedRate,
        timeline: a.timeline,
        socialHandles: (a.socialHandles ?? {}),
        portfolioUrl: a.portfolioUrl,
        status: a.status,
        workStatus: a.workStatus,
        workNote: a.workNote,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        deliverableUrls: a.deliverableUrls,
        paymentStatus: a.paymentStatus ?? 'UNPAID',
        paidAt: a.paidAt ? (a.paidAt instanceof Date ? a.paidAt.toISOString() : a.paidAt) : null,
        createdAt: a.createdAt.toISOString(),
    };
    if (a.campaign != null) {
        dto.campaign = {
            ...a.campaign,
            deadline: a.campaign.deadline ? a.campaign.deadline.toISOString() : undefined,
            paidAt: a.campaign.paidAt instanceof Date
                ? a.campaign.paidAt.toISOString()
                : (a.campaign.paidAt ?? null),
        };
    }
    if (a.creator != null)
        dto.creator = a.creator;
    return dto;
}
//# sourceMappingURL=campaign.dto.js.map