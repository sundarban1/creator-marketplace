import { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
export interface TokenPayload {
    id: string;
    email: string;
    role: Role;
}
export declare function signAccessToken(payload: TokenPayload): string;
export declare function signRefreshToken(payload: TokenPayload): string;
export declare function verifyAccessToken(token: string): TokenPayload & JwtPayload;
export declare function verifyRefreshToken(token: string): TokenPayload & JwtPayload;
export declare function signPasswordResetToken(payload: {
    id: string;
    email: string;
}): string;
export declare function verifyPasswordResetToken(token: string): {
    id: string;
    email: string;
} & JwtPayload;
//# sourceMappingURL=jwt.d.ts.map