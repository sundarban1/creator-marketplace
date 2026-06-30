"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const error_1 = require("../../middleware/error");
const campaign_dto_1 = require("./campaign.dto");
const business_repository_1 = require("../business/business.repository");
const creator_repository_1 = require("../creator/creator.repository");
const campaign_repository_1 = require("./campaign.repository");
const favorite_repository_1 = require("../creator/favorite.repository");
const notification_service_1 = require("../notifications/notification.service");
const socket_1 = require("../../socket");
const translation_1 = require("../../utils/translation");
const email_1 = require("../../utils/email");
const CAMPAIGN_FIELDS = ['title', 'description', 'category', 'goals', 'platform', 'contentType', 'deliverables', 'paymentType', 'location', 'venue', 'benefits'];
class CampaignService {
    repo;
    businessRepo;
    creatorRepo;
    favoriteRepo;
    constructor() {
        this.repo = new campaign_repository_1.CampaignRepository();
        this.businessRepo = new business_repository_1.BusinessRepository();
        this.creatorRepo = new creator_repository_1.CreatorRepository();
        this.favoriteRepo = new favorite_repository_1.FavoriteRepository();
    }
    async create(userId, input) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const raw = await this.repo.create({
            businessId: business.id,
            ...input,
            deadline: new Date(input.deadline),
            eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
        });
        const campaign = (0, campaign_dto_1.toCampaignDto)(raw);
        // Broadcast new active campaign to all connected creators in real time
        if (raw.status === 'ACTIVE') {
            (0, socket_1.emitToRole)('CREATOR', 'campaign:new', campaign);
        }
        // Notify creators who have favorited this business
        this.favoriteRepo.getCreatorUserIdsForBusiness(business.id).then((userIds) => {
            if (userIds.length === 0)
                return;
            const notifications = userIds.map((uid) => ({
                userId: uid,
                type: 'new_campaign',
                title: `${business.businessName} posted a new campaign`,
                body: `${raw.title} — ${raw.category}`,
                refId: raw.id,
                refType: 'campaign',
            }));
            return notification_service_1.notificationService.createMany(notifications);
        }).catch(() => { });
        return campaign;
    }
    async list(query, lang = 'en') {
        const { page = 1, limit = 10, ...filters } = query;
        const validatedLimit = Math.min(limit, 50);
        const { campaigns: raw, total } = await this.repo.findMany({
            ...filters,
            page,
            limit: validatedLimit,
        });
        const dtos = raw.map(campaign_dto_1.toCampaignDto);
        const campaigns = await (0, translation_1.translateMany)(dtos, [...CAMPAIGN_FIELDS], lang);
        return { campaigns, total, page, limit: validatedLimit };
    }
    async getCategories() {
        return this.repo.getDistinctCategories();
    }
    async getPlatforms() {
        return this.repo.getDistinctPlatforms();
    }
    async getById(id, lang = 'en') {
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        const dto = (0, campaign_dto_1.toCampaignDto)(campaign);
        return (0, translation_1.translateFields)(dto, [...CAMPAIGN_FIELDS], lang);
    }
    async update(id, userId, input) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to update this campaign', 403);
        }
        const updated = await this.repo.update(id, {
            ...input,
            deadline: input.deadline ? new Date(input.deadline) : undefined,
            eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
        });
        return (0, campaign_dto_1.toCampaignDto)(updated);
    }
    async delete(id, userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(id);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to delete this campaign', 403);
        }
        await this.repo.delete(id);
        return { message: 'Campaign deleted successfully' };
    }
    async getMyCampaigns(userId, page, limit, lang = 'en') {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const { campaigns: raw, total } = await this.repo.findByBusinessId(business.id, page, Math.min(limit, 50));
        const dtos = raw.map(campaign_dto_1.toCampaignDto);
        const campaigns = await (0, translation_1.translateMany)(dtos, [...CAMPAIGN_FIELDS], lang);
        return { campaigns, total, page, limit };
    }
    async apply(campaignId, userId, input) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const campaign = await this.repo.findById(campaignId);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.status !== 'ACTIVE') {
            throw new error_1.AppError('This campaign is not accepting applications', 400);
        }
        const existingApplication = await this.repo.findApplication(campaignId, creator.id);
        if (existingApplication) {
            throw new error_1.AppError('You have already applied to this campaign', 409);
        }
        const rawApp = await this.repo.createApplication({
            campaignId,
            creatorId: creator.id,
            ...input,
            socialHandles: input.socialHandles,
        });
        const application = (0, campaign_dto_1.toApplicationDto)(rawApp);
        // Notify the business about the new proposal
        const isFreeEvent = campaign.campaignType === 'OPEN_EVENT';
        this.businessRepo.findById(campaign.businessId).then((business) => {
            if (!business)
                return;
            return notification_service_1.notificationService.create({
                userId: business.userId,
                type: 'proposal_received',
                title: isFreeEvent
                    ? `🎟️ ${creator.fullName ?? 'A creator'} joined your event`
                    : `${creator.fullName ?? 'A creator'} submitted a proposal`,
                body: isFreeEvent
                    ? `${creator.fullName ?? 'A creator'} submitted a participation request for "${campaign.title}". Tap to review.`
                    : `${creator.fullName ?? 'A creator'} has submitted a proposal for "${campaign.title}"`,
                refId: campaign.id,
                refType: isFreeEvent ? 'event' : 'campaign',
            });
        }).catch(() => { });
        return application;
    }
    async getCampaignApplications(campaignId, userId, page, limit) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business) {
            throw new error_1.AppError('Business profile not found', 404);
        }
        const campaign = await this.repo.findById(campaignId);
        if (!campaign) {
            throw new error_1.AppError('Campaign not found', 404);
        }
        if (campaign.businessId !== business.id) {
            throw new error_1.AppError('You are not authorized to view these applications', 403);
        }
        const { applications: raw, total } = await this.repo.findApplicationsByCampaign(campaignId, page, Math.min(limit, 50));
        return { applications: raw.map(campaign_dto_1.toApplicationDto), total, page, limit };
    }
    async getBusinessApplications(userId, page, limit) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const { applications: raw, total } = await this.repo.findApplicationsByBusinessId(business.id, page, Math.min(limit, 100));
        return { applications: raw.map(campaign_dto_1.toApplicationDto), total, page, limit };
    }
    async acceptApplication(campaignId, appId, userId) {
        return this.updateApplicationStatus(campaignId, appId, userId, 'ACCEPTED');
    }
    async rejectApplication(campaignId, appId, userId) {
        return this.updateApplicationStatus(campaignId, appId, userId, 'REJECTED');
    }
    async updateApplicationStatus(campaignId, appId, userId, status) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const campaign = await this.repo.findById(campaignId);
        if (!campaign)
            throw new error_1.AppError('Campaign not found', 404);
        if (campaign.businessId !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        const application = await this.repo.findApplicationById(appId);
        if (!application)
            throw new error_1.AppError('Application not found', 404);
        if (application.campaignId !== campaignId)
            throw new error_1.AppError('Application does not belong to this campaign', 400);
        const rawUpdated = await this.repo.updateApplicationStatus(appId, status);
        const updated = (0, campaign_dto_1.toApplicationDto)(rawUpdated);
        // Capacity enforcement for both OPEN_EVENT and PAID_CAMPAIGN
        if (status === 'ACCEPTED') {
            const campaignCapacity = campaign.capacity;
            if (campaignCapacity != null) {
                const acceptedCount = await this.repo.countAcceptedApplications(campaignId);
                if (acceptedCount >= campaignCapacity) {
                    // Reject all remaining pending applications
                    const rejected = await this.repo.rejectPendingApplications(campaignId, appId);
                    // Close the campaign
                    await this.repo.closeCampaign(campaignId);
                    // Notify each rejected creator
                    if (rejected.length > 0) {
                        notification_service_1.notificationService.createMany(rejected.map((a) => ({
                            userId: a.creator.userId,
                            type: 'campaign_closed',
                            title: `"${campaign.title}" is now full`,
                            body: 'This event has reached its creator capacity.',
                            refId: campaign.id,
                            refType: 'event',
                        }))).catch(() => { });
                    }
                }
            }
        }
        const isFreeEvent = campaign.campaignType === 'OPEN_EVENT';
        const creatorUserId = application.creator?.userId;
        if (isFreeEvent) {
            // Free event: only notify + email on ACCEPTED; silently decline
            if (status === 'ACCEPTED' && creatorUserId) {
                notification_service_1.notificationService.create({
                    userId: creatorUserId,
                    type: 'proposal_accepted',
                    title: `🎉 You're accepted for "${campaign.title}"!`,
                    body: `${business.businessName} accepted your proposal. Tap to view the event details.`,
                    refId: campaign.id,
                    refType: 'event',
                }).catch(() => { });
                this.repo.getUserEmails([creatorUserId]).then(async (emailMap) => {
                    const email = emailMap.get(creatorUserId);
                    if (email) {
                        await (0, email_1.sendEventAcceptedEmail)(email, application.creator?.fullName ?? 'Creator', campaign.title, business.businessName ?? 'Brand', campaign.eventDate ?? null, campaign.venue ?? null, Array.isArray(campaign.benefits) ? campaign.benefits : []);
                    }
                }).catch(() => { });
            }
        }
        else {
            // Paid campaign: notify creator on both accept and reject
            if (creatorUserId) {
                const type = status === 'ACCEPTED' ? 'proposal_accepted' : 'proposal_rejected';
                const title = status === 'ACCEPTED'
                    ? `🎉 Your proposal was accepted!`
                    : `Proposal update for "${campaign.title}"`;
                const body = status === 'ACCEPTED'
                    ? `Congratulations! ${business.businessName} accepted your proposal for "${campaign.title}". Payment is expected within 24 hours.`
                    : `${business.businessName} has reviewed your proposal for "${campaign.title}".`;
                notification_service_1.notificationService.create({
                    userId: creatorUserId,
                    type,
                    title,
                    body,
                    refId: campaign.id,
                    refType: 'campaign',
                }).catch(() => { });
            }
            // Notify other pending applicants that the spot is filled
            if (status === 'ACCEPTED') {
                this.repo.findPendingApplicationsByCampaign(campaignId, appId).then((others) => {
                    if (others.length === 0)
                        return;
                    return notification_service_1.notificationService.createMany(others.map((a) => ({
                        userId: a.creator.userId,
                        type: 'campaign_closed',
                        title: `"${campaign.title}" is no longer accepting proposals`,
                        body: `${business.businessName} has selected a creator for this campaign. Thank you for applying!`,
                        refId: campaign.id,
                        refType: 'campaign',
                    })));
                }).catch(() => { });
            }
        }
        return updated;
    }
    async getMyApplications(userId, page, limit) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator) {
            throw new error_1.AppError('Creator profile not found', 404);
        }
        const { applications: raw, total } = await this.repo.findApplicationsByCreator(creator.id, page, Math.min(limit, 50));
        return { applications: raw.map(campaign_dto_1.toApplicationDto), total, page, limit };
    }
    async payForCampaign(campaignId, userId, method) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const campaign = await this.repo.findById(campaignId);
        if (!campaign)
            throw new error_1.AppError('Campaign not found', 404);
        if (campaign.businessId !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        if (campaign.paymentStatus === 'PAID' || campaign.paymentStatus === 'RELEASED') {
            throw new error_1.AppError('Payment already made for this campaign', 400);
        }
        const updated = await this.repo.payForCampaign(campaignId, method);
        // Notify + email accepted creator
        this.repo.findApplicationsByCampaign(campaignId, 1, 50).then(async ({ applications }) => {
            const accepted = applications.find((a) => a.status === 'ACCEPTED');
            if (!accepted)
                return;
            const creatorUserId = accepted.creator.userId;
            await notification_service_1.notificationService.create({
                userId: creatorUserId,
                type: 'payment_released',
                title: '💰 Payment Secured!',
                body: `${business.businessName} secured payment for "${campaign.title}". Tap to start creating!`,
                refId: campaignId,
                refType: 'campaign',
            });
            const emailMap = await this.repo.getUserEmails([creatorUserId]);
            const creatorEmail = emailMap.get(creatorUserId);
            if (creatorEmail) {
                (0, email_1.sendPaymentSecuredEmail)(creatorEmail, accepted.creator.fullName ?? 'Creator', campaign.title, business.businessName ?? 'Brand', campaign.budgetMin).catch(() => { });
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toCampaignDto)(updated);
    }
    async payForApplication(appId, userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const application = await this.repo.findApplicationById(appId);
        if (!application)
            throw new error_1.AppError('Application not found', 404);
        const campaign = await this.repo.findById(application.campaignId);
        if (!campaign)
            throw new error_1.AppError('Campaign not found', 404);
        if (campaign.businessId !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        if (application.status !== 'ACCEPTED')
            throw new error_1.AppError('Creator must be accepted first', 400);
        await this.repo.payForApplication(appId);
        // Notify creator
        const creatorUserId = application.creator?.userId;
        if (creatorUserId) {
            notification_service_1.notificationService.create({
                userId: creatorUserId,
                type: 'payment_released',
                title: `💰 Payment secured for "${campaign.title}"`,
                body: `${business.businessName} has made the payment. You can now start creating content!`,
                refId: application.campaignId,
                refType: 'campaign',
            }).catch(() => { });
        }
        return { success: true };
    }
    async startWork(appId, userId) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator)
            throw new error_1.AppError('Creator profile not found', 404);
        const app = await this.repo.findApplicationById(appId);
        if (!app)
            throw new error_1.AppError('Application not found', 404);
        if (app.creatorId !== creator.id)
            throw new error_1.AppError('Not authorized', 403);
        if (app.status !== 'ACCEPTED')
            throw new error_1.AppError('Application is not accepted', 400);
        if (app.paymentStatus !== 'PAID')
            throw new error_1.AppError('Payment not yet secured', 400);
        const updated = await this.repo.startWork(appId);
        // Notify + email business
        const businessUserId = app.campaign.business.userId;
        notification_service_1.notificationService.create({
            userId: businessUserId,
            type: 'proposal_received',
            title: '🚀 Creator Started Working!',
            body: `${creator.fullName ?? 'Creator'} has started working on "${app.campaign.title}".`,
            refId: app.campaignId,
            refType: 'campaign',
        }).catch(() => { });
        this.repo.getUserEmails([businessUserId]).then((emailMap) => {
            const email = emailMap.get(businessUserId);
            if (email) {
                (0, email_1.sendWorkStartedEmail)(email, app.campaign.business.businessName ?? 'Brand', app.campaign.title, creator.fullName ?? 'Creator').catch(() => { });
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toApplicationDto)(updated);
    }
    async submitWork(appId, userId, data) {
        const creator = await this.creatorRepo.findByUserId(userId);
        if (!creator)
            throw new error_1.AppError('Creator profile not found', 404);
        const app = await this.repo.findApplicationById(appId);
        if (!app)
            throw new error_1.AppError('Application not found', 404);
        if (app.creatorId !== creator.id)
            throw new error_1.AppError('Not authorized', 403);
        if (app.status !== 'ACCEPTED')
            throw new error_1.AppError('Application is not accepted', 400);
        const updated = await this.repo.submitWork(appId, data);
        const businessUserId = app.campaign.business.userId;
        notification_service_1.notificationService.create({
            userId: businessUserId,
            type: 'proposal_received',
            title: '📤 Work Submitted for Review',
            body: `${creator.fullName ?? 'Creator'} submitted deliverables for "${app.campaign.title}". Review within 5 days.`,
            refId: app.campaignId,
            refType: 'campaign',
        }).catch(() => { });
        this.repo.getUserEmails([businessUserId]).then((emailMap) => {
            const email = emailMap.get(businessUserId);
            if (email) {
                (0, email_1.sendWorkSubmittedEmail)(email, app.campaign.business.businessName ?? 'Brand', app.campaign.title, creator.fullName ?? 'Creator', data.urls).catch(() => { });
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toApplicationDto)(updated);
    }
    async approveWork(appId, userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const app = await this.repo.findApplicationById(appId);
        if (!app)
            throw new error_1.AppError('Application not found', 404);
        if (app.campaign.business.id !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        if (app.workStatus !== 'SUBMITTED')
            throw new error_1.AppError('Work has not been submitted yet', 400);
        const updated = await this.repo.approveWork(appId);
        // Mark the application payment as released
        this.repo.releaseApplicationPayment(appId).catch(() => { });
        const creatorUserId = app.creator.userId;
        notification_service_1.notificationService.create({
            userId: creatorUserId,
            type: 'payment_released',
            title: '🎉 Work Approved! Payment Released.',
            body: `${business.businessName} approved your work for "${app.campaign.title}". Check your wallet!`,
            refId: app.campaignId,
            refType: 'campaign',
        }).catch(() => { });
        this.repo.getUserEmails([creatorUserId]).then((emailMap) => {
            const email = emailMap.get(creatorUserId);
            if (email) {
                (0, email_1.sendWorkApprovedEmail)(email, app.creator.fullName ?? 'Creator', app.campaign.title, app.proposedRate).catch(() => { });
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toApplicationDto)(updated);
    }
    async requestRevision(appId, userId, note) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const app = await this.repo.findApplicationById(appId);
        if (!app)
            throw new error_1.AppError('Application not found', 404);
        if (app.campaign.business.id !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        if (app.workStatus !== 'SUBMITTED')
            throw new error_1.AppError('Work has not been submitted yet', 400);
        const updated = await this.repo.requestRevision(appId, note);
        const creatorUserId = app.creator.userId;
        notification_service_1.notificationService.create({
            userId: creatorUserId,
            type: 'proposal_received',
            title: '✏️ Revision Requested',
            body: `${business.businessName} requested changes for "${app.campaign.title}". Check the notes.`,
            refId: app.campaignId,
            refType: 'campaign',
        }).catch(() => { });
        this.repo.getUserEmails([creatorUserId]).then((emailMap) => {
            const email = emailMap.get(creatorUserId);
            if (email) {
                (0, email_1.sendRevisionRequestEmail)(email, app.creator.fullName ?? 'Creator', app.campaign.title, note).catch(() => { });
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toApplicationDto)(updated);
    }
    async cancelCampaign(campaignId, userId) {
        const business = await this.businessRepo.findByUserId(userId);
        if (!business)
            throw new error_1.AppError('Business profile not found', 404);
        const campaign = await this.repo.findById(campaignId);
        if (!campaign)
            throw new error_1.AppError('Campaign not found', 404);
        if (campaign.businessId !== business.id)
            throw new error_1.AppError('Not authorized', 403);
        const updated = await this.repo.cancelCampaign(campaignId);
        // Notify all accepted creators
        this.repo.findApplicationsByCampaign(campaignId, 1, 50).then(async ({ applications }) => {
            const accepted = applications.filter((a) => a.status === 'ACCEPTED');
            for (const app of accepted) {
                const creatorUserId = app.creator.userId;
                const wasPaid = campaign.paymentStatus === 'PAID';
                const refundNote = wasPaid
                    ? 'A partial refund (80% of payment) will be processed to your original payment method within 3–5 business days. The 20% deduction covers the platform cancellation fee.'
                    : undefined;
                await notification_service_1.notificationService.create({
                    userId: creatorUserId,
                    type: 'campaign_closed',
                    title: 'Campaign Cancelled',
                    body: `${business.businessName} cancelled "${campaign.title}".${wasPaid ? ' A partial refund is being processed.' : ''}`,
                    refId: campaignId,
                    refType: 'campaign',
                });
                const emailMap = await this.repo.getUserEmails([creatorUserId]);
                const email = emailMap.get(creatorUserId);
                if (email) {
                    (0, email_1.sendCampaignCancelledEmail)(email, app.creator.fullName ?? 'Creator', campaign.title, true, refundNote).catch(() => { });
                }
            }
        }).catch(() => { });
        return (0, campaign_dto_1.toCampaignDto)(updated);
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=campaign.service.js.map