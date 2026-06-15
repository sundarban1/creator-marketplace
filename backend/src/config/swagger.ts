import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Creator Marketplace API',
      version: '1.0.0',
      description:
        'A marketplace platform connecting creators (influencers) with businesses for campaign collaborations.',
      contact: {
        name: 'API Support',
        email: 'support@creatormarket.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 100 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 10 },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxxxxxxxxxxxxxxxx' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            role: { type: 'string', enum: ['CREATOR', 'BUSINESS', 'ADMIN'] },
            isEmailVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatorProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            fullName: { type: 'string', example: 'Jane Doe' },
            bio: { type: 'string', example: 'Lifestyle creator based in Mumbai' },
            location: { type: 'string', example: 'Mumbai, India' },
            avatarUrl: { type: 'string', format: 'uri' },
            categories: { type: 'array', items: { type: 'string' }, example: ['Lifestyle', 'Fashion'] },
            socialLinks: {
              type: 'object',
              properties: {
                instagram: { type: 'string' },
                tiktok: { type: 'string' },
                youtube: { type: 'string' },
                facebook: { type: 'string' },
              },
            },
            portfolioLinks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
            isVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BusinessProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            businessName: { type: 'string', example: 'Acme Corp' },
            description: { type: 'string', example: 'We make great products' },
            logoUrl: { type: 'string', format: 'uri' },
            website: { type: 'string', format: 'uri', example: 'https://acme.com' },
            categories: { type: 'array', items: { type: 'string' }, example: ['Technology', 'SaaS'] },
            panNo: { type: 'string', example: 'ABCDE1234F' },
            isVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            businessId: { type: 'string' },
            title: { type: 'string', example: 'Summer Fashion Campaign' },
            description: { type: 'string', example: 'Promote our new summer collection' },
            category: { type: 'string', example: 'Fashion' },
            platform: { type: 'string', example: 'Instagram' },
            minFollowers: { type: 'integer', example: 10000 },
            contentType: { type: 'string', example: 'Reel' },
            deliverables: { type: 'string', example: '3 Reels, 5 Stories' },
            deadline: { type: 'string', format: 'date-time' },
            location: { type: 'string', example: 'Mumbai' },
            budgetMin: { type: 'number', example: 10000 },
            budgetMax: { type: 'number', example: 50000 },
            paymentType: { type: 'string', example: 'Fixed' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'CLOSED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            campaignId: { type: 'string' },
            creatorId: { type: 'string' },
            coverLetter: { type: 'string' },
            proposedRate: { type: 'number', example: 25000 },
            timeline: { type: 'string', example: '2 weeks' },
            socialHandles: { type: 'object' },
            portfolioUrl: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            creatorId: { type: 'string' },
            businessId: { type: 'string' },
            campaignId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            conversationId: { type: 'string' },
            senderId: { type: 'string' },
            content: { type: 'string', example: 'Hello! I am interested in your campaign.' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & authorization endpoints' },
      { name: 'Creator', description: 'Creator profile management' },
      { name: 'Business', description: 'Business profile management' },
      { name: 'Campaign', description: 'Campaign management and applications' },
      { name: 'Messaging', description: 'Conversations and messages' },
    ],
  },
  // __dirname is .../src/config in dev (tsx) and .../dist/config when built.
  // swagger-jsdoc globs need to point to whichever copy actually exists.
  apis: __dirname.includes('/dist/')
    ? [path.resolve(__dirname, '../modules/**/*.routes.js'), path.resolve(__dirname, '../app.js')]
    : [path.resolve(__dirname, '../modules/**/*.routes.ts'), path.resolve(__dirname, '../app.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);
