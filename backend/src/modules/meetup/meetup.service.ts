import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { logger } from '../../config/logger';
import { HttpStatus } from '../../constants/httpStatus';
import { generateUniqueSlug } from '../../utils/slug';
import { sendMeetupInvitationEmail, sendMeetupRegistrationConfirmationEmail } from '../../utils/email/meetup';
import { MeetupRepository } from './meetup.repository';
import {
  toMeetupDto,
  toMeetupAdminDto,
  toRegistrationDto,
  toMyRegistrationDto,
} from './meetup.dto';
import type { CreateMeetupInput, UpdateMeetupInput, RegisterForMeetupInput, ListRegistrationsQuery } from './meetup.schema';

export class MeetupService {
  private repo: MeetupRepository;

  constructor() {
    this.repo = new MeetupRepository();
  }

  private async resolveCreatorId(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().meetup.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  private async getMeetupOrThrow(idOrSlug: string) {
    const meetup = await this.repo.findBySlugOrId(idOrSlug);
    if (!meetup) throw new AppError(getDict().meetup.meetupNotFound, HttpStatus.NOT_FOUND);
    return meetup;
  }

  // ---- Creator-facing ----

  async listVisibleForCreator() {
    const meetups = await this.repo.findVisibleOpenForCreator();
    return meetups.map(toMeetupDto);
  }

  async getForCreator(idOrSlug: string) {
    const meetup = await this.getMeetupOrThrow(idOrSlug);
    return toMeetupDto(meetup);
  }

  async listMyRegistrations(userId: string) {
    const creator = await this.resolveCreatorId(userId);
    const rows = await this.repo.findMyRegistrations(creator.id);
    return rows.map(toMyRegistrationDto);
  }

  async register(userId: string, meetupId: string, input: RegisterForMeetupInput) {
    const creator = await this.resolveCreatorId(userId);
    const meetup = await this.getMeetupOrThrow(meetupId);

    if (meetup.registrationStatus !== 'OPEN') {
      throw new AppError(getDict().meetup.registrationNotOpen, HttpStatus.FORBIDDEN);
    }

    const existing = await this.repo.findRegistration(meetup.id, creator.id);
    if (existing) throw new AppError(getDict().meetup.alreadyRegistered, HttpStatus.CONFLICT);

    const row = await this.repo.createRegistration({
      meetup:  { connect: { id: meetup.id } },
      creator: { connect: { id: creator.id } },
      ...input,
    });

    // Confirmation email is a courtesy on top of the registration itself — a
    // failed send shouldn't fail the registration, just get logged (mirrors
    // the invitation email's handling in `accept` below).
    const recipientEmail = input.email ?? creator.user.email;
    try {
      await sendMeetupRegistrationConfirmationEmail(recipientEmail, input.fullName, meetup);
    } catch (err) {
      logger.error({ err, registrationId: row.id }, 'Failed to send meetup registration confirmation email');
    }

    return toRegistrationDto(row);
  }

  // ---- Admin-facing ----

  async listForAdmin() {
    const meetups = await this.repo.listAllForAdmin();
    return Promise.all(
      meetups.map(async (meetup) => toMeetupAdminDto(meetup, await this.repo.countRegistrationsByStatus(meetup.id))),
    );
  }

  async getForAdmin(id: string) {
    const meetup = await this.getMeetupOrThrow(id);
    const stats = await this.repo.countRegistrationsByStatus(meetup.id);
    return toMeetupAdminDto(meetup, stats);
  }

  async create(input: CreateMeetupInput) {
    const slug = await generateUniqueSlug(input.title, (candidate) => this.repo.isSlugTaken(candidate));
    const row = await this.repo.create({ ...input, slug });
    return toMeetupDto(row);
  }

  async update(id: string, input: UpdateMeetupInput) {
    await this.getMeetupOrThrow(id);
    const row = await this.repo.update(id, input);
    return toMeetupDto(row);
  }

  async listRegistrationsForAdmin(meetupId: string, query: ListRegistrationsQuery) {
    await this.getMeetupOrThrow(meetupId);
    const rows = await this.repo.listRegistrations(meetupId, query);
    return rows.map(toRegistrationDto);
  }

  private async getRegistrationOrThrow(meetupId: string, registrationId: string) {
    const registration = await this.repo.findRegistrationById(meetupId, registrationId);
    if (!registration) throw new AppError(getDict().meetup.registrationNotFound, HttpStatus.NOT_FOUND);
    return registration;
  }

  async accept(meetupId: string, registrationId: string, adminUserId: string) {
    const meetup = await this.getMeetupOrThrow(meetupId);
    const registration = await this.getRegistrationOrThrow(meetupId, registrationId);
    if (registration.status !== 'PENDING') {
      throw new AppError(getDict().meetup.registrationAlreadyDecided, HttpStatus.CONFLICT);
    }

    const updated = await this.repo.updateRegistration(registration.id, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      acceptedBy: adminUserId,
    });

    // Invitation email is a courtesy on top of the accept decision — a failed
    // send shouldn't roll back or fail the accept itself, just get logged.
    const recipientEmail = registration.email ?? registration.creator.user.email;
    let emailFields: { invitationSentAt?: Date; invitationEmailStatus: string };
    try {
      await sendMeetupInvitationEmail(recipientEmail, registration.fullName, meetup);
      emailFields = { invitationSentAt: new Date(), invitationEmailStatus: 'SENT' };
    } catch (err) {
      logger.error({ err, registrationId: registration.id }, 'Failed to send meetup invitation email');
      emailFields = { invitationEmailStatus: 'FAILED' };
    }
    const final = await this.repo.updateRegistration(registration.id, emailFields);

    return toRegistrationDto({ ...updated, ...final });
  }

  async reject(meetupId: string, registrationId: string, adminUserId: string) {
    await this.getMeetupOrThrow(meetupId);
    const registration = await this.getRegistrationOrThrow(meetupId, registrationId);
    if (registration.status !== 'PENDING') {
      throw new AppError(getDict().meetup.registrationAlreadyDecided, HttpStatus.CONFLICT);
    }

    const updated = await this.repo.updateRegistration(registration.id, {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedBy: adminUserId,
    });
    return toRegistrationDto(updated);
  }

  /** Manual door check-in on event day — no QR/camera scanning, see schema.prisma comment. */
  async checkIn(meetupId: string, registrationId: string, adminUserId: string) {
    await this.getMeetupOrThrow(meetupId);
    const registration = await this.getRegistrationOrThrow(meetupId, registrationId);
    if (registration.status !== 'ACCEPTED') {
      throw new AppError(getDict().meetup.mustBeAcceptedToCheckIn, HttpStatus.FORBIDDEN);
    }
    if (registration.checkedInAt) {
      throw new AppError(getDict().meetup.alreadyCheckedIn, HttpStatus.CONFLICT);
    }

    const updated = await this.repo.updateRegistration(registration.id, {
      checkedInAt: new Date(),
      checkedInBy: adminUserId,
    });
    return toRegistrationDto(updated);
  }

  /** Undoes an accidental check-in tap. */
  async undoCheckIn(meetupId: string, registrationId: string) {
    await this.getMeetupOrThrow(meetupId);
    const registration = await this.getRegistrationOrThrow(meetupId, registrationId);
    if (!registration.checkedInAt) {
      throw new AppError(getDict().meetup.notCheckedIn, HttpStatus.CONFLICT);
    }

    const updated = await this.repo.updateRegistration(registration.id, {
      checkedInAt: null,
      checkedInBy: null,
    });
    return toRegistrationDto(updated);
  }
}
