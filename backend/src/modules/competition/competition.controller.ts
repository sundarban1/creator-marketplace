import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { competitionService as svc } from './competition.service';
import type { ParticipantsQuery, DiscoverQuery, AdminListQuery } from './competition.schema';

type Handler = (req: Request) => Promise<unknown>;

// Every endpoint is "call the service, wrap in the standard envelope" — one
// adapter instead of forty identical try/catch blocks.
function h(fn: Handler, message = 'OK', status?: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      success(res, await fn(req), message, status);
    } catch (err) {
      next(err);
    }
  };
}

const uid = (req: Request) => req.user!.id;
const viewer = (req: Request) => (req.user ? { id: req.user.id, role: req.user.role } : undefined);

export const CompetitionController = {
  // ── Creator / public ──
  discover:        h((req) => svc.discover(req.query as unknown as DiscoverQuery, viewer(req)), 'Competitions retrieved'),
  getPublic:       h((req) => svc.getPublic(req.params.idOrSlug, viewer(req)), 'Competition retrieved'),
  listJoined:      h((req) => svc.listJoined(uid(req)), 'Competitions retrieved'),
  join:            h((req) => svc.join(uid(req), req.params.id), 'Joined competition', 201),
  myProgress:      h((req) => svc.myProgress(uid(req), req.params.id), 'Progress retrieved'),
  submitLink:      h((req) => svc.submitLink(uid(req), req.params.id, req.params.stageId, req.body), 'Submission saved', 201),
  videoSignature:  h((req) => svc.requestVideoUpload(uid(req), req.params.id, req.params.stageId, req.body.sizeBytes, req.body.mimeType), 'Upload ready'),
  videoComplete:   h((req) => svc.completeVideoUpload(uid(req), req.params.id, req.params.stageId, req.body), 'Submission saved', 201),

  // ── Organizer ──
  listMine:        h((req) => svc.listForOrganizer(uid(req)), 'Competitions retrieved'),
  create:          h((req) => svc.create(uid(req), req.body), 'Competition created', 201),
  getManaged:      h((req) => svc.getForOrganizer(uid(req), req.params.id), 'Competition retrieved'),
  update:          h((req) => svc.update(uid(req), req.params.id, req.body), 'Competition updated'),
  remove:          h((req) => svc.deleteDraft(uid(req), req.params.id), 'Draft deleted'),
  submitForReview: h((req) => svc.submitForReview(uid(req), req.params.id, req.body.publishAt), 'Submitted for review'),
  withdraw:        h((req) => svc.withdraw(uid(req), req.params.id), 'Moved back to draft'),
  discardChanges:  h((req) => svc.discardPendingChanges(uid(req), req.params.id), 'Proposed changes discarded'),
  pause:           h((req) => svc.pause(uid(req), req.params.id, req.body.reason), 'Competition paused'),
  resume:          h((req) => svc.resume(uid(req), req.params.id), 'Competition resumed'),
  cancel:          h((req) => svc.cancel(uid(req), req.params.id, req.body.reason), 'Competition cancelled'),
  close:           h((req) => svc.closeCompetition(uid(req), req.params.id, req.body.reason), 'Competition closed'),
  closeRegistration:  h((req) => svc.closeRegistration(uid(req), req.params.id), 'Registration closed'),
  extendRegistration: h((req) => svc.extendRegistration(uid(req), req.params.id, req.body.registrationDeadline), 'Registration deadline updated'),
  openStage:       h((req) => svc.openStage(uid(req), req.params.id, req.params.stageId), 'Stage opened'),
  closeStage:      h((req) => svc.closeStage(uid(req), req.params.id, req.params.stageId), 'Stage submissions closed'),
  extendStage:     h((req) => svc.extendStageDeadline(uid(req), req.params.id, req.params.stageId, req.body.deadline), 'Deadline extended'),
  reopenStage:     h((req) => svc.reopenStage(uid(req), req.params.id, req.params.stageId, req.body.deadline), 'Stage reopened'),
  participants:    h((req) => svc.listParticipants(uid(req), req.params.id, req.query as unknown as ParticipantsQuery), 'Participants retrieved'),
  submission:      h((req) => svc.getSubmission(uid(req), req.params.id, req.params.stageId, req.params.participantId), 'Submission retrieved'),
  decisionSummary: h((req) => svc.getDecisionSummary(uid(req), req.params.id, req.params.stageId), 'Summary retrieved'),
  saveDecisions:   h((req) => svc.saveDecisions(uid(req), req.params.id, req.params.stageId, req.body), 'Draft saved'),
  publishDecisions: h((req) => svc.publishDecisions(uid(req), req.params.id, req.params.stageId, req.body.expectedAdvanceCount), 'Stage results published'),
  saveAwards:      h((req) => svc.saveAwards(uid(req), req.params.id, req.body), 'Draft results saved'),
  publishResults:  h((req) => svc.publishResults(uid(req), req.params.id, req.body.expectedAwardCount), 'Final results published'),
  reopenResults:   h((req) => svc.reopenResults(uid(req), req.params.id, req.body.reason), 'Results reopened'),
  activity:        h((req) => svc.activity(uid(req), req.params.id, Number(req.query.page) || 1), 'Activity retrieved'),

  // ── Kolab admin ──
  adminList:       h((req) => svc.adminList(req.query as unknown as AdminListQuery), 'Competitions retrieved'),
  adminGet:        h((req) => svc.adminGet(req.params.id, req.user?.email), 'Competition retrieved'),
  adminApprove:    h((req) => svc.approve(uid(req), req.params.id), 'Competition approved'),
  adminRequestChanges: h((req) => svc.requestChanges(uid(req), req.params.id, req.body.feedback), 'Changes requested'),
  adminReject:     h((req) => svc.reject(uid(req), req.params.id, req.body.feedback, req.body.allowResubmission), 'Competition rejected'),
  adminApproveEdit: h((req) => svc.approveChanges(uid(req), req.params.id), 'Changes approved'),
  adminRejectEdit: h((req) => svc.rejectChanges(uid(req), req.params.id, req.body.feedback), 'Changes rejected'),
  adminFlag:       h((req) => svc.setModerationFlag(uid(req), req.user!.email, req.params.id, req.body.flag, req.body.note), 'Moderation flag updated'),
  adminSuspend:    h((req) => svc.suspend(uid(req), req.user!.email, req.params.id, req.body.reason), 'Competition suspended'),
  adminUnsuspend:  h((req) => svc.unsuspend(uid(req), req.user!.email, req.params.id, req.body.reason), 'Competition reinstated'),
  adminEvidence:   h((req) => svc.moderationSubmissions(uid(req), req.user!.email, req.params.id, req.params.stageId, req.body.reason), 'Submissions retrieved'),
};
