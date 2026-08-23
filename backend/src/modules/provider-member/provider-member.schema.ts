import { z } from 'zod';
import { isValidNepaliPhone, toE164NepaliPhone } from '../../utils/phone';

// Same identifier handling as auth.schema.ts — a Nepali phone is canonicalized
// to E.164 before it's ever used for a lookup, so an invite by "98XXXXXXXX"
// finds the account that registered as "+97798XXXXXXXX".
const phoneField = z
  .string()
  .refine(isValidNepaliPhone, 'Enter a valid Nepali mobile number (starts with 97 or 98, 10 digits)')
  .transform(toE164NepaliPhone);

// §4 step 3 — what the member does on a booking (Photographer, Editor, DJ...).
// Free text rather than an enum: the spec's list ends in "Other", and a
// wedding crew's roles aren't the same as a production house's.
const jobRoleField = z.string().trim().min(1).max(60);

// §7 — what the member can do inside Kolab. OWNER is deliberately not
// assignable: the provider account itself is the owner, so handing the role to
// an invitee would create a second one.
const accessRoleField = z.enum(['ADMIN', 'MANAGER', 'MEMBER']);

export const inviteMemberSchema = z
  .object({
    // §7 — omit to manage your own team; pass a provider id to act as an ADMIN
    // member of someone else's team. See resolveManagedProviderId.
    providerId: z.string().optional(),
    email:      z.string().email('Invalid email address').optional(),
    phone:      phoneField.optional(),
    jobRole:    jobRoleField.optional(),
    accessRole: accessRoleField.optional(),
  })
  .refine((d) => Boolean(d.email) !== Boolean(d.phone), {
    message: 'Provide either an email or a phone number, not both',
    path: ['email'],
  });

export const updateMemberSchema = z.object({
  jobRole:    jobRoleField.nullable().optional(),
  accessRole: accessRoleField.optional(),
});

// §13 — staffing a booking the team won.
export const assignMemberSchema = z.object({
  applicationId: z.string().min(1),
  memberId:      z.string().min(1),
  note:          z.string().trim().max(200).optional(),
});

export const respondToMemberInviteSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export type InviteMemberInput           = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput           = z.infer<typeof updateMemberSchema>;
export type RespondToMemberInviteInput  = z.infer<typeof respondToMemberInviteSchema>;
export type AssignMemberInput           = z.infer<typeof assignMemberSchema>;
