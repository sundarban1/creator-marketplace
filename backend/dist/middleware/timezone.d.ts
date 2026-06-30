import { Request, Response, NextFunction } from 'express';
/**
 * Reads the X-Timezone header sent by the mobile client and attaches
 * req.timezone.  Falls back to 'UTC' if the header is absent or invalid.
 *
 * Usage: any route that needs to display or calculate dates in the user's
 * local timezone can read req.timezone instead of hard-coding UTC.
 */
export declare function timezoneMiddleware(req: Request, _res: Response, next: NextFunction): void;
/**
 * Convert a UTC Date to a human-readable string in the given IANA timezone.
 * Useful for notifications, emails, and logs that mention a time to the user.
 */
export declare function formatInTz(date: Date, timezone: string): string;
/**
 * Return midnight (00:00:00) at the START of "today" in the given timezone,
 * expressed as a UTC Date.  Useful for deadline comparisons like
 * "is this campaign expiring today in Nepal?"
 */
export declare function startOfDayInTz(timezone: string, date?: Date): Date;
//# sourceMappingURL=timezone.d.ts.map