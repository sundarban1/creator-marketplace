// Production-safe payment-method seeder — upserts the default payment method
// catalog without touching any other data. Safe to re-run any time (e.g. after
// a fresh deploy, or to backfill payment methods into an existing database
// that predates the PaymentMethod model).
//
// Usage: npx tsx prisma/seed-payment-methods.ts
import { PrismaClient } from '@prisma/client';
import { seedPaymentMethods } from './seeds/payment-methods';

const prisma = new PrismaClient();

seedPaymentMethods(prisma)
  .catch((e) => {
    console.error('❌ Payment method seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
