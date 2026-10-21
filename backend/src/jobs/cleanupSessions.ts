import cron from 'node-cron';
import { logger } from '../config/logger';
import { AuthRepository } from '../modules/auth/auth.repository';

const authRepo = new AuthRepository();

export function startSessionCleanupJob() {
  // Daily at 03:30 — drop login sessions whose refresh token has expired
  // (devices unused for the whole sliding window). Purely housekeeping: an
  // expired token is already rejected by refresh() whether or not its row exists.
  cron.schedule('30 3 * * *', () => {
    authRepo.deleteExpiredSessions()
      .then((count) => {
        if (count > 0) logger.info({ count }, 'Deleted expired login sessions');
      })
      .catch((err) => logger.error({ err }, 'Session cleanup job failed'));
  });
}
