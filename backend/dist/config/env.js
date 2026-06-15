"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Load .env from the project root (works regardless of cwd)
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../../.env') });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3000'),
    DATABASE_URL: zod_1.z.string({
        required_error: 'DATABASE_URL is required',
    }),
    JWT_ACCESS_SECRET: zod_1.z.string({
        required_error: 'JWT_ACCESS_SECRET is required',
    }),
    JWT_REFRESH_SECRET: zod_1.z.string({
        required_error: 'JWT_REFRESH_SECRET is required',
    }),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map