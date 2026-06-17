"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env"); // load and validate env first
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const swagger_1 = require("./config/swagger");
const error_1 = require("./middleware/error");
const prisma_1 = __importDefault(require("./prisma"));
// Route imports
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const creator_routes_1 = __importDefault(require("./modules/creator/creator.routes"));
const business_routes_1 = __importDefault(require("./modules/business/business.routes"));
const campaign_routes_1 = __importDefault(require("./modules/campaign/campaign.routes"));
const messaging_routes_1 = __importDefault(require("./modules/messaging/messaging.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const help_routes_1 = __importDefault(require("./modules/help/help.routes"));
const faq_routes_1 = __importDefault(require("./modules/faq/faq.routes"));
const support_routes_1 = __importDefault(require("./modules/support/support.routes"));
const legal_routes_1 = __importDefault(require("./modules/legal/legal.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const app = (0, express_1.default)();
// ── Security & parsing middleware ────────────────────────────────────────────
app.use((0, helmet_1.default)());
const allowedOrigins = env_1.env.FRONTEND_URL
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some((o) => origin.startsWith(o)))
            return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ── Health check ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Returns server status and database connectivity
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 *                 database:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Service unavailable (database connection failed)
 */
app.get('/health', async (_req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: env_1.env.NODE_ENV,
            database: 'connected',
        });
    }
    catch {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            environment: env_1.env.NODE_ENV,
            database: 'disconnected',
        });
    }
});
// ── Swagger documentation ─────────────────────────────────────────────────────
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Creator Marketplace API Docs',
}));
// Serve raw swagger spec as JSON
app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swagger_1.swaggerSpec);
});
// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_routes_1.default);
app.use('/api/creator', creator_routes_1.default);
app.use('/api/business', business_routes_1.default);
app.use('/api/campaigns', campaign_routes_1.default);
app.use('/api/messaging', messaging_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/help', help_routes_1.default);
app.use('/api/faq', faq_routes_1.default);
app.use('/api/support', support_routes_1.default);
app.use('/api/legal', legal_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use(error_1.notFoundHandler);
app.use(error_1.errorHandler);
// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(env_1.env.PORT, 10);
async function bootstrap() {
    try {
        await prisma_1.default.$connect();
        console.log('✅ Database connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API Docs available at http://localhost:${PORT}/api/docs`);
            console.log(`🌍 Environment: ${env_1.env.NODE_ENV}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        await prisma_1.default.$disconnect();
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏳ Shutting down gracefully...');
    await prisma_1.default.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n⏳ SIGTERM received, shutting down...');
    await prisma_1.default.$disconnect();
    process.exit(0);
});
bootstrap();
exports.default = app;
//# sourceMappingURL=app.js.map