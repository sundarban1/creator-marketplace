interface MailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare function sendEmail(options: MailOptions): Promise<void>;
export declare function sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
export declare function sendOtpEmail(email: string, code: string): Promise<void>;
export declare function sendWelcomeEmail(email: string, name: string): Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map