import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ProviderMemberController } from './provider-member.controller';
import { inviteMemberSchema, updateMemberSchema, respondToMemberInviteSchema, assignMemberSchema } from './provider-member.schema';

const router = Router();
const ctrl = new ProviderMemberController();

// §4/§7 — a provider's own team roster, and the invitations they've received
// from other teams. Mounted at /api/creator/team.
router.use(authenticate, authorize('CREATOR'));

router.get('/members', ctrl.listMembers.bind(ctrl));
router.post('/members', validate(inviteMemberSchema), ctrl.invite.bind(ctrl));
router.patch('/members/:id', validate(updateMemberSchema), ctrl.updateMember.bind(ctrl));
router.delete('/members/:id', ctrl.removeMember.bind(ctrl));

// §13/§16 — who inside the team is working a booking the team won. Authorized
// exactly like the roster: the provider that won it, or an ADMIN member of it.
router.get('/assignments', ctrl.listAssignments.bind(ctrl));
router.post('/assignments', validate(assignMemberSchema), ctrl.assign.bind(ctrl));
router.delete('/assignments/:id', ctrl.unassign.bind(ctrl));
// The assigned member's own view of work handed to them.
router.get('/my-assignments', ctrl.listMyAssignments.bind(ctrl));

// The invitee's side. Available to every provider type — an INDIVIDUAL is
// exactly who a team invites.
router.get('/memberships', ctrl.listMyMemberships.bind(ctrl));
router.post('/memberships/:id/respond', validate(respondToMemberInviteSchema), ctrl.respond.bind(ctrl));

export default router;
