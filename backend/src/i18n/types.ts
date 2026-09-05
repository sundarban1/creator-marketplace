// Shape shared by every language dictionary under backend/src/i18n — kept
// separate from en.ts/ne.ts so neither is treated as "the" source of truth;
// both must satisfy this the same way.
export interface BackendDict {
  esewa: {
    notConfigured: string;
    checkoutFailed: string;
    decodeFailed: string;
    missingSignature: string;
    invalidSignature: string;
    confirmFailed: string;
    statusCheckNetworkError: string;
    statusCheckRejected: string;
    status: Record<'PENDING' | 'FULL_REFUND' | 'PARTIAL_REFUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CANCELED', string>;
  };
  khalti: {
    notConfigured: string;
    initiateNetworkError: string;
    initiateRejectedFallback: string;
    lookupNetworkError: string;
    lookupRejectedFallback: string;
    confirmFailed: string;
    // Khalti's numeric error codes — see KHALTI_ERROR_MESSAGES' original comment
    // in utils/khalti.ts for why these are hardcoded rather than derived.
    errors: Record<number, string>;
  };
  // modules/auth — every AppError message and { message } string from
  // auth.service.ts/auth.controller.ts. Channel-dependent copy (email vs
  // phone) gets an Email/Phone-suffixed pair rather than a template function,
  // so callers just pick with a ternary the same way the original code did.
  auth: {
    registrationClosedCreator: string;
    registrationClosedBusiness: string;
    emailAlreadyExists: string;
    phoneAlreadyExists: string;
    accountNotFoundEmail: string;
    accountNotFoundPhone: string;
    alreadyVerified: string;
    invalidOrExpiredVerificationCode: string;
    verificationResentEmail: string;
    verificationResentPhone: string;
    invalidCredentialsEmail: string;
    invalidCredentialsPhone: string;
    verifyBeforeLoginEmail: string;
    verifyBeforeLoginPhone: string;
    accountSuspended: string;
    onboardingComplete: string;
    invalidRefreshToken: string;
    refreshTokenMismatch: string;
    userNotFound: string;
    loggedOut: string;
    accountDeactivated: string;
    accountDeleted: string;
    forgotPasswordGenericEmail: string;
    forgotPasswordGenericPhone: string;
    invalidOrExpiredCode: string;
    phoneAlreadyInUse: string;
    verificationSentPhone: string;
    phoneVerifiedSuccess: string;
    emailAlreadyInUse: string;
    verificationSentEmail: string;
    emailVerifiedSuccess: string;
    googleTokenInvalid: string;
    googleNoEmail: string;
    facebookTokenInvalid: string;
    facebookNoEmail: string;
    appleLinkRequired: string;
    appleLinkExpired: string;
    appleAlreadyLinkedOther: string;
    appleAlreadyLinked: string;
    loginMethodNotConnected: string;
    lastLoginMethod: string;
    invalidResetToken: string;
    passwordResetSuccess: string;
    // Controller-level success labels
    accountCreated: string;
    loginSuccessful: string;
    tokenRefreshed: string;
    otpVerifiedGeneric: string;
    roleSelectionRequired: string;
    googleSignInSuccessful: string;
    facebookSignInSuccessful: string;
    appleSignInSuccessful: string;
    appleAccountLinkedMsg: string;
    notificationReceived: string;
    loginMethodsLabel: string;
    loginMethodDisconnected: string;
    emailQueryRequired: string;
    emailAvailabilityChecked: string;
  };
  // modules/campaign/campaign.service.ts — every AppError message and the one
  // { message } string from that file (the module's biggest). Internal/500-level
  // wrappers around a truly unexpected failure aren't included here — only
  // 'Upload cancelled' (the client already disconnected before it could ever be
  // shown) was left hardcoded on that basis. A few messages interpolate a
  // runtime value (a field name, an Rs. amount, an hour/revision count) — those
  // are modeled as functions rather than plain strings so each language can put
  // the value in its own natural word order, the same way auth's
  // Email/Phone-suffixed pairs let callers pick with a ternary.
  campaign: {
    businessProfileNotFound: string;
    creatorProfileNotFound: string;
    campaignNotFound: string;
    applicationNotFound: string;
    notAuthorized: string;
    notAuthorizedToUpdateCampaign: string;
    notAuthorizedToDeleteCampaign: string;
    notAuthorizedToViewApplications: string;
    locationRequiredForOnsite: string;
    categoryNotFoundForRequirement: string;
    categoryNotActive: (categoryName: string) => string;
    categoryNotUsableAsRequirement: (categoryName: string) => string;
    newAccountCooldown: (cooldownHours: number, hoursLeft: number) => string;
    dailyEventCreationLimitReached: (maxPerDay: number) => string;
    dailyProposalLimitReached: (maxPerDay: number) => string;
    reliabilityTooLowToApply: string;
    cannotChangeFieldAfterProposals: (field: string) => string;
    cannotChangeEventTimeConfirmed: string;
    cannotCloseEventPendingProposals: string;
    cannotPauseEventActiveWork: string;
    campaignNotAcceptingApplications: string;
    requirementNotFound: string;
    alreadyAppliedToRole: string;
    alreadyAppliedToCampaign: string;
    proposedRateExceedsRoleBudget: (amount: string) => string;
    proposedRateMustBeGreaterThanZero: string;
    proposedRateMustBeBetween: (min: string, max: string) => string;
    proposedRateExceedsBudget: (amount: string) => string;
    onlyPendingCanBeShortlisted: string;
    applicationNotInCampaign: string;
    campaignNoLongerActive: string;
    paymentAlreadyMadeForCampaign: string;
    paymentAlreadyMadeForApplication: string;
    creatorMustBeAcceptedFirst: string;
    khaltiPaymentMismatch: string;
    khaltiPaymentStatus: (status: string) => string;
    paidAmountMismatch: string;
    esewaPaymentMismatch: string;
    noPendingEsewaPayment: string;
    applicationNotAccepted: string;
    freeEventsNoWorkStage: string;
    paymentNotYetSecured: string;
    freeEventsNoDeliverablesToSubmit: string;
    workNotSubmittedYet: string;
    engagementUnderDisputeApproving: string;
    engagementUnderDispute: string;
    maxRevisionsUsed: (count: number) => string;
    pleaseDescribeIssue: string;
    adminsDoNotRaiseDisputes: string;
    freeEventsNoDeliverablesToUpload: string;
    projectAlreadyApprovedNoVideos: string;
    maxVideosUploaded: string;
    videoExceeds500MB: string;
    invalidUploadReference: string;
    couldNotVerifyVideo: string;
    videoStorageNotConfigured: string;
    unsupportedVideoFormat: string;
    maxFilesUploaded: string;
    eventNotFound: string;
    qaOnlyForFreeEvents: string;
    onlyOrganizerAndCreatorsCanView: string;
    onlyAcceptedCreatorsCanAsk: string;
    onlyOrganizerCanAnswer: string;
    questionNotFound: string;
    campaignDeletedSuccessfully: string;
    // campaign.controller.ts
    noImageFileProvided: string;
    publicIdRequired: string;
    noFileProvided: string;
    fileIdRequired: string;
    // escrow.service.ts
    escrowNotReleasable: (status: string) => string;
    disputeAlreadyOpen: string;
    noHeldPaymentToDispute: string;
    engagementAlreadyFinished: string;
    resolutionReasonRequired: string;
    disputeNotFound: string;
    disputeAlreadyResolved: string;
    splitMustEqualEscrowedAmount: (creatorAmount: number, businessAmount: number, total: number) => string;
    // application-state-machine.ts
    illegalTransition: (axis: string, from: string, to: string) => string;
    actorMayNotPerformAction: (actor: string, action: string) => string;
    // invitation/invitation.service.ts
    creatorNotConfirmedForEvent: string;
    invitationsOnlyForOpenEvents: string;
    noConfirmedInvitationForEvent: string;
    couldNotPrepareInvitation: string;
  };
  // modules/messaging/messaging.service.ts and messaging.controller.ts — every
  // AppError message plus the success `message` strings passed to success()/
  // res.json() in the controller. respondToRequest's `Request ${action}ed`
  // becomes a function (mirroring campaign's illegalTransition/
  // actorMayNotPerformAction) so each language can phrase accept vs decline
  // naturally rather than reproducing the original string-concatenation.
  messaging: {
    sendingTooQuickly: string;
    messagingDisabled: string;
    creatorProfileNotFound: string;
    businessProfileNotFound: string;
    accessDenied: string;
    cannotMessageBlockedUser: string;
    creatorNotFound: string;
    businessNotFound: string;
    unauthorized: string;
    cannotMessageYourself: string;
    blockingCreatorToCreatorOnly: string;
    conversationNotFound: string;
    requestNotPending: string;
    messageNotFound: string;
    canOnlyDeleteOwnMessageForEveryone: string;
    canOnlyEditOwnMessage: string;
    cannotEditDeletedMessage: string;
    onlyTextMessagesCanBeEdited: string;
    cannotSendUntilAccepted: string;
    conversationRequestDeclined: string;
    collaborationEnded: string;
    duplicateMessageWait: string;
    invalidUploadReference: string;
    couldNotVerifyVoiceMessage: string;
    voiceStorageNotConfigured: string;
    voiceExceeds15MB: string;
    unsupportedAudioFormat: string;
    voiceDurationOutOfRange: string;
    videoNotAvailableCreatorToCreator: string;
    videoExceeds500MB: string;
    couldNotVerifyVideo: string;
    videoStorageNotConfigured: string;
    unsupportedVideoFormat: string;
    // messaging.controller.ts
    invalidAction: string;
    noFileProvided: string;
    messageRequestSent: string;
    blocked: string;
    unblocked: string;
    requestResponded: (action: 'accept' | 'decline') => string;
    messageSent: string;
    attachmentSent: string;
    signatureGenerated: string;
    voiceMessageSent: string;
    videoSent: string;
    markedAsSeen: string;
    messageDeleted: string;
    messageUpdated: string;
    conversationDeleted: string;
  };
  // modules/creator/creator.service.ts, creator.controller.ts, favorite.controller.ts
  // and shortlist.controller.ts — every AppError message plus the success `message`
  // strings passed to success() in creator.controller.ts. Errors that only ever occur
  // inside the two background follower-refresh paths (the scheduled job and the silent
  // per-creator top-up — both catch and log every failure without ever surfacing it to
  // a caller) are left as plain strings since they can never reach a UI. Like campaign's
  // categoryNotActive/illegalTransition, profileNotFoundForRole/socialAccountAlreadyAdded/
  // invalidPaymentMethods/invalidPlatforms/couldNotReachYoutube interpolate a runtime value.
  creator: {
    creatorNotFound: string;
    creatorProfileNotFound: string;
    usernameAlreadyTaken: string;
    emailAlreadyVerified: string;
    emailAlreadyInUseByAnother: string;
    onlyAgencyUploadsCompanyRegDoc: string;
    portfolioLinkNotFound: string;
    invalidPlatform: string;
    socialAccountAlreadyAdded: (platform: string) => string;
    socialAccountNotFound: string;
    googleSessionExpired: string;
    youtubeApiNotEnabled: string;
    googleAccessDenied: string;
    couldNotReachYoutube: (status: number) => string;
    noYoutubeChannelFound: string;
    tiktokLoginNotConfigured: string;
    tiktokAuthorizationExpired: string;
    profileNotFoundForRole: (isBusiness: boolean) => string;
    couldNotConnectTiktokAccount: string;
    couldNotReadTiktokProfile: string;
    facebookSessionExpired: string;
    couldNotReachFacebook: string;
    facebookPageNotFound: string;
    instagramNoLinkedBusinessAccount: string;
    instagramLoginNotConfigured: string;
    instagramAuthorizationExpired: string;
    couldNotConnectInstagramAccount: string;
    couldNotReadInstagramProfile: string;
    instagramMustBeBusinessAccount: string;
    invalidPaymentMethods: (methods: string) => string;
    invalidPlatforms: (platforms: string) => string;
    invitationNotFound: string;
    notAuthorizedToRespondToInvitation: string;
    invitationAlreadyResponded: string;
    // creator.controller.ts
    categoryRequired: string;
    usernameQueryRequired: string;
    noImageFileProvided: string;
    creatorsRetrieved: string;
    recommendedCreatorsRetrieved: string;
    creatorProfileRetrieved: string;
    filterOptionsRetrieved: string;
    usernameAvailabilityChecked: string;
    profileRetrieved: string;
    profileUpdated: string;
    portfolioLinkAdded: string;
    portfolioLinkRemoved: string;
    socialLinksUpdated: string;
    socialAccountsRetrieved: string;
    socialAccountAdded: string;
    socialAccountUpdated: string;
    socialAccountRemoved: string;
    youtubeAccountConnected: string;
    tiktokAuthorizeUrlGenerated: string;
    instagramAuthorizeUrlGenerated: string;
    facebookPagesRetrieved: string;
    facebookPageConnected: string;
    instagramAccountConnected: string;
    earningsRetrieved: string;
    paymentMethodsUpdated: string;
    campaignPreferencesUpdated: string;
    avatarUpdated: string;
    coverImageUpdated: string;
    citizenshipDocumentUploaded: string;
    companyRegistrationDocumentUploaded: string;
    panDocumentUploaded: string;
    analyticsRetrieved: string;
    availabilityUpdated: string;
    availabilityScheduleRetrieved: string;
    availabilityScheduleUpdated: string;
    invitationsRetrieved: string;
    invitationResponseRecorded: string;
  };
  // modules/business/business.service.ts, business.controller.ts and
  // saved-creator.controller.ts — every AppError message plus the success
  // `message` strings passed to success()/res.json() across the module.
  // Deliberately its own namespace even where a concept mirrors an existing
  // creator.* key (e.g. "profile not found", "already in use") — business and
  // creator are separate roles and their copy is allowed to diverge later.
  // Like creator's socialAccountAlreadyAdded, socialAccountAlreadyAdded here
  // interpolates the platform name.
  business: {
    businessProfileNotFound: string;
    emailAlreadyVerified: string;
    emailAlreadyInUseByAnother: string;
    businessNotFound: string;
    identityDocsIndividualOnly: string;
    invalidPlatform: string;
    socialAccountAlreadyAdded: (platform: string) => string;
    socialAccountNotFound: string;
    facebookPageNotFound: string;
    instagramNoLinkedBusinessAccount: string;
    // business.controller.ts
    noImageFileProvided: string;
    profileRetrieved: string;
    profileUpdated: string;
    businessesRetrieved: string;
    businessRetrieved: string;
    logoUpdated: string;
    coverImageUpdated: string;
    panDocumentUploaded: string;
    identityDocumentUploaded: string;
    companyRegistrationDocumentUploaded: string;
    paymentHistoryRetrieved: string;
    analyticsRetrieved: string;
    socialAccountsRetrieved: string;
    socialAccountAdded: string;
    socialAccountUpdated: string;
    socialAccountDeleted: string;
    youtubeAccountConnected: string;
    tiktokAuthorizeUrlGenerated: string;
    instagramAuthorizeUrlGenerated: string;
    facebookPagesRetrieved: string;
    facebookPageConnected: string;
    instagramAccountConnected: string;
    // saved-creator.controller.ts
    creatorIdsRequired: string;
    campaignNotFound: string;
  };
  // modules/provider-member/provider-member.service.ts and
  // provider-member.controller.ts — every AppError message plus the success
  // `message` strings passed to success() in the controller. Notification
  // title/body passed to notificationService.create() are left out, matching
  // campaign.service.ts's precedent of not translating notification copy.
  providerMember: {
    providerProfileNotFound: string;
    onlyTeamOrAgencyCanHaveMembers: string;
    notAuthorizedToManageTeam: string;
    onlyAdminCanManageTeam: string;
    noProviderAccountFound: string;
    accountNotServiceProvider: string;
    cannotInviteTeamItself: string;
    alreadyInYourTeam: string;
    alreadyHasPendingInvitation: string;
    memberNotFound: string;
    cannotChangeOwnMembership: string;
    bookingNotFound: string;
    onlyAcceptedBookingCanHaveMembersAssigned: string;
    providerNotActiveMember: string;
    alreadyAssignedToBooking: string;
    assignmentNotFound: string;
    invitationNotFound: string;
    notAuthorizedToRespondToInvitation: string;
    invitationAlreadyResponded: string;
    // provider-member.controller.ts
    teamMembersRetrieved: string;
    invitationSent: string;
    memberUpdated: string;
    memberRemoved: string;
    membershipsRetrieved: string;
    assignmentsRetrieved: string;
    memberAssigned: string;
    memberUnassigned: string;
    assignedWorkRetrieved: string;
    responseRecorded: string;
  };
  // modules/contract/contract.service.ts and contract.controller.ts — every
  // AppError message plus the success `message` strings passed to success()
  // in the controller. The default contract template body (DEFAULT_TEMPLATE)
  // and PDF section labels aren't included — that's admin-editable content
  // rendered straight into the agreement document, not app chrome.
  contract: {
    contractsOnlyForPaidCampaigns: string;
    notAuthorizedToViewContract: string;
    creatorProfileNotFound: string;
    campaignNotFound: string;
    businessNotFound: string;
    requirementNotFoundOnCampaign: string;
    notAuthorizedToSignContract: string;
    applicationNotFound: string;
    contractNotFound: string;
    // contract.controller.ts
    contractPreviewGenerated: string;
    contractRetrieved: string;
    contractPdfReady: string;
    templateRetrieved: string;
    templateUpdated: string;
  };
  // modules/business-referral/business-referral.service.ts and
  // business-referral.controller.ts — every AppError message plus the success
  // `message` strings passed to success() in the controller.
  businessReferral: {
    invalidReferralCode: string;
    cannotUseOwnReferralCode: string;
    accountAlreadyLinkedToReferral: string;
    businessProfileNotFound: string;
    referralNotFound: string;
    canOnlyResendOwnReferrals: string;
    onlyExpiredReferralsCanBeResent: string;
    // business-referral.controller.ts
    referralOverviewRetrieved: string;
    referralCodeApplied: string;
    referralResent: string;
  };
  // modules/wallet/wallet.service.ts — every AppError message. No
  // wallet.controller.ts messages are in scope for this pass.
  wallet: {
    creatorProfileNotFound: string;
    payoutMethodNotFound: string;
    minimumWithdrawalAmount: (min: string) => string;
    maximumWithdrawalAmount: (max: string) => string;
    pendingWithdrawalExists: string;
    amountExceedsAvailableBalance: (balance: string) => string;
    dailyLimitReachedToday: (daily: string) => string;
    wouldExceedDailyLimit: (daily: string, left: string) => string;
  };
  // modules/portfolio/portfolio.service.ts and portfolio.controller.ts —
  // every AppError message plus the success `message` strings passed to
  // success() in the controller.
  portfolio: {
    creatorProfileNotFound: string;
    itemNotFound: string;
    notAuthorizedToModifyItem: string;
    // portfolio.controller.ts
    noImageFileProvided: string;
    portfolioItemsRetrieved: string;
    mediaUploaded: string;
    portfolioItemAdded: string;
    portfolioItemUpdated: string;
    portfolioItemRemoved: string;
  };
  // modules/payment-method/payment-method.controller.ts — only the
  // listPublic() success message is in scope here: every other endpoint in
  // this module (create/update/status/remove/uploadIcon/listForAdmin) sits
  // behind ADMIN-only routes (payment-method.admin.routes.ts), matching
  // providerMember/contract's precedent of only translating messages a normal
  // end user can actually reach.
  paymentMethod: {
    paymentMethodsRetrieved: string;
  };
  // modules/faq/faq.routes.ts — the public GET '/' handler only. Every other
  // route in that file is ADMIN-only content-management CRUD (create/update/
  // delete/publish a FAQ entry) and is out of i18n scope on the same basis as
  // the admin panel generally.
  faq: {
    faqsRetrieved: string;
  };
  // modules/help/help.routes.ts — the public GET '/' handler only. Every other
  // route is ADMIN-only content-management CRUD, out of scope like faq.*.
  help: {
    helpArticlesRetrieved: string;
  };
  // modules/legal/legal.routes.ts — the public GET '/:typeSlug' handler only
  // (an end user/app can request an unknown slug, so its 404 is reachable).
  // Every other route is ADMIN-only section CRUD, out of scope.
  legal: {
    unknownLegalDocumentType: string;
    legalDocumentRetrieved: string;
  };
  // modules/support/support.routes.ts — every end-user-reachable AppError and
  // success message: uploading a contact/report attachment, submitting a
  // support contact request (signed-in or the anonymous landing-page form),
  // and reporting an issue. The admin-only listing/status routes at the
  // bottom of that file are out of scope, same basis as faq/help/legal.
  support: {
    noFileProvided: string;
    attachmentUploaded: string;
    supportRequestSubmitted: string;
    contactMessageSent: string;
    issueReported: string;
  };
  // modules/success-story/success-story.service.ts and
  // success-story.controller.ts — only the public listPublic() success
  // message (also reused verbatim by the ADMIN listForAdmin() call, so one
  // key covers both). Every other route (photo upload, create/update/status/
  // delete) is ADMIN-only content-management CRUD, out of scope.
  successStory: {
    successStoriesRetrieved: string;
  };
  // modules/visitorChat/visitorChat.service.ts and visitorChat.controller.ts —
  // every AppError/success message reachable from the public (anonymous
  // landing-page visitor) routes in visitorChat.routes.ts. Several of these
  // literal strings are also reused verbatim by the ADMIN-only routes in
  // visitorChat.admin.routes.ts (getMessagesForAdmin, sendAdminMessage,
  // markSeenByAdmin), so one key covers both call sites. updateStatus's
  // 'Status updated' and sendAdminMessage's 'Not authenticated' guard are
  // ADMIN-only with no public equivalent and are left out.
  visitorChat: {
    chatStarted: string;
    messagesRetrieved: string;
    messageSent: string;
    markedAsSeen: string;
    chatNotFound: string;
    chatClosed: string;
  };
  // modules/ai-assistant/ai-assistant.service.ts and
  // ai-assistant.controller.ts — every AppError and success message from the
  // BUSINESS-only voice-transcription endpoint (a normal business user
  // feature, not admin tooling).
  aiAssistant: {
    noAudioFileProvided: string;
    voiceInputUnavailable: string;
    couldNotUnderstandAudio: string;
    transcribed: string;
  };
  // modules/report/report.service.ts and report.controller.ts — only the
  // create() success message, the one route any authenticated user (provider
  // or business) can reach per report.routes.ts. listForAdmin/updateStatus
  // (and their 'Report not found'/'Invalid status...' errors) live behind
  // report.admin.routes.ts's ADMIN authorize() and are out of scope.
  report: {
    reportSubmitted: string;
  };
  // modules/notifications/notification.service.ts — only getSettings' guard.
  // Everything else in this file (push delivery, receipt checks, create/
  // createMany/createForAdmins) either never surfaces a message to a caller
  // or passes through caller-supplied title/body that's translated separately
  // via translateMany, not a literal here.
  notification: {
    userNotFound: string;
  };
  // modules/service/service.service.ts and service.controller.ts — every
  // AppError message plus the success `message` strings passed to success()
  // in the controller. listForAdmin's "Invalid status..." query-validation
  // error and updateStatusAsAdmin's "Service status updated" are admin-only
  // (service.admin.routes.ts gates the whole router on Role.ADMIN) and are
  // left hardcoded, matching platform/category's admin-tooling precedent.
  // serviceNotFound is shared with that admin path too since the same string
  // is already reachable by a normal creator/business user elsewhere.
  service: {
    categoryNotFound: string;
    categoryNotActive: string;
    categoryNotUsableForServices: string;
    creatorProfileNotFound: string;
    serviceNotFound: string;
    notAuthorizedToModifyService: string;
    // service.controller.ts
    servicesRetrieved: string;
    serviceCreated: string;
    serviceUpdated: string;
    serviceDeleted: string;
    serviceRetrieved: string;
  };
  // modules/service-request/service-request.service.ts and
  // service-request.controller.ts — every AppError message plus the success
  // `message` strings passed to success() in the controller. Every route in
  // this module requires an authenticated BUSINESS or CREATOR (no admin path
  // at all), so unlike service/category there's nothing to exclude here.
  // invalidStatusFilter interpolates the joined list of valid enum values,
  // the same way campaign's illegalTransition interpolates runtime values.
  serviceRequest: {
    businessProfileNotFound: string;
    serviceNotFound: string;
    alreadyHasPendingRequest: string;
    creatorProfileNotFound: string;
    requestNotFound: string;
    notAuthorizedToRespond: string;
    alreadyResponded: string;
    invalidStatusFilter: (validValues: string) => string;
    // service-request.controller.ts
    serviceRequestSent: string;
    serviceRequestsRetrieved: string;
    serviceRequestUpdated: string;
  };
  // modules/analytics/analytics.service.ts — every AppError message reachable
  // from a normal creator/business action (submitReview, getCreatorAnalytics,
  // getBrandAnalytics, all called from creator/business/campaign controllers).
  // getAnalyticsForUser's "User has no creator or business profile" is only
  // ever called from admin.controller.ts's admin-only user-lookup endpoint,
  // so it's left hardcoded like platform/category's admin-tooling messages.
  // The counter/notification helpers never throw to a caller and aren't here.
  analytics: {
    ratingOutOfRange: string;
    applicationNotFound: string;
    reviewsOnlyAfterCompletion: string;
    notAuthorizedToReviewApplication: string;
    alreadyReviewedProject: string;
    creatorProfileNotFound: string;
    businessProfileNotFound: string;
  };
  // modules/payout-method/payout-method.service.ts — every AppError message.
  // The whole router sits behind the parent wallet router's
  // authenticate + authorize('CREATOR'), so all four are ordinary
  // creator-facing outcomes (no admin path to exclude).
  payoutMethod: {
    creatorProfileNotFound: string;
    payoutMethodNotFound: string;
    duplicatePayoutMethodType: string;
    withdrawalInProgress: string;
  };
  // modules/referral/referral.service.ts — every AppError message. The whole
  // router sits behind authenticate + authorize('CREATOR'), so all four are
  // ordinary creator-facing outcomes. Deliberately its own namespace even
  // though accountAlreadyLinkedToReferral/creatorProfileNotFound echo
  // businessReferral's keys — this is the unrelated creator-referral flow.
  referral: {
    invalidReferralCode: string;
    cannotUseOwnReferralCode: string;
    accountAlreadyLinkedToReferral: string;
    creatorProfileNotFound: string;
  };
  // modules/category/category.service.ts and category.controller.ts. Note:
  // platform.service.ts (the sibling small module) has no entry at all here —
  // every one of its AppErrors (create/update/updateStatus/remove) is only
  // reachable through platform.admin.routes.ts's Role.ADMIN-gated router, with
  // no normal-user path to any of them, so nothing in that file qualified.
  // category.service.ts is the same story (create/update/updateStatus/remove
  // only reachable via category.admin.routes.ts's ADMIN gate) and none of its
  // messages are translated either. Only category.controller.ts's listPublic
  // is included: category.routes.ts's public listing has no auth at all and
  // is read by ordinary onboarding/campaign-creation flows, so its
  // query-validation error and "Categories retrieved" success message (also
  // reused verbatim by the admin listForAdmin call) qualify.
  category: {
    invalidScopeFilter: (validValues: string) => string;
    categoriesRetrieved: string;
  };
}
