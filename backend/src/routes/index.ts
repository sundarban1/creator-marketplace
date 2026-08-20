import type { Express } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import creatorRoutes from '../modules/creator/creator.routes';
import tiktokCallbackRoutes from '../modules/creator/tiktok.routes';
import instagramLoginCallbackRoutes from '../modules/creator/instagram-login.routes';
import referralRoutes from '../modules/referral/referral.routes';
import businessReferralRoutes from '../modules/business-referral/business-referral.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import businessRoutes from '../modules/business/business.routes';
import campaignRoutes from '../modules/campaign/campaign.routes';
import campaignAiRoutes from '../modules/campaign-ai/campaign-ai.routes';
import aiAssistantRoutes from '../modules/ai-assistant/ai-assistant.routes';
import messagingRoutes from '../modules/messaging/messaging.routes';
import adminRoutes from '../modules/admin/admin.routes';
import categoryRoutes from '../modules/category/category.routes';
import categoryAdminRoutes from '../modules/category/category.admin.routes';
import platformRoutes from '../modules/platform/platform.routes';
import platformAdminRoutes from '../modules/platform/platform.admin.routes';
import successStoryRoutes from '../modules/success-story/success-story.routes';
import successStoryAdminRoutes from '../modules/success-story/success-story.admin.routes';
import publicRoutes from '../modules/public/public.routes';
import visitorChatRoutes from '../modules/visitorChat/visitorChat.routes';
import visitorChatAdminRoutes from '../modules/visitorChat/visitorChat.admin.routes';
import helpRoutes         from '../modules/help/help.routes';
import faqRoutes          from '../modules/faq/faq.routes';
import supportRoutes      from '../modules/support/support.routes';
import legalRoutes        from '../modules/legal/legal.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import contractRoutes     from '../modules/contract/contract.routes';
import serviceRoutes        from '../modules/service/service.routes';
import servicePublicRoutes  from '../modules/service/service.public.routes';
import serviceAdminRoutes   from '../modules/service/service.admin.routes';
import portfolioRoutes      from '../modules/portfolio/portfolio.routes';
import serviceRequestRoutes from '../modules/service-request/service-request.routes';
import reportRoutes         from '../modules/report/report.routes';
import reportAdminRoutes    from '../modules/report/report.admin.routes';

export function registerApiRoutes(app: Express): void {
  app.use('/api/auth', authRoutes);
  // Public — TikTok's and Instagram's browser redirects land here directly with no
  // auth header, so these must be mounted (and matched) before the authenticated
  // /api/creator router below.
  app.use('/api/creator/social-accounts/tiktok', tiktokCallbackRoutes);
  app.use('/api/creator/social-accounts/instagram-login', instagramLoginCallbackRoutes);
  app.use('/api/creator', creatorRoutes);
  app.use('/api/creator/referral', referralRoutes);
  app.use('/api/creator/wallet', walletRoutes);
  app.use('/api/creator/services', serviceRoutes);
  app.use('/api/creator/portfolio-items', portfolioRoutes);
  app.use('/api/business/referral', businessReferralRoutes);
  app.use('/api/business', businessRoutes);
  app.use('/api/campaigns/ai', campaignAiRoutes);
  app.use('/api/ai-assistant', aiAssistantRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/messaging', messagingRoutes);
  app.use('/api/admin/categories', categoryAdminRoutes);
  app.use('/api/admin/platforms', platformAdminRoutes);
  app.use('/api/admin/success-stories', successStoryAdminRoutes);
  app.use('/api/admin/visitor-chats', visitorChatAdminRoutes);
  app.use('/api/admin/services', serviceAdminRoutes);
  app.use('/api/admin/reports', reportAdminRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/platforms', platformRoutes);
  app.use('/api/services', servicePublicRoutes);
  app.use('/api/service-requests', serviceRequestRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/success-stories', successStoryRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/visitor-chat', visitorChatRoutes);
  app.use('/api/help',          helpRoutes);
  app.use('/api/faq',           faqRoutes);
  app.use('/api/support',       supportRoutes);
  app.use('/api/legal',         legalRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/contracts',     contractRoutes);
}
