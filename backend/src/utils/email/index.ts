// Barrel — every email template used to live in one 650-line utils/email.ts;
// each category now has its own file (see below) purely so a given template
// is fast to find/debug. Re-exporting here keeps every existing
// `from '.../utils/email'` import site unchanged.
export { sendEmail, wrapLayout, escapeHtml } from './core';
export { sendOtpEmail, sendPasswordResetOtpEmail } from './otp';
export { sendWelcomeEmail } from './welcome';
export { sendPasswordResetEmail } from './passwordReset';
export { sendSupportNotification, sendReportNotification } from './support';
export {
  sendPaymentSecuredEmail,
  sendWorkStartedEmail,
  sendWorkSubmittedEmail,
  sendWorkApprovedEmail,
  sendRevisionRequestEmail,
  sendEventAcceptedEmail,
  sendCampaignCancelledEmail,
} from './campaignWorkspace';
export {
  sendAccountSuspendedEmail,
  sendAccountReactivatedEmail,
  sendAccountVerifiedEmail,
  sendVerificationRejectedEmail,
  sendAccountDeletedEmail,
} from './accountActions';
