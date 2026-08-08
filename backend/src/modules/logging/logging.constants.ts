// Central vocabulary for logActivity()/logAudit() `action`/`entityType` strings — keeps every
// call site using the same spelling instead of hand-typed literals drifting apart over time.

export const ActivityAction = {
  USER_REGISTERED:            'user.registered',
  USER_LOGIN:                 'user.login',
  CREATOR_PROFILE_UPDATED:    'creator.profile_updated',
  BUSINESS_PROFILE_UPDATED:   'business.profile_updated',
  CAMPAIGN_CREATED:           'campaign.created',
  APPLICATION_CREATED:        'application.created',
  APPLICATION_HIRED:          'application.hired',
  APPLICATION_WORK_SUBMITTED: 'application.work_submitted',
  APPLICATION_WORK_APPROVED:  'application.work_approved',
  PAYMENT_ESCROWED:           'payment.escrowed',
  PAYMENT_RELEASED:           'payment.released',
  MESSAGE_VOICE_SENT:         'message.voice_sent',
  CONVERSATION_HIDDEN:        'conversation.hidden',
  CONVERSATION_DELETED_BY_ADMIN: 'conversation.deleted_by_admin',
  ACCOUNT_VERIFIED:           'account.verified',
  CAMPAIGN_EXPIRED:           'campaign.expired',
  APPLICATION_EXPIRED:        'application.expired',
} as const;

export const AuditAction = {
  PASSWORD_RESET:           'password.reset',
  PHONE_CHANGED:            'phone.changed',
  EMAIL_CHANGED:            'email.changed',
  VERIFICATION_APPROVED:    'verification.approved',
  VERIFICATION_REJECTED:    'verification.rejected',
  ACCOUNT_SUSPENDED:        'account.suspended',
  ACCOUNT_REACTIVATED:      'account.reactivated',
  ACCOUNT_DELETED_BY_ADMIN: 'account.deleted_by_admin',
} as const;

export const EntityType = {
  APPLICATION:      'Application',
  CAMPAIGN:         'Campaign',
  CONVERSATION:     'Conversation',
  CREATOR_PROFILE:  'CreatorProfile',
  BUSINESS_PROFILE: 'BusinessProfile',
} as const;

export type ActivityActionValue = typeof ActivityAction[keyof typeof ActivityAction];
export type AuditActionValue = typeof AuditAction[keyof typeof AuditAction];
export type EntityTypeValue = typeof EntityType[keyof typeof EntityType];
