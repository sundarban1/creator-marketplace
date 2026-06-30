"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timezoneMiddleware = timezoneMiddleware;
exports.formatInTz = formatInTz;
exports.startOfDayInTz = startOfDayInTz;
const SUPPORTED = new Set(Intl.supportedValuesOf('timeZone'));
/**
 * Reads the X-Timezone header sent by the mobile client and attaches
 * req.timezone.  Falls back to 'UTC' if the header is absent or invalid.
 *
 * Usage: any route that needs to display or calculate dates in the user's
 * local timezone can read req.timezone instead of hard-coding UTC.
 */
function timezoneMiddleware(req, _res, next) {
    const raw = req.headers['x-timezone'];
    const tz = Array.isArray(raw) ? raw[0] : raw;
    req.timezone = (tz && SUPPORTED.has(tz)) ? tz : 'UTC';
    next();
}
/**
 * Convert a UTC Date to a human-readable string in the given IANA timezone.
 * Useful for notifications, emails, and logs that mention a time to the user.
 */
function formatInTz(date, timezone) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}
/**
 * Return midnight (00:00:00) at the START of "today" in the given timezone,
 * expressed as a UTC Date.  Useful for deadline comparisons like
 * "is this campaign expiring today in Nepal?"
 */
function startOfDayInTz(timezone, date = new Date()) {
    // Format the current instant as YYYY-MM-DD in the target timezone
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date); // 'en-CA' gives ISO date
    return new Date(`${localDate}T00:00:00`);
}
//# sourceMappingURL=timezone.js.map