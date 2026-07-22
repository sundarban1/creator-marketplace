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
        email: 'support@kolab.com.np',
      },
    },
    servers: [
      env.NODE_ENV === 'production'
        // Relative URL — Swagger UI resolves this against whatever host is serving
        // the docs page, so it works on the Render URL (or any custom domain) without
        // needing to hardcode it here.
        ? { url: '/', description: 'Current server' }
        : { url: `http://localhost:${env.PORT}`, description: 'Development server' },
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
            phone: { type: 'string', nullable: true, example: '+9779812345678' },
            role: { type: 'string', enum: ['CREATOR', 'BUSINESS', 'ADMIN'] },
            name: { type: 'string', example: 'Jane Doe' },
            avatar: { type: 'string', format: 'uri', nullable: true },
            isEmailVerified: { type: 'boolean', example: false },
            isPhoneVerified: { type: 'boolean', example: false },
            isOnboarded: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            creatorProfile: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                username: { type: 'string', nullable: true },
                fullName: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', format: 'uri', nullable: true },
              },
            },
            businessProfile: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                businessName: { type: 'string', nullable: true },
                logoUrl: { type: 'string', format: 'uri', nullable: true },
              },
            },
          },
        },
        CreatorProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string', nullable: true },
            fullName: { type: 'string', nullable: true, example: 'Jane Doe' },
            bio: { type: 'string', nullable: true, example: 'Lifestyle creator based in Mumbai' },
            location: { type: 'string', nullable: true, example: 'Mumbai, India' },
            locationLat: { type: 'number', nullable: true },
            locationLng: { type: 'number', nullable: true },
            nearbyRadiusKm: { type: 'integer', example: 25 },
            nearbyUseHomeLocation: { type: 'boolean', example: false },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            categories: { type: 'array', items: { type: 'string' }, example: ['Lifestyle', 'Fashion'] },
            socialLinks: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: { instagram: 'https://instagram.com/jane', youtube: 'https://youtube.com/@jane' },
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
            paymentMethods: { type: 'array', items: { type: 'string' }, example: ['Bank Transfer', 'eSewa'] },
            prefPlatforms: { type: 'array', items: { type: 'string' }, example: ['Instagram', 'TikTok'] },
            prefLocations: { type: 'array', items: { type: 'string' } },
            prefBudgetMin: { type: 'number', nullable: true },
            prefBudgetMax: { type: 'number', nullable: true },
            citizenshipDocUrl: { type: 'string', format: 'uri', nullable: true },
            citizenshipStatus: { type: 'string', enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'] },
            panDocUrl: { type: 'string', format: 'uri', nullable: true },
            panDocStatus: { type: 'string', enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                isEmailVerified: { type: 'boolean' },
                isOnboarded: { type: 'boolean' },
              },
            },
            socialAccounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  creatorProfileId: { type: 'string' },
                  platform: { type: 'string', example: 'Instagram' },
                  profileUrl: { type: 'string', format: 'uri' },
                  followers: { type: 'integer', example: 15000 },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        BusinessProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            businessName: { type: 'string', nullable: true, example: 'Acme Corp' },
            description: { type: 'string', nullable: true, example: 'We make great products' },
            logoUrl: { type: 'string', format: 'uri', nullable: true },
            website: { type: 'string', format: 'uri', nullable: true, example: 'https://acme.com' },
            categories: { type: 'array', items: { type: 'string' }, example: ['Technology', 'SaaS'] },
            panNo: { type: 'string', nullable: true, example: 'ABCDE1234F' },
            location: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true, example: '+9779812345678' },
            isVerified: { type: 'boolean', example: false },
            showPublicProfile: { type: 'boolean', example: true },
            hideContactDetails: { type: 'boolean', example: false },
            allowDirectMessages: { type: 'boolean', example: true },
            socialLinks: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: { facebook: 'https://facebook.com/acme' },
            },
            presenceServices: { type: 'array', items: { type: 'string' } },
            paymentMethods: { type: 'array', items: { type: 'string' } },
            defaultPlatforms: { type: 'array', items: { type: 'string' } },
            defaultCreatorCategories: { type: 'array', items: { type: 'string' } },
            defaultBudgetRange: { type: 'string', nullable: true },
            panDocUrl: { type: 'string', format: 'uri', nullable: true },
            panDocStatus: { type: 'string', enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'] },
            companyRegDocUrl: { type: 'string', format: 'uri', nullable: true },
            companyRegDocStatus: { type: 'string', enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                isEmailVerified: { type: 'boolean' },
              },
            },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            businessId: { type: 'string' },
            title: { type: 'string', example: 'Summer Fashion Campaign' },
            description: { type: 'string', example: 'Promote our new summer collection' },
            template: { type: 'string', nullable: true },
            category: { type: 'string', example: 'Fashion' },
            goals: { type: 'array', items: { type: 'string' } },
            platforms: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3, example: ['Instagram', 'TikTok'] },
            minFollowers: { type: 'integer', example: 10000 },
            contentType: { type: 'string', example: 'Reel' },
            deliverables: { type: 'string', example: '3 Reels, 5 Stories' },
            paymentType: { type: 'string', example: 'Fixed' },
            deadline: { type: 'string', format: 'date-time' },
            eventDate: { type: 'string', format: 'date-time', nullable: true },
            location: { type: 'string', nullable: true, example: 'Mumbai' },
            locationLat: { type: 'number', nullable: true },
            locationLng: { type: 'number', nullable: true },
            distanceKm: { type: 'number', description: 'Only present on /api/campaigns/nearby responses', example: 3.2 },
            budgetMin: { type: 'number', example: 10000 },
            budgetMax: { type: 'number', example: 50000 },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED'] },
            isFeatured: { type: 'boolean', example: false },
            creatorsNeeded: { type: 'integer', example: 1 },
            campaignType: { type: 'string', enum: ['PAID_CAMPAIGN', 'OPEN_EVENT'] },
            capacity: { type: 'integer', nullable: true },
            venue: { type: 'string', nullable: true },
            benefits: { type: 'array', items: { type: 'string' } },
            eventStatus: { type: 'string', enum: ['OPEN', 'FULL', 'CLOSED'] },
            paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID', 'RELEASED', 'REFUNDED'] },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            paymentMethod: { type: 'string', nullable: true },
            objective: { type: 'string', nullable: true },
            contentGuidelines: { type: 'array', items: { type: 'string' } },
            targetAudience: { type: 'array', items: { type: 'string' } },
            hashtags: { type: 'array', items: { type: 'string' } },
            sampleCaption: { type: 'string', nullable: true },
            approvalRequirements: { type: 'string', nullable: true },
            aiGenerated: { type: 'boolean', example: false },
            aiPrompt: { type: 'string', nullable: true },
            aiSuggestedCategories: { type: 'array', items: { type: 'string' } },
            aiSuggestedPlatforms: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            business: {
              type: 'object',
              properties: {
                businessName: { type: 'string', nullable: true },
                logoUrl: { type: 'string', format: 'uri', nullable: true },
                website: { type: 'string', format: 'uri', nullable: true },
                description: { type: 'string', nullable: true },
              },
            },
            _count: {
              type: 'object',
              properties: { applications: { type: 'integer', example: 5 } },
            },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            campaignId: { type: 'string' },
            coverLetter: { type: 'string' },
            proposedRate: { type: 'number', example: 25000 },
            timeline: { type: 'string', example: '2 weeks' },
            socialHandles: { type: 'object', additionalProperties: { type: 'string' } },
            portfolioUrl: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
            workStatus: { type: 'string', enum: ['NONE', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'] },
            workNote: { type: 'string', nullable: true },
            submittedAt: { type: 'string', format: 'date-time', nullable: true },
            deliverableUrls: { type: 'string', nullable: true },
            paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID', 'RELEASED', 'REFUNDED'] },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            campaign: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                category: { type: 'string' },
                platforms: { type: 'array', items: { type: 'string' } },
                budgetMin: { type: 'number' },
                budgetMax: { type: 'number' },
                deadline: { type: 'string', format: 'date-time' },
                status: { type: 'string' },
                campaignType: { type: 'string' },
                paymentStatus: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time', nullable: true },
                business: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    businessName: { type: 'string', nullable: true },
                    logoUrl: { type: 'string', format: 'uri', nullable: true },
                  },
                },
              },
            },
            creator: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                fullName: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', format: 'uri', nullable: true },
                location: { type: 'string', nullable: true },
                categories: { type: 'array', items: { type: 'string' } },
                socialLinks: { type: 'object' },
              },
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            creatorId: { type: 'string' },
            businessId: { type: 'string' },
            campaignId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED'] },
            requestMessage: { type: 'string', nullable: true },
            lastMessageAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            unreadCount: { type: 'integer', example: 0 },
            creator: {
              type: 'object',
              nullable: true,
              properties: {
                fullName: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', format: 'uri', nullable: true },
                userId: { type: 'string' },
              },
            },
            business: {
              type: 'object',
              nullable: true,
              properties: {
                businessName: { type: 'string', nullable: true },
                logoUrl: { type: 'string', format: 'uri', nullable: true },
                userId: { type: 'string' },
              },
            },
            campaign: {
              type: 'object',
              nullable: true,
              properties: { title: { type: 'string' } },
            },
            messages: {
              type: 'array',
              items: { $ref: '#/components/schemas/Message' },
            },
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
            sender: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
              },
            },
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
