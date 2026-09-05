import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { ProviderMemberService } from './provider-member.service';
import { getDict } from '../../i18n';

const memberService = new ProviderMemberService();

export class ProviderMemberController {
  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
      success(res, await memberService.listMembers(req.user!.id, providerId), getDict().providerMember.teamMembersRetrieved);
    } catch (err) { next(err); }
  }

  async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.invite(req.user!.id, req.body), getDict().providerMember.invitationSent, 201);
    } catch (err) { next(err); }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.updateMember(req.user!.id, req.params.id, req.body), getDict().providerMember.memberUpdated);
    } catch (err) { next(err); }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await memberService.removeMember(req.user!.id, req.params.id);
      success(res, null, getDict().providerMember.memberRemoved);
    } catch (err) { next(err); }
  }

  async listMyMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.listMyMemberships(req.user!.id), getDict().providerMember.membershipsRetrieved);
    } catch (err) { next(err); }
  }

  async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applicationId = String(req.query.applicationId ?? '');
      success(res, await memberService.listAssignments(req.user!.id, applicationId), getDict().providerMember.assignmentsRetrieved);
    } catch (err) { next(err); }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { applicationId, memberId, note } = req.body;
      success(res, await memberService.assignMember(req.user!.id, applicationId, memberId, note), getDict().providerMember.memberAssigned, 201);
    } catch (err) { next(err); }
  }

  async unassign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await memberService.unassignMember(req.user!.id, req.params.id);
      success(res, null, getDict().providerMember.memberUnassigned);
    } catch (err) { next(err); }
  }

  async listMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.listMyAssignments(req.user!.id), getDict().providerMember.assignedWorkRetrieved);
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.respond(req.user!.id, req.params.id, req.body), getDict().providerMember.responseRecorded);
    } catch (err) { next(err); }
  }
}
