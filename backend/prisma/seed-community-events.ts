// Seeds the first Community Events record — Kolab Creators Meetup, Itahari
// (2026-10-04). Create-only: if the slug already exists it is left untouched,
// so re-running never overwrites edits made in admin → Community Events.
//
// Text only and left UNPUBLISHED: publishing requires a cover image, which is
// uploaded through the admin (along with the gallery and speaker photo).
//
// Usage: npm run db:seed:community-events
import { PrismaClient } from '@prisma/client';

// Self-contained on purpose: the production image ships only dist/ + prisma/,
// so importing from ../src breaks `npm run db:seed:community-events` there.
// Asia/Kathmandu is a fixed UTC+05:45 with no DST.
const kathmanduToUtc = (date: string, time: string) => new Date(`${date}T${time}:00+05:45`);

const prisma = new PrismaClient();
const TZ = 'Asia/Kathmandu';
const SLUG = 'kolab-creators-meetup-itahari';

async function main() {
  const existing = await prisma.communityEvent.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (existing) {
    console.log(`↷ ${SLUG} already exists — left unchanged`);
    return;
  }

  const order = <T>(rows: T[]) => rows.map((r, i) => ({ ...r, order: i }));

  await prisma.communityEvent.create({
    data: {
      title: 'Kolab Creators Meetup — Itahari',
      slug: SLUG,
      shortDescription: 'Creators. Connections. Opportunities.',
      description:
        "Kolab's first creators meetup brought content creators from Itahari and around together at Aroma By Ocean, Aaitabare.\n\n" +
        'Creators introduced themselves and the work they make, the Kolab team shared how the platform connects creators with ' +
        'businesses and paid opportunities, and the afternoon wrapped up with games, challenges and plenty of time to network.',
      eventType: 'MEETUP',
      startDateTime: kathmanduToUtc('2026-10-04', '13:00'),
      endDateTime: null,
      timezone: TZ,
      venueName: 'Aroma By Ocean',
      address: 'Aaitabare, Itahari',
      city: 'Itahari',
      country: 'Nepal',
      published: false,
      speakers: {
        createMany: {
          data: order([
            {
              name: 'Himal Dhakal',
              role: 'Journalist & Researcher',
              organization: 'Founder — Newslaya & Neplee Job Services',
            },
          ]),
        },
      },
      highlights: {
        createMany: {
          data: order([
            { title: 'Creator Introductions', description: 'Creators introduced themselves and shared what they create.' },
            { title: 'Kolab Introduction', description: 'A look at how Kolab connects creators with opportunities.' },
            { title: 'Speaker Session', description: 'A session with our featured speaker.' },
            { title: 'Games & Challenges', description: 'Fun activities and creator challenges.' },
            { title: 'Networking', description: 'Creators and businesses connected and exchanged ideas.' },
          ]),
        },
      },
    },
  });
  console.log(`✓ Created ${SLUG} (unpublished — add a cover image in admin, then publish)`);
}

main()
  .catch((e) => {
    console.error('❌ Community event seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
