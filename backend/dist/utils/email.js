"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendOtpEmail = sendOtpEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
function createTransporter() {
    if (env_1.env.SMTP_HOST && env_1.env.SMTP_USER && env_1.env.SMTP_PASS) {
        return nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: parseInt(env_1.env.SMTP_PORT || '587'),
            auth: {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            },
        });
    }
    // Fallback: log emails in development
    return nodemailer_1.default.createTransport({
        streamTransport: true,
        newline: 'unix',
    });
}
async function sendEmail(options) {
    const transporter = createTransporter();
    const mailOptions = {
        from: `"Creator Marketplace" <no-reply@creatormarket.com>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
    };
    if (!env_1.env.SMTP_HOST) {
        // Development: just log the email
        console.log('📧 Email (DEV mode - not actually sent):');
        console.log(`  To: ${options.to}`);
        console.log(`  Subject: ${options.subject}`);
        console.log(`  Body: ${options.html}`);
        return;
    }
    await transporter.sendMail(mailOptions);
}
async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Creator Marketplace account.</p>
        <p>Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, please ignore this email. Your password will remain unchanged.
        </p>
        <p style="color: #666; font-size: 12px;">
          Or copy and paste this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
      </div>
    `,
    });
}
async function sendOtpEmail(email, code) {
    await sendEmail({
        to: email,
        subject: 'Your CreatorMarket Verification Code',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">Verify your account</h2>
        <p style="color: #555; margin-bottom: 24px;">Use the code below to complete your sign-up. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align: center; background: #fff; border: 2px solid #4F46E5; border-radius: 12px; padding: 24px; letter-spacing: 12px; font-size: 36px; font-weight: 800; color: #4F46E5;">
          ${code}
        </div>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    });
}
async function sendWelcomeEmail(email, name) {
    await sendEmail({
        to: email,
        subject: 'Welcome to Creator Marketplace!',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Creator Marketplace, ${name}!</h2>
        <p>We're thrilled to have you on board. Your account has been created successfully.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse campaigns from top brands</li>
          <li>Apply to campaigns that match your niche</li>
          <li>Connect with businesses directly</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${env_1.env.FRONTEND_URL}/dashboard"
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
    });
}
//# sourceMappingURL=email.js.map