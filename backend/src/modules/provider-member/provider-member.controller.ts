import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { ProviderMemberService } from './provider-member.service';

const memberService = new ProviderMemberService();

export class ProviderMemberController {
  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
      success(res, await memberService.listMembers(req.user!.id, providerId), 'Team members retrieved');
    } catch (err) { next(err); }
  }

  async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.invite(req.user!.id, req.body), 'Invitation sent', 201);
    } catch (err) { next(err); }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.updateMember(req.user!.id, req.params.id, req.body), 'Member updated');
    } catch (err) { next(err); }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await memberService.removeMember(req.user!.id, req.params.id);
      success(res, null, 'Member removed');
    } catch (err) { next(err); }
  }

  async listMyMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.listMyMemberships(req.user!.id), 'Memberships retrieved');
    } catch (err) { next(err); }
  }

  async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applicationId = String(req.query.applicationId ?? '');
      success(res, await memberService.listAssignments(req.user!.id, applicationId), 'Assignments retrieved');
    } catch (err) { next(err); }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { applicationId, memberId, note } = req.body;
      success(res, await memberService.assignMember(req.user!.id, applicationId, memberId, note), 'Member assigned', 201);
    } catch (err) { next(err); }
  }

  async unassign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await memberService.unassignMember(req.user!.id, req.params.id);
      success(res, null, 'Member unassigned');
    } catch (err) { next(err); }
  }

  async listMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.listMyAssignments(req.user!.id), 'Assigned work retrieved');
    } catch (err) { next(err); }
  }

  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      success(res, await memberService.respond(req.user!.id, req.params.id, req.body), 'Response recorded');
    } catch (err) { next(err); }
  }
}
