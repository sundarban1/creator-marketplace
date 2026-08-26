import { PrismaClient } from '@prisma/client';

// Brand colors match what mobile has hardcoded per-method today (see
// mobile/src/app/(creator)/settings.tsx PAYMENT_METHODS) — PaymentMethod is meant
// to be admin-owned going forward. These three ship with no iconUrl because
// mobile already bundles their logos locally (utilities/paymentMethods.ts) and
// renders those instead of a remote image for these specific keys.
const PAYMENT_METHODS: { key: string; name: string; color: string; order: number }[] = [
  { key: 'esewa',   name: 'eSewa',   color: '#60BB46', order: 0 },
  { key: 'khalti',  name: 'Khalti',  color: '#5C2D91', order: 1 },
  { key: 'fonepay', name: 'Fonepay', color: '#003087', order: 2 },
];

export async function seedPaymentMethods(prisma: PrismaClient) {
  await Promise.all(
    PAYMENT_METHODS.map((m) =>
      prisma.paymentMethod.upsert({
        where:  { key: m.key },
        update: { name: m.name, color: m.color, order: m.order },
        create: m,
      })
    )
  );
  console.log(`  ✅ Payment methods: ${PAYMENT_METHODS.length} seeded`);
}
