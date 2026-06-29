import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      /** IANA timezone string sent by the client via X-Timezone header. Defaults to 'UTC'. */
      timezone: string;
      /** Language code sent by the client via X-Language header. Defaults to 'en'. */
      language: string;
    }
  }
}

export {};
