import type { CreatorMeetup, CreatorMeetupRegistration } from '@prisma/client';

export function toMeetupDto(row: CreatorMeetup) {
  return {
    id:                   row.id,
    title:                row.title,
    slug:                 row.slug,
    city:                 row.city,
    district:             row.district,
    province:             row.province,
    country:              row.country,
    description:          row.description,
    registrationStatus:   row.registrationStatus,
    registrationStartsAt: row.registrationStartsAt,
    registrationEndsAt:   row.registrationEndsAt,
    eventDate:            row.eventDate,
    eventStartTime:       row.eventStartTime,
    eventEndTime:         row.eventEndTime,
    venueName:            row.venueName,
    venueAddress:         row.venueAddress,
    capacity:             row.capacity,
    status:               row.status,
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
  };
}

type RegistrationCounts = { total: number; pending: number; accepted: number; rejected: number; checkedIn: number };

/** Admin-only shape — adds registration stats never sent to a creator. */
export function toMeetupAdminDto(row: CreatorMeetup, stats: RegistrationCounts) {
  return { ...toMeetupDto(row), stats };
}

export function toRegistrationDto(row: CreatorMeetupRegistration) {
  return {
    id:                    row.id,
    meetupId:              row.meetupId,
    creatorId:             row.creatorId,
    fullName:              row.fullName,
    phoneNumber:           row.phoneNumber,
    email:                 row.email,
    creatorTypes:          row.creatorTypes,
    otherCreatorType:      row.otherCreatorType,
    socialMediaProfile:    row.socialMediaProfile,
    attendancePreference:  row.attendancePreference,
    message:               row.message,
    status:                row.status,
    acceptedAt:            row.acceptedAt,
    rejectedAt:            row.rejectedAt,
    invitationSentAt:      row.invitationSentAt,
    checkedInAt:           row.checkedInAt,
    createdAt:             row.createdAt,
    updatedAt:             row.updatedAt,
  };
}

/** A creator's own registration paired with the meetup it belongs to (spec §15). */
export function toMyRegistrationDto(row: CreatorMeetupRegistration & { meetup: CreatorMeetup }) {
  return {
    ...toRegistrationDto(row),
    meetup: toMeetupDto(row.meetup),
  };
}
