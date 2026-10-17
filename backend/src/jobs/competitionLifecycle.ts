import cron from 'node-cron';
import { logger } from '../config/logger';
import { withJobLock } from '../utils/jobLock';
import { competitionService } from '../modules/competition/competition.service';

// Competition time-driven transitions: scheduled publish, stage open/close and
// 24h reminders. Idempotent by construction — see
// CompetitionService.runLifecycleSweep for why a stale run can't undo a
// deadline extension or a reopened stage.
export function startCompetitionLifecycleJob() {
  cron.schedule('1-59/5 * * * *', () => {
    void withJobLock('competition-lifecycle', 240, async () => {
      const stats = await competitionService.runLifecycleSweep(new Date());
      if (stats.published || stats.opened || stats.closed || stats.reminded) logger.info(stats, 'Competition lifecycle sweep');
    }).catch((err) => logger.error({ err }, 'Competition lifecycle job failed'));
  });
}
